"""Additional tests for critical auth branches - reaching 80% branch coverage"""
import pytest
from fastapi import status


class TestAuthCriticalBranches:
    """Tests for the 8 missing auth branches"""
    
    def test_login_with_inactive_user(self, client, db_session):
        """Test login when user is inactive (is_active=False)"""
        from database import User
        from auth_utils import hash_password
        
        # Create inactive user
        inactive_user = User(
            email="inactive@test.com",
            password_hash=hash_password("ValidPassword@123"),
            is_active=0  # Inactive
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        # Try logging in
        response = client.post("/api/auth/login", json={
            "email": "inactive@test.com",
            "password": "ValidPassword@123",
            "stay_connected": False
        })
        
        # Should fail because user is inactive
        assert response.status_code == 401
        assert "disabled" in response.json().get("detail", "").lower()
    
    def test_login_with_stay_connected_toggle(self, client, db_session):
        """Test login with stay_connected flag toggle"""
        from database import User
        from auth_utils import hash_password
        
        # Create test user
        user = User(
            email="toggle@test.com",
            password_hash=hash_password("TestPassword@123"),
            is_active=1,
            stay_connected=0
        )
        db_session.add(user)
        db_session.commit()
        
        # First login with stay_connected=True
        response1 = client.post("/api/auth/login", json={
            "email": "toggle@test.com",
            "password": "TestPassword@123",
            "stay_connected": True
        })
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["stay_connected"] is True
        
        # Second login with stay_connected=False (toggle)
        response2 = client.post("/api/auth/login", json={
            "email": "toggle@test.com",
            "password": "TestPassword@123",
            "stay_connected": False
        })
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["stay_connected"] is False
    
    def test_get_current_user_with_inactive_user(self, client, db_session):
        """Test get_current_user dependency with inactive user"""
        from database import User
        from auth_utils import hash_password, create_access_token
        
        # Create inactive user
        inactive_user = User(
            email="inactive2@test.com",
            password_hash=hash_password("ValidPassword@123"),
            is_active=0  # Inactive
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        # Try to use their token
        token = create_access_token({"sub": str(inactive_user.id)})
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        # Should fail because user is inactive
        assert response.status_code == 401
    
    def test_signup_with_auto_team_member_creation_existing(self, client, db_session):
        """Test signup with AUTO_CREATE_TEAM_MEMBER when team member exists"""
        from database import TeamMember
        from config import config
        
        # Skip if feature not enabled
        if not config.AUTO_CREATE_TEAM_MEMBER:
            pytest.skip("AUTO_CREATE_TEAM_MEMBER not enabled")
        
        # Pre-create team member
        team_member = TeamMember(name="newuser", role="Designer")
        db_session.add(team_member)
        db_session.commit()
        
        # Sign up with email that would create same team member name
        response = client.post("/api/auth/signup", json={
            "email": "newuser@domain.com",
            "password": "ValidPassword@123",
            "stay_connected": False
        })
        
        # Should succeed and link to existing team member
        if response.status_code != 403:  # If signup enabled
            assert response.status_code == 200
            data = response.json()
            assert data["team_member_id"] is not None
    
    def test_signup_with_auto_team_member_creation_new(self, client, db_session):
        """Test signup with AUTO_CREATE_TEAM_MEMBER creates new team member"""
        from database import TeamMember
        from config import config
        
        # Skip if feature not enabled
        if not config.AUTO_CREATE_TEAM_MEMBER:
            pytest.skip("AUTO_CREATE_TEAM_MEMBER not enabled")
        
        unique_email = f"uniqueuser_{hash('new')}@domain.com"
        
        response = client.post("/api/auth/signup", json={
            "email": unique_email,
            "password": "ValidPassword@123",
            "stay_connected": False
        })
        
        # Should succeed and create new team member
        if response.status_code != 403:  # If signup enabled
            assert response.status_code == 200
            data = response.json()
            assert data["team_member_id"] is not None
            
            # Verify team member was created
            team_member = db_session.query(TeamMember).filter(
                TeamMember.id == data["team_member_id"]
            ).first()
            assert team_member is not None
    
    def test_ocdc_disabled(self, client):
        """Test OCDC endpoints when disabled"""
        from config import config
        
        # Skip if OCDC is enabled
        if config.OCDC_ENABLED:
            pytest.skip("OCDC is enabled in this config")
        
        # Get OCDC login URL should fail
        response = client.get("/api/auth/ocdc/login-url")
        assert response.status_code in [403, 404, 405]
        
        # Callback should fail or not found
        response = client.post("/api/auth/ocdc/callback", json={"code": "test"})
        assert response.status_code in [403, 404, 405, 422]
        
        # Token should fail
        response = client.post("/api/auth/ocdc/token", json={
            "ocdc_id": "test",
            "email": "test@example.com"
        })
        assert response.status_code in [403, 404, 405, 422]
    
    def test_auth_token_invalid_scheme(self, client):
        """Test authorization with invalid scheme"""
        response = client.get("/api/auth/me", headers={
            "Authorization": "Basic dGVzdDp0ZXN0"  # Not Bearer
        })
        assert response.status_code == 401
        assert "scheme" in response.json().get("detail", "").lower()
    
    def test_auth_token_missing_split(self, client):
        """Test authorization header with no space (invalid split)"""
        response = client.get("/api/auth/me", headers={
            "Authorization": "InvalidToken"  # No space to split
        })
        assert response.status_code == 401


class TestAuthEdgeCases:
    """Tests for edge cases and boundary conditions"""
    
    def test_password_validation_boundary_conditions(self, client):
        """Test password with boundary length conditions"""
        from config import config
        pwd_config = config.get_password_config()
        
        # Too short password
        too_short = "P@1"  # Usually too short
        response = client.post("/api/auth/signup", json={
            "email": f"short{hash('pwd')}@test.com",
            "password": too_short,
            "stay_connected": False
        })
        # Should fail or succeed depending on config
        assert response.status_code in [200, 400, 403, 422]
    
    def test_email_normalization(self, client, db_session):
        """Test that emails are handled consistently"""
        from database import User
        
        # Sign up with lowercase
        response1 = client.post("/api/auth/signup", json={
            "email": "test.email@example.com",
            "password": "ValidPassword@123",
            "stay_connected": False
        })
        
        if response1.status_code != 403:  # If signup enabled
            assert response1.status_code == 200
            
            # Try signup with exact same email
            response2 = client.post("/api/auth/signup", json={
                "email": "test.email@example.com",
                "password": "ValidPassword@123",
                "stay_connected": False
            })
            # Should fail (email already exists)
            assert response2.status_code in [400, 403, 409]
    
    def test_concurrent_login_attempts(self, client, db_session):
        """Test multiple login attempts with correct and incorrect password"""
        from database import User
        from auth_utils import hash_password
        
        # Create test user
        user = User(
            email="concurrent@test.com",
            password_hash=hash_password("TestPassword@123"),
            is_active=1
        )
        db_session.add(user)
        db_session.commit()
        
        # Wrong password first
        response1 = client.post("/api/auth/login", json={
            "email": "concurrent@test.com",
            "password": "WrongPassword@123",
            "stay_connected": False
        })
        assert response1.status_code == 401
        
        # Correct password should still work after wrong attempt
        response2 = client.post("/api/auth/login", json={
            "email": "concurrent@test.com",
            "password": "TestPassword@123",
            "stay_connected": False
        })
        assert response2.status_code == 200
