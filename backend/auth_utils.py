import jwt
import bcrypt
import re
from datetime import datetime, timedelta, UTC
from typing import Optional
from functools import lru_cache

# Configuration
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
TOKEN_EXPIRY_DAYS = 7

# Password validation configuration
PASSWORD_CONFIG = {
    "min_length": 8,
    "require_uppercase": True,
    "require_lowercase": True,
    "require_numbers": True,
    "require_special": True,
}


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def validate_password(password: str, config: Optional[dict] = None) -> tuple[bool, str]:
    """
    Validate password against complexity rules.
    Returns: (is_valid, error_message)
    """
    if config is None:
        config = PASSWORD_CONFIG
    
    errors = []
    
    # Check minimum length
    if len(password) < config.get("min_length", 8):
        errors.append(f"Password must be at least {config.get('min_length', 8)} characters")
    
    # Check for uppercase
    if config.get("require_uppercase") and not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    # Check for lowercase
    if config.get("require_lowercase") and not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    # Check for numbers
    if config.get("require_numbers") and not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    # Check for special characters
    if config.get("require_special") and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)")
    
    if errors:
        return False, " | ".join(errors)
    
    return True, ""


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=TOKEN_EXPIRY_DAYS)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_password_rules(config: Optional[dict] = None) -> dict:
    """Return password validation rules for frontend display."""
    if config is None:
        config = PASSWORD_CONFIG
    
    return {
        "minLength": config.get("min_length", 8),
        "requireUppercase": config.get("require_uppercase", True),
        "requireLowercase": config.get("require_lowercase", True),
        "requireNumbers": config.get("require_numbers", True),
        "requireSpecial": config.get("require_special", True),
    }
