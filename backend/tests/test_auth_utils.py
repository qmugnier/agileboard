"""Tests for auth utilities and password validation"""
import pytest
from datetime import timedelta
from auth_utils import (
    hash_password, verify_password, validate_password,
    create_access_token, verify_token, get_password_rules
)


class TestPasswordHashing:
    """Test password hashing and verification"""
    
    def test_hash_password(self):
        """Hash password creates different hash each time"""
        password = "SecureP@ss123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different salt
        assert len(hash1) > 20
        assert len(hash2) > 20
    
    def test_verify_password_success(self):
        """Verify correct password"""
        password = "MyP@ssw0rd"
        hashed = hash_password(password)
        assert verify_password(password, hashed) == True
    
    def test_verify_password_fail(self):
        """Reject wrong password"""
        password = "MyP@ssw0rd"
        wrong_password = "WrongP@ssw0rd"
        hashed = hash_password(password)
        assert verify_password(wrong_password, hashed) == False
    
    def test_verify_password_case_sensitive(self):
        """Password verification is case sensitive"""
        password = "MyP@ssw0rd"
        hashed = hash_password(password)
        assert verify_password("myp@ssw0rd", hashed) == False


class TestPasswordValidation:
    """Test password validation rules"""
    
    def test_valid_password(self):
        """Valid password passes all rules"""
        password = "ValidP@ss123"
        is_valid, message = validate_password(password)
        assert is_valid == True
        assert message == ""
    
    def test_too_short_password(self):
        """Password too short fails"""
        password = "Short1!"
        is_valid, message = validate_password(password)
        assert is_valid == False
        assert "at least" in message
    
    def test_missing_uppercase(self):
        """Password missing uppercase fails"""
        password = "lowercase@pass123"
        is_valid, message = validate_password(password)
        assert is_valid == False
        assert "uppercase" in message
    
    def test_missing_lowercase(self):
        """Password missing lowercase fails"""
        password = "UPPERCASE@PASS123"
        is_valid, message = validate_password(password)
        assert is_valid == False
        assert "lowercase" in message
    
    def test_missing_numbers(self):
        """Password missing numbers fails"""
        password = "NoNumbersHere@"
        is_valid, message = validate_password(password)
        assert is_valid == False
        assert "number" in message
    
    def test_missing_special_chars(self):
        """Password missing special characters fails"""
        password = "NoSpecialChar123"
        is_valid, message = validate_password(password)
        assert is_valid == False
        assert "special" in message
    
    def test_multiple_errors(self):
        """Multiple validation errors are reported"""
        password = "short"
        is_valid, message = validate_password(password)
        assert is_valid == False
        assert "|" in message  # Multiple errors joined with |
    
    def test_custom_config(self):
        """Custom validation config is respected"""
        config = {
            "min_length": 5,
            "require_uppercase": False,
            "require_lowercase": False,
            "require_numbers": False,
            "require_special": False
        }
        password = "abc"
        is_valid, message = validate_password(password, config)
        assert is_valid == False
        assert "at least 5" in message
        
        password = "abcde"
        is_valid, message = validate_password(password, config)
        assert is_valid == True


class TestTokenManagement:
    """Test JWT token creation and verification"""
    
    def test_create_access_token(self):
        """Create valid access token"""
        data = {"sub": "user@example.com", "user_id": 1}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 20
    
    def test_create_token_with_expiry(self):
        """Create token with custom expiry"""
        data = {"sub": "user@example.com"}
        expires = timedelta(hours=1)
        token = create_access_token(data, expires)
        
        assert token is not None
        payload = verify_token(token)
        assert payload is not None
        assert "exp" in payload
    
    def test_verify_valid_token(self):
        """Verify valid token"""
        data = {"sub": "user@example.com", "user_id": 123}
        token = create_access_token(data)
        
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == "user@example.com"
        assert payload["user_id"] == 123
    
    def test_verify_invalid_token(self):
        """Invalid token returns None"""
        payload = verify_token("invalid.token.here")
        assert payload is None
    
    def test_verify_malformed_token(self):
        """Malformed token returns None"""
        payload = verify_token("not_a_valid_jwt")
        assert payload is None
    
    def test_token_includes_exp(self):
        """Token includes expiration claim"""
        data = {"sub": "user@example.com"}
        token = create_access_token(data)
        payload = verify_token(token)
        
        assert payload is not None
        assert "exp" in payload


class TestPasswordRules:
    """Test password rules retrieval for frontend"""
    
    def test_get_default_password_rules(self):
        """Get default password rules"""
        rules = get_password_rules()
        
        assert "minLength" in rules
        assert "requireUppercase" in rules
        assert "requireLowercase" in rules
        assert "requireNumbers" in rules
        assert "requireSpecial" in rules
        
        assert rules["minLength"] == 8
        assert rules["requireUppercase"] == True
        assert rules["requireLowercase"] == True
        assert rules["requireNumbers"] == True
        assert rules["requireSpecial"] == True
    
    def test_get_custom_password_rules(self):
        """Get custom password rules"""
        config = {
            "min_length": 10,
            "require_uppercase": False,
            "require_lowercase": True,
            "require_numbers": True,
            "require_special": False
        }
        rules = get_password_rules(config)
        
        assert rules["minLength"] == 10
        assert rules["requireUppercase"] == False
        assert rules["requireLowercase"] == True
        assert rules["requireNumbers"] == True
        assert rules["requireSpecial"] == False
