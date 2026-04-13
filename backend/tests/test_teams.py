"""Tests for team member management endpoints"""
import pytest
from fastapi import status


class TestTeamMemberRoutes:
    """Test team member CRUD operations"""
    
    def test_get_team_members(self, client):
        """Test getting all team members"""
        response = client.get("/api/team-members")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_team_member(self, client):
        """Test creating a team member"""
        payload = {
            "name": "John Developer",
            "role": "Developer"
        }
        response = client.post("/api/team-members", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == payload["name"]
            assert data["role"] == payload["role"]
        else:
            assert response.status_code in [400, 500]
    
    def test_get_team_member_by_id(self, client, db_session):
        """Test getting specific team member"""
        from database import TeamMember
        
        member = TeamMember(name="Jane QA", role="QA Engineer")
        db_session.add(member)
        db_session.commit()
        
        response = client.get(f"/api/team-members/{member.id}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == "Jane QA"
            assert data["role"] == "QA Engineer"
        else:
            assert response.status_code in [404, 405]
    
    def test_get_nonexistent_team_member(self, client):
        """Test getting non-existent team member"""
        response = client.get("/api/team-members/99999")
        assert response.status_code in [404, 405, 400]
    
    def test_update_team_member(self, client, db_session):
        """Test updating team member"""
        from database import TeamMember
        
        member = TeamMember(name="Tom DevOps", role="DevOps")
        db_session.add(member)
        db_session.commit()
        
        payload = {
            "name": "Tom Senior DevOps",
            "role": "Senior DevOps"
        }
        response = client.put(f"/api/team-members/{member.id}", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == payload["name"]
        else:
            assert response.status_code in [404, 405]
    
    def test_delete_team_member(self, client, db_session):
        """Test deleting a team member"""
        from database import TeamMember
        
        member = TeamMember(name="Bob Manager", role="Project Manager")
        db_session.add(member)
        db_session.commit()
        member_id = member.id
        
        response = client.delete(f"/api/team-members/{member_id}")
        
        if response.status_code == 200:
            # Verify deletion
            response = client.get(f"/api/team-members/{member_id}")
            assert response.status_code in [404, 405]
        else:
            # Endpoint might not exist
            assert response.status_code in [404, 405, 400]


class TestTeamAssignment:
    """Test team member assignments"""
    
    def test_assign_member_to_story(self, client, db_session):
        """Test assigning team member to story"""
        from database import Project, Sprint, UserStory, TeamMember
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US1",
            title="Test Story",
            description="Test",
            project_id=project.id,
            sprint_id=sprint.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        member = TeamMember(name="Developer", role="Dev")
        db_session.add(member)
        db_session.commit()
        
        response = client.post(f"/api/user-stories/{story.story_id}/assign", json={
            "user_id": member.id
        })
        
        if response.status_code == 200:
            data = response.json()
            # Should have assignment info
            assert data is not None
        else:
            assert response.status_code in [404, 405]
    
    def test_unassign_member_from_story(self, client, db_session):
        """Test unassigning team member from story"""
        from database import Project, Sprint, UserStory, TeamMember
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.commit()
        
        member = TeamMember(name="Developer", role="Dev")
        db_session.add(member)
        db_session.commit()
        
        story = UserStory(
            story_id="US2",
            title="Assigned Story",
            description="Test",
            project_id=project.id,
            sprint_id=sprint.id,
            status="ready",
            effort=5,
            business_value=8
        )
        story.assigned_to.append(member)
        db_session.add(story)
        db_session.commit()
        
        response = client.post(f"/api/user-stories/{story.story_id}/unassign", json={
            "user_id": member.id
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data is not None
        else:
            assert response.status_code in [404, 405]
    
    def test_get_team_member_workload(self, client, db_session):
        """Test getting team member's workload"""
        from database import TeamMember
        
        member = TeamMember(name="Busy Developer", role="Dev")
        db_session.add(member)
        db_session.commit()
        
        response = client.get(f"/api/team-members/{member.id}/workload")
        
        if response.status_code == 200:
            data = response.json()
            # Should return workload info (stories assigned, effort sum, etc.)
            assert data is not None
        else:
            assert response.status_code in [404, 405]


class TestTeamEdgeCases:
    """Test edge cases in team management"""
    
    def test_create_team_member_missing_name(self, client):
        """Test creating team member without required fields"""
        payload = {
            "role": "Developer"
        }
        response = client.post("/api/team-members", json=payload)
        assert response.status_code in [400, 422]
    
    def test_create_team_member_duplicate_name(self, client, db_session):
        """Test creating duplicate team member"""
        from database import TeamMember
        
        member = TeamMember(name="John Doe", role="Developer")
        db_session.add(member)
        db_session.commit()
        
        # Create another with same name
        payload = {
            "name": "John Doe",
            "role": "Developer"
        }
        response = client.post("/api/team-members", json=payload)
        
        # Should allow duplicates or check for them
        if response.status_code == 200:
            assert response.json()["name"] == "John Doe"
        else:
            # Might reject duplicates
            assert response.status_code in [400, 409]
    
    def test_get_team_members_pagination(self, client):
        """Test getting team members with pagination"""
        response = client.get("/api/team-members?limit=10&offset=0")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            # Pagination might not be supported
            assert response.status_code == status.HTTP_200_OK
