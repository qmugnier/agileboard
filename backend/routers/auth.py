"""Authentication routes"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, User, TeamMember
from schemas import SignupRequest, LoginRequest, TokenResponse, User as UserSchema, AuthConfig
from auth_utils import hash_password, verify_password, validate_password, create_access_token, verify_token, get_password_rules
from config import config

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Dependency to extract current user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    return user


@router.get("/config", response_model=AuthConfig)
def get_auth_config():
    """Get authentication configuration (signup enabled, OCDC, password rules)"""
    return config.get_auth_config()


@router.get("/password-rules")
def get_password_validation_rules():
    """Get password validation rules for frontend display"""
    return get_password_rules(config.get_password_config())


@router.post("/signup", response_model=TokenResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Sign up a new user"""
    
    # Check if signup is enabled
    if not config.SIGNUP_ENABLED:
        raise HTTPException(status_code=403, detail="Sign up is disabled")
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    is_valid, error_msg = validate_password(request.password, config.get_password_config())
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Create new user
    hashed_password = hash_password(request.password)
    db_user = User(
        email=request.email,
        password_hash=hashed_password,
        is_active=1,
        stay_connected=1 if request.stay_connected else 0
    )
    
    # Auto-create team member if configured
    if config.AUTO_CREATE_TEAM_MEMBER:
        # Extract name from email (part before @)
        team_member_name = request.email.split('@')[0]
        
        # Check if name already exists
        existing_member = db.query(TeamMember).filter(TeamMember.name == team_member_name).first()
        if not existing_member:
            db_team_member = TeamMember(name=team_member_name, role="Developer")
            db.add(db_team_member)
            db.flush()  # Get the ID
            db_user.team_member_id = db_team_member.id
        else:
            db_user.team_member_id = existing_member.id
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Generate token
    access_token = create_access_token({"sub": str(db_user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user_id=db_user.id,
        email=db_user.email,
        team_member_id=db_user.team_member_id,
        stay_connected=request.stay_connected
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Log in a user"""
    
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if password has been set
    if not user.password_hash:
        raise HTTPException(status_code=401, detail="Password not set. Please contact administrator to set your password.")
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    # Update stay_connected setting if requested
    if request.stay_connected != (user.stay_connected == 1):
        user.stay_connected = 1 if request.stay_connected else 0
        db.commit()
    
    # Generate token
    access_token = create_access_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        team_member_id=user.team_member_id,
        stay_connected=request.stay_connected
    )


@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current logged-in user information"""
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Log out the current user"""
    return {"message": "Logged out successfully"}


# ============ OPENID CONNECT (OCDC) ============

@router.get("/ocdc/login-url")
def get_ocdc_login_url():
    """Get the OCDC login URL for the frontend"""
    if not config.OCDC_ENABLED:
        raise HTTPException(status_code=403, detail="OCDC is not enabled")
    
    client_id = config.OCDC_CLIENT_ID
    redirect_uri = config.OCDC_REDIRECT_URI
    discovery_url = config.OCDC_DISCOVERY_URL
    
    if not all([client_id, redirect_uri, discovery_url]):
        raise HTTPException(status_code=500, detail="OCDC configuration incomplete")
    
    login_url = f"{discovery_url}/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=openid%20profile%20email"
    
    return {"login_url": login_url}


@router.post("/ocdc/callback")
def ocdc_callback(code: str, db: Session = Depends(get_db)):
    """Handle OCDC callback with authorization code"""
    if not config.OCDC_ENABLED:
        raise HTTPException(status_code=403, detail="OCDC is not enabled")
    
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")
    
    raise HTTPException(status_code=501, detail="OCDC callback requires proper configuration. Use /api/auth/ocdc/token instead.")


@router.post("/ocdc/token", response_model=TokenResponse)
def ocdc_token(ocdc_id: str, email: str, db: Session = Depends(get_db)):
    """Create or update user from OCDC token claim"""
    if not config.OCDC_ENABLED:
        raise HTTPException(status_code=403, detail="OCDC is not enabled")
    
    # Find or create user by OCDC ID
    user = db.query(User).filter(User.ocdc_id == ocdc_id).first()
    
    if not user:
        # Check if email-based user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user from OCDC
            user = User(
                email=email,
                ocdc_id=ocdc_id,
                is_active=1,
                password_hash="",
                stay_connected=1
            )
            
            # Create or get SPI team member if configured
            spi_member = db.query(TeamMember).filter(TeamMember.name == "spi").first()
            if not spi_member:
                spi_member = TeamMember(name="spi", role="Service Provider")
                db.add(spi_member)
                db.flush()
            
            user.team_member_id = spi_member.id
            db.add(user)
        else:
            # Update existing user with OCDC ID
            user.ocdc_id = ocdc_id
            user.is_active = 1
    else:
        # Update existing OCDC user email if different
        if user.email != email:
            user.email = email
    
    db.commit()
    db.refresh(user)
    
    # Generate token
    access_token = create_access_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        team_member_id=user.team_member_id,
        stay_connected=True
    )
