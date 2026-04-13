"""
Comprehensive branch coverage tests for stories.py
Targets 90%+ branch coverage with extensive edge case testing
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from main import app
from database import UserStory, Project, Sprint, ProjectStatus, StatusTransition, TeamMember, StoryHistory, get_db
from schemas import UserStoryCreate, UserStoryUpdate, AssignRequest


class TestStoriesGetBranches:
    """Test all branches in GET /api/user-stories endpoint."""
    
    def test_get_stories_no_filters(self, client, db_session):
        """Test GET with no filter parameters."""
        response = client.get("/api/user-stories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_stories_filter_by_project_only(self, client, db_session):
        """Test GET with only project_id filter."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US-001",
            project_id=project.id,
            title="Test",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/user-stories?project_id={project.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(s["project_id"] == project.id for s in data)
    
    def test_get_stories_filter_by_sprint_only(self, client, db_session):
        """Test GET with only sprint_id filter."""
        project = Project(name="Project A")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(project_id=project.id, name="Sprint 1")
        db_session.add(sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US-002",
            project_id=project.id,
            sprint_id=sprint.id,
            title="Test",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/user-stories?sprint_id={sprint.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(s["sprint_id"] == sprint.id for s in data)
    
    def test_get_stories_filter_by_status_only(self, client, db_session):
        """Test GET with only status filter."""
        project = Project(name="Project B")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US-003",
            project_id=project.id,
            title="Test",
            description="Test",
            business_value=10,
            effort=5,
            status="ready"
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.get("/api/user-stories?status=ready")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(s["status"] == "ready" for s in data)
    
    def test_get_stories_filter_all_three(self, client, db_session):
        """Test GET with all three filters."""
        project = Project(name="Project C")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(project_id=project.id, name="Sprint 1")
        db_session.add(sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US-004",
            project_id=project.id,
            sprint_id=sprint.id,
            title="Test",
            description="Test",
            business_value=10,
            effort=5,
            status="in_progress"
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.get(
            f"/api/user-stories?project_id={project.id}&sprint_id={sprint.id}&status=in_progress"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1


class TestStoriesCreateBranches:
    """Test all branches in POST /api/user-stories endpoint."""
    
    def test_create_story_project_not_found(self, client, db_session):
        """Test POST with non-existent project."""
        payload = {
            "project_id": 99999,
            "title": "Test",
            "description": "Test",
            "business_value": 10,
            "effort": 5
        }
        response = client.post("/api/user-stories", json=payload)
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_create_story_empty_database(self, client, db_session):
        """Test POST when no stories exist yet."""
        project = Project(name="Empty Project")
        db_session.add(project)
        db_session.commit()
        
        payload = {
            "project_id": project.id,
            "title": "First Story",
            "description": "Test",
            "business_value": 10,
            "effort": 5
        }
        response = client.post("/api/user-stories", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["story_id"] == "US1"
    
    def test_create_story_max_story_not_us_prefix(self, client, db_session):
        """Test story ID generation when max_story doesn't start with 'US'."""
        project = Project(name="Project D")
        db_session.add(project)
        db_session.commit()
        
        # Create a story with non-US prefix
        story = UserStory(
            story_id="CUSTOM-001",
            project_id=project.id,
            title="Custom",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        # Create another story - should generate US1
        payload = {
            "project_id": project.id,
            "title": "New Story",
            "description": "Test",
            "business_value": 10,
            "effort": 5
        }
        response = client.post("/api/user-stories", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["story_id"] == "US1"
    
    def test_create_story_max_story_invalid_number(self, client, db_session):
        """Test story ID generation with unparseable number."""
        project = Project(name="Project E")
        db_session.add(project)
        db_session.commit()
        
        # Create story with non-numeric suffix
        story = UserStory(
            story_id="USABC",
            project_id=project.id,
            title="Non-numeric",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        payload = {
            "project_id": project.id,
            "title": "New Story",
            "description": "Test",
            "business_value": 10,
            "effort": 5
        }
        response = client.post("/api/user-stories", json=payload)
        assert response.status_code == 200
        # Should default to US1 due to ValueError
        assert response.json()["story_id"] == "US1"
    
    def test_create_story_collision_handling(self, client, db_session):
        """Test story ID collision handling."""
        project = Project(name="Project F")
        db_session.add(project)
        db_session.commit()
        
        # Create US1
        story1 = UserStory(
            story_id="US1",
            project_id=project.id,
            title="First",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story1)
        db_session.commit()
        
        # Create new story - should get US2 due to collision
        payload = {
            "project_id": project.id,
            "title": "Second",
            "description": "Test",
            "business_value": 10,
            "effort": 5
        }
        response = client.post("/api/user-stories", json=payload)
        assert response.status_code == 200
        assert response.json()["story_id"] == "US2"


class TestStoriesUpdateBranches:
    """Test all branches in PUT /api/user-stories endpoint."""
    
    def test_update_story_not_found(self, client, db_session):
        """Test PUT with non-existent story."""
        payload = {"status": "in_progress"}
        response = client.put("/api/user-stories/US-NOTFOUND", json=payload)
        assert response.status_code == 404
    
    def test_update_story_closed_sprint_check(self, client, db_session):
        """Test cannot modify stories in closed sprint."""
        project = Project(name="Project G")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(project_id=project.id, name="Closed Sprint", status="closed")
        db_session.add(sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US-CLOSED",
            project_id=project.id,
            sprint_id=sprint.id,
            title="In Closed Sprint",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        payload = {"effort": 8}
        response = client.put("/api/user-stories/US-CLOSED", json=payload)
        assert response.status_code == 400
        assert "closed sprint" in response.json()["detail"]
    
    def test_update_story_final_status_block(self, client, db_session):
        """Test cannot edit story in final status without changing status."""
        project = Project(name="Project H")
        db_session.add(project)
        db_session.commit()
        
        # Create final status
        final_status = ProjectStatus(
            project_id=project.id,
            status_name="done",
            is_final=True
        )
        db_session.add(final_status)
        db_session.commit()
        
        story = UserStory(
            story_id="US-FINAL",
            project_id=project.id,
            title="Done Story",
            description="Test",
            business_value=10,
            effort=5,
            status="done"
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to update effort - should fail
        payload = {"effort": 8}
        response = client.put("/api/user-stories/US-FINAL", json=payload)
        assert response.status_code == 400
        assert "final status" in response.json()["detail"]
    
    def test_update_story_final_status_with_status_change(self, client, db_session):
        """Test can change status from final status."""
        project = Project(name="Project I")
        db_session.add(project)
        db_session.commit()
        
        final_status = ProjectStatus(
            project_id=project.id,
            status_name="done",
            is_final=True
        )
        in_progress_status = ProjectStatus(
            project_id=project.id,
            status_name="in_progress",
            is_final=False
        )
        db_session.add_all([final_status, in_progress_status])
        db_session.commit()
        
        story = UserStory(
            story_id="US-FINAL2",
            project_id=project.id,
            title="Done Story",
            description="Test",
            business_value=10,
            effort=5,
            status="done"
        )
        db_session.add(story)
        db_session.commit()
        
        # Change status - should succeed
        payload = {"status": "in_progress"}
        response = client.put("/api/user-stories/US-FINAL2", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"
    
    def test_update_story_sprint_assignment_backlog_to_active(self, client, db_session):
        """Test cannot add backlog stories to active sprint."""
        project = Project(name="Project J")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(project_id=project.id, name="Active Sprint", status="active")
        db_session.add(sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US-BACKLOG",
            project_id=project.id,
            title="Backlog Story",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to assign to active sprint
        payload = {"sprint_id": sprint.id}
        response = client.put("/api/user-stories/US-BACKLOG", json=payload)
        assert response.status_code == 400
        assert "active sprint" in response.json()["detail"]
    
    def test_update_story_sprint_assignment_to_closed(self, client, db_session):
        """Test cannot assign stories to closed sprint."""
        project = Project(name="Project K")
        db_session.add(project)
        db_session.commit()
        
        closed_sprint = Sprint(project_id=project.id, name="Closed", status="closed")
        db_session.add(closed_sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US-SPRINT",
            project_id=project.id,
            title="Story",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        payload = {"sprint_id": closed_sprint.id}
        response = client.put("/api/user-stories/US-SPRINT", json=payload)
        assert response.status_code == 400
        assert "closed sprint" in response.json()["detail"]
    
    def test_update_story_with_history_tracking(self, client, db_session):
        """Test status change creates history entry."""
        project = Project(name="Project L")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US-HISTORY",
            project_id=project.id,
            title="Story",
            description="Test",
            business_value=10,
            effort=5,
            status="backlog"
        )
        db_session.add(story)
        db_session.commit()
        
        payload = {"status": "ready"}
        response = client.put("/api/user-stories/US-HISTORY", json=payload)
        assert response.status_code == 200
        
        # Check history was created
        history = db_session.query(StoryHistory).filter_by(us_id="US-HISTORY").all()
        assert len(history) >= 1
        assert any(h.change_type == "status_changed" for h in history)
    
    def test_update_story_sprint_change_history(self, client, db_session):
        """Test sprint change creates history entry."""
        project = Project(name="Project M")
        db_session.add(project)
        db_session.commit()
        
        sprint1 = Sprint(project_id=project.id, name="Sprint 1")
        db_session.add(sprint1)
        db_session.commit()
        
        story = UserStory(
            story_id="US-SPRINT-CHANGE",
            project_id=project.id,
            sprint_id=sprint1.id,
            title="Story",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        # Update sprint_id to None
        payload = {"sprint_id": None}
        response = client.put("/api/user-stories/US-SPRINT-CHANGE", json=payload)
        assert response.status_code == 200
        
        # Check history
        history = db_session.query(StoryHistory).filter_by(us_id="US-SPRINT-CHANGE").all()
        assert any(h.change_type == "sprint_changed" for h in history)


class TestStoriesDeleteBranches:
    """Test all branches in DELETE endpoint."""
    
    def test_delete_story_not_found(self, client, db_session):
        """Test DELETE non-existent story."""
        response = client.delete("/api/user-stories/US-NOTEXIST")
        assert response.status_code == 404
    
    def test_delete_story_in_active_sprint(self, client, db_session):
        """Test cannot delete story in active sprint."""
        project = Project(name="Project N")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(project_id=project.id, name="Active", status="active")
        db_session.add(sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US-DELETE-ACTIVE",
            project_id=project.id,
            sprint_id=sprint.id,
            title="Story",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.delete("/api/user-stories/US-DELETE-ACTIVE")
        assert response.status_code == 400
        assert "active sprint" in response.json()["detail"]
    
    def test_delete_story_assigned_to_member(self, client, db_session):
        """Test cannot delete story assigned to team members."""
        project = Project(name="Project O")
        db_session.add(project)
        db_session.commit()
        
        member = TeamMember(name="Developer", role="Developer")
        db_session.add(member)
        db_session.commit()
        
        story = UserStory(
            story_id="US-DELETE-ASSIGNED",
            project_id=project.id,
            title="Story",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.flush()
        
        story.assigned_to.append(member)
        db_session.commit()
        
        response = client.delete("/api/user-stories/US-DELETE-ASSIGNED")
        assert response.status_code == 400
        assert "assigned" in response.json()["detail"]
    
    def test_delete_story_success(self, client, db_session):
        """Test successful story deletion."""
        project = Project(name="Project P")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US-DELETE-OK",
            project_id=project.id,
            title="Deletable",
            description="Test",
            business_value=10,
            effort=5
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.delete("/api/user-stories/US-DELETE-OK")
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # Verify deleted
        deleted = db_session.query(UserStory).filter_by(story_id="US-DELETE-OK").first()
        assert deleted is None
