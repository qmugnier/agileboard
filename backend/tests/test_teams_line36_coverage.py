"""
Final targeted test for teams.py line 36 coverage.
Attempts to test the current_user self-deletion check.
"""
import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException

from database import TeamMember, User


def test_delete_own_team_member_account(db_session):
    """Test that user cannot delete their own team member account (Line 36)."""
    
    # Create team member and user
    member = TeamMember(name="Self Delete Test", role="Developer")
    db_session.add(member)
    db_session.flush()
    
    user = User(
        email="selfdelete@test.com",
        password_hash="hash123",
        team_member_id=member.id
    )
    db_session.add(user)
    db_session.commit()
    
    # Import and call delete_team_member directly with current_user set
    from routers.teams import delete_team_member
    
    try:
        # Call with current_user = user (not None, which is the default)
        result = delete_team_member(
            member_id=member.id,
            db=db_session,
            current_user=user  # Pass the user directly
        )
        # Should have raised HTTPException
        pytest.fail("Should have raised HTTPException")
    except HTTPException as e:
        # Expected - should prevent self-deletion
        assert e.status_code == 400
        assert "cannot delete your own account" in e.detail

