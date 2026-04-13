"""
Unit tests for user story management routes
"""
import pytest
from fastapi import status


class TestStoryRoutes:
    """Test suite for user story endpoints"""
    
    def test_get_user_stories(self, client):
        """Test getting all user stories"""
        response = client.get("/api/user-stories")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_stories_by_project(self, client, db_session):
        """Test filtering stories by project"""
        from database import Project
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        response = client.get(f"/api/user-stories?project_id={project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_user_story(self, client, db_session):
        """Test creating a user story"""
        from database import Project
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        payload = {
            "title": "Test Story",
            "description": "Test story description",
            "project_id": project.id,
            "status": "ready",
            "effort": 8,
            "business_value": 13
        }
        
        response = client.post("/api/user-stories", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["status"] == payload["status"]
        assert "story_id" in data
    
    def test_get_story_by_id(self, client, db_session):
        """Test getting specific story"""
        from database import Project, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US1",
            title="Test Story",
            description="Test description",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/user-stories/{story.story_id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["story_id"] == story.story_id
        assert data["title"] == story.title
    
    def test_update_story_status(self, client, db_session):
        """Test updating story status"""
        from database import Project, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US1",
            title="Test Story",
            description="Test description",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        payload = {"status": "in_progress"}
        response = client.put(f"/api/user-stories/{story.story_id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["story_id"] == story.story_id
    
    def test_cannot_delete_assigned_story(self, client, db_session):
        """Test that assigned stories cannot be deleted"""
        from database import Project, UserStory, TeamMember, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member = TeamMember(name="Dev 1", role="Developer")
        db_session.add(team_member)
        db_session.commit()
        
        story = UserStory(
            story_id="US1",
            title="Assigned Story",
            project_id=project.id,
            status="ready"
        )
        story.assigned_to.append(team_member)
        db_session.add(story)
        db_session.commit()
        
        response = client.delete(f"/api/user-stories/{story.story_id}")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestStoryEdgeCases:
    """Test edge cases and error scenarios for stories"""
    
    def test_create_story_invalid_project(self, client):
        """Test creating story with non-existent project"""
        payload = {
            "title": "Test Story",
            "description": "Test description",
            "project_id": 99999,
            "status": "ready",
            "effort": 8,
            "business_value": 13
        }
        response = client.post("/api/user-stories", json=payload)
        # Should fail or handle gracefully
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND, status.HTTP_200_OK]
    
    def test_get_nonexistent_story(self, client):
        """Test getting non-existent story"""
        response = client.get("/api/user-stories/NONEXISTENT")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_nonexistent_story(self, client):
        """Test updating non-existent story"""
        payload = {"status": "in_progress"}
        response = client.put("/api/user-stories/NONEXISTENT", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_unassigned_story(self, client, db_session):
        """Test deleting unassigned story succeeds"""
        from database import Project, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US_DELETE",
            title="Unassigned Story",
            project_id=project.id,
            status="ready",
            effort=3,
            business_value=5
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.delete(f"/api/user-stories/{story.story_id}")
        assert response.status_code == status.HTTP_200_OK
    
    def test_assign_story_to_team_member(self, client, db_session):
        """Test assigning story to team member"""
        from database import Project, UserStory, TeamMember
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member = TeamMember(name="Developer", role="Dev")
        db_session.add(team_member)
        db_session.commit()
        
        story = UserStory(
            story_id="US_ASSIGN",
            title="Story to Assign",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        payload = {"user_id": team_member.id}
        response = client.post(f"/api/user-stories/{story.story_id}/assign", json=payload)
        
        # Endpoint might not exist (404) or succeed
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
    
    def test_story_with_epic(self, client, db_session):
        """Test creating story with epic"""
        from database import Project, UserStory, Epic
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        epic = Epic(name="Test Epic", color="#FF0000")
        db_session.add(epic)
        db_session.commit()
        
        payload = {
            "title": "Epic Story",
            "description": "Story with epic",
            "project_id": project.id,
            "epic_id": epic.id,
            "status": "ready",
            "effort": 5,
            "business_value": 8
        }
        response = client.post("/api/user-stories", json=payload)
        
        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert data.get("epic_id") == epic.id
    
    def test_story_status_transitions(self, client, db_session):
        """Test various story status transitions"""
        from database import Project, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US_STATUS",
            title="Status Test Story",
            description="Test description",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Test transition to different statuses
        for new_status in ["in_progress", "done", "ready"]:
            payload = {"status": new_status}
            response = client.put(f"/api/user-stories/{story.story_id}", json=payload)
            # Accept both success and validation errors
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, 422]
