"""Team member management routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, TeamMember, UserStory, User
from schemas import TeamMember as TeamMemberSchema, TeamMemberCreate, TeamMemberUpdate, PasswordReset
from auth_utils import hash_password, validate_password

router = APIRouter(prefix="/api/team-members", tags=["team"])


@router.get("", response_model=List[TeamMemberSchema])
def get_team_members(db: Session = Depends(get_db)):
    """Get all team members"""
    return db.query(TeamMember).order_by(TeamMember.name).all()


@router.get("/{member_id}", response_model=TeamMemberSchema)
def get_team_member(member_id: int, db: Session = Depends(get_db)):
    """Get a specific team member"""
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    return member


@router.post("", response_model=TeamMemberSchema)
def create_team_member(team_member: TeamMemberCreate, db: Session = Depends(get_db)):
    """Create new team member and optionally create user account with password"""
    # Check for duplicate name
    existing_name = db.query(TeamMember).filter(TeamMember.name == team_member.name).first()
    if existing_name:
        raise HTTPException(status_code=400, detail="Team member with this name already exists")
    
    # Check for duplicate email if provided
    if team_member.email:
        existing_email = db.query(TeamMember).filter(TeamMember.email == team_member.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Team member with this email already exists")
    
    # Create team member
    db_member = TeamMember(
        name=team_member.name,
        role=team_member.role,
        position=team_member.position,
        department=team_member.department,
        email=team_member.email,
        phone=team_member.phone,
        avatar=team_member.avatar,
        is_active=team_member.is_active
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    # If application access is enabled, create user account
    if team_member.is_active == 1:
        if not team_member.email:
            raise HTTPException(status_code=400, detail="Email is required to enable application access")
        
        # Check for existing user with this email
        existing_user = db.query(User).filter(User.email == team_member.email).first()
        if existing_user and existing_user.team_member_id != db_member.id:
            raise HTTPException(status_code=400, detail="User account with this email already exists")
        
        # Create or update user account
        user = existing_user if existing_user else User(email=team_member.email, team_member_id=db_member.id)
        
        # Set password only if provided - user cannot login without one
        if team_member.password:
            is_valid, error_msg = validate_password(team_member.password)
            if not is_valid:
                db.delete(db_member)
                db.commit()
                raise HTTPException(status_code=400, detail=error_msg)
            user.password_hash = hash_password(team_member.password)
        # If no password provided, leave password_hash as None - user must reset password to login
        
        user.is_active = 1
        if not existing_user:
            db.add(user)
        db.commit()
    
    return db_member


@router.put("/{member_id}", response_model=TeamMemberSchema)
def update_team_member(member_id: int, team_member: TeamMemberUpdate, db: Session = Depends(get_db)):
    """Update team member details and manage user account based on is_active status"""
    db_member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Check for duplicate name if being changed
    if team_member.name and team_member.name != db_member.name:
        existing = db.query(TeamMember).filter(TeamMember.name == team_member.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Team member with this name already exists")
    
    # Check for duplicate email if being changed
    if team_member.email and team_member.email != db_member.email:
        existing = db.query(TeamMember).filter(TeamMember.email == team_member.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Team member with this email already exists")
    
    # Handle is_active status changes (enable/disable application access)
    old_active_status = db_member.is_active
    new_active_status = team_member.is_active if team_member.is_active is not None else db_member.is_active
    
    if new_active_status != old_active_status:
        # Enabling access (0 -> 1): Create user account if it doesn't exist
        if new_active_status == 1:
            if not db_member.email:
                raise HTTPException(status_code=400, detail="Email is required to enable application access")
            
            user = db.query(User).filter(User.team_member_id == member_id).first()
            if not user:
                # Check if email already in use by another user
                existing_user = db.query(User).filter(User.email == db_member.email).first()
                if existing_user:
                    raise HTTPException(status_code=400, detail=f"Email {db_member.email} already in use by another account")
                
                # Create user account without password - must be set via reset-password
                user = User(
                    email=db_member.email,
                    password_hash=None,  # User must use reset-password to set initial password
                    is_active=1,
                    team_member_id=member_id
                )
                db.add(user)
        
        # Disabling access (1 -> 0): Deactivate user account
        elif new_active_status == 0:
            user = db.query(User).filter(User.team_member_id == member_id).first()
            if user:
                user.is_active = 0
    
    # Update only provided fields
    for key, value in team_member.model_dump(exclude_unset=True).items():
        setattr(db_member, key, value)
    
    db.commit()
    db.refresh(db_member)
    return db_member


@router.delete("/{member_id}", response_model=dict)
def delete_team_member(member_id: int, db: Session = Depends(get_db), current_user: User = Depends(lambda: None)):
    """Delete team member (cannot delete if assigned to stories or if it's the current user)"""
    if current_user and current_user.team_member_id == member_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Check if team member is assigned to any user stories
    story_count = db.query(UserStory).filter(UserStory.assigned_to.any(TeamMember.id == member_id)).count()
    if story_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete team member: assigned to {story_count} user stories")
    
    # Delete associated user account if exists
    user = db.query(User).filter(User.team_member_id == member_id).first()
    if user:
        db.delete(user)
    
    db.delete(member)
    db.commit()
    return {"message": "Team member deleted successfully"}


@router.post("/{member_id}/reset-password", response_model=dict)
def reset_team_member_password(member_id: int, password_reset: PasswordReset, db: Session = Depends(get_db)):
    """Reset password for a team member's user account"""
    # Get team member
    member = db.query(TeamMember).filter(TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Validate password first
    is_valid, error_msg = validate_password(password_reset.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Get associated user account - try by team_member_id first, then by email
    user = db.query(User).filter(User.team_member_id == member_id).first()
    
    # Fallback: look up by email if team_member_id link is missing
    if not user and member.email:
        user = db.query(User).filter(User.email == member.email).first()
        # Update the link if found
        if user:
            user.team_member_id = member_id
            db.commit()
    
    if not user:
        # Check if email exists (required to create user account)
        if not member.email:
            raise HTTPException(status_code=400, detail="Team member must have an email address to create a user account")
        
        # Check if email already used by another user
        existing_email = db.query(User).filter(User.email == member.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail=f"Email {member.email} is already in use by another account")
        
        # Create new user account
        user = User(
            email=member.email,
            password_hash=hash_password(password_reset.password),
            is_active=1,
            team_member_id=member_id
        )
        db.add(user)
        db.commit()
        return {"message": f"User account created and password set successfully for {member.name}"}
    
    # Update existing password
    user.password_hash = hash_password(password_reset.password)
    db.commit()
    
    return {"message": f"Password reset successfully for {member.name}"}
