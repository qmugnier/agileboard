"""
Application configuration settings
"""
import os
from typing import Optional

class Config:
    """Base configuration"""
    
    # Authentication settings
    SIGNUP_ENABLED: bool = os.getenv("SIGNUP_ENABLED", "true").lower() == "true"
    STAY_CONNECTED_ENABLED: bool = os.getenv("STAY_CONNECTED_ENABLED", "true").lower() == "true"
    
    # OpenID Connect (OCDC) settings
    OCDC_ENABLED: bool = os.getenv("OCDC_ENABLED", "false").lower() == "true"
    OCDC_CLIENT_ID: Optional[str] = os.getenv("OCDC_CLIENT_ID")
    OCDC_CLIENT_SECRET: Optional[str] = os.getenv("OCDC_CLIENT_SECRET")
    OCDC_DISCOVERY_URL: Optional[str] = os.getenv("OCDC_DISCOVERY_URL")
    OCDC_REDIRECT_URI: Optional[str] = os.getenv("OCDC_REDIRECT_URI", "http://localhost:3000/auth/callback")
    
    # Password validation rules
    PASSWORD_MIN_LENGTH: int = int(os.getenv("PASSWORD_MIN_LENGTH", "8"))
    PASSWORD_REQUIRE_UPPERCASE: bool = os.getenv("PASSWORD_REQUIRE_UPPERCASE", "true").lower() == "true"
    PASSWORD_REQUIRE_LOWERCASE: bool = os.getenv("PASSWORD_REQUIRE_LOWERCASE", "true").lower() == "true"
    PASSWORD_REQUIRE_NUMBERS: bool = os.getenv("PASSWORD_REQUIRE_NUMBERS", "true").lower() == "true"
    PASSWORD_REQUIRE_SPECIAL: bool = os.getenv("PASSWORD_REQUIRE_SPECIAL", "true").lower() == "true"
    
    # JWT settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_DAYS: int = int(os.getenv("JWT_EXPIRY_DAYS", "7"))
    
    # Auto-create team member for new users
    AUTO_CREATE_TEAM_MEMBER: bool = os.getenv("AUTO_CREATE_TEAM_MEMBER", "true").lower() == "true"
    
    @classmethod
    def get_password_config(cls):
        """Return password configuration as a dict"""
        return {
            "min_length": cls.PASSWORD_MIN_LENGTH,
            "require_uppercase": cls.PASSWORD_REQUIRE_UPPERCASE,
            "require_lowercase": cls.PASSWORD_REQUIRE_LOWERCASE,
            "require_numbers": cls.PASSWORD_REQUIRE_NUMBERS,
            "require_special": cls.PASSWORD_REQUIRE_SPECIAL,
        }
    
    @classmethod
    def get_auth_config(cls):
        """Return auth configuration"""
        return {
            "signup_enabled": cls.SIGNUP_ENABLED,
            "ocdc_enabled": cls.OCDC_ENABLED,
            "ocdc_client_id": cls.OCDC_CLIENT_ID if cls.OCDC_ENABLED else None,
            "ocdc_discovery_url": cls.OCDC_DISCOVERY_URL if cls.OCDC_ENABLED else None,
            "password_min_length": cls.PASSWORD_MIN_LENGTH,
            "password_require_uppercase": cls.PASSWORD_REQUIRE_UPPERCASE,
            "password_require_lowercase": cls.PASSWORD_REQUIRE_LOWERCASE,
            "password_require_numbers": cls.PASSWORD_REQUIRE_NUMBERS,
            "password_require_special": cls.PASSWORD_REQUIRE_SPECIAL,
        }


# Default instance
config = Config()
