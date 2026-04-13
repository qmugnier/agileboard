"""
Comprehensive branch coverage tests for sprint management routes
"""
import pytest
from fastapi import status
from datetime import datetime, UTC, timedelta
from unittest.mock import patch


class TestSprintGetBranches:
    """Test all branches in get_sprint endpoint"""
    
    def test_get_existing_sprint(self, client, db_session):
        """Test getting an existing sprint"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Existing Sprint", project_id=project.id, status="not_started")
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get(f"/api/sprints/{sprint.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sprint.id
        assert data["name"] == "Existing Sprint"
    
    def test_get_nonexistent_sprint_404(self, client):
        """Test getting non-existent sprint returns 404"""
        response = client.get("/api/sprints/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()


class TestSprintCreateBranches:
    """Test all branches in create_sprint endpoint"""
    
    def test_create_sprint_success(self, client, db_session):
        """Test creating sprint successfully"""
        from database import Project
        
        project = Project(name="Project1", description="Test")
        db_session.add(project)
        db_session.commit()
        
        payload = {
            "name": "New Sprint",
            "project_id": project.id,
            "status": "not_started",
            "goal": "Sprint goal"
        }
        response = client.post("/api/sprints", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "New Sprint"
        assert data["status"] == "not_started"
    
    def test_create_sprint_with_multiple_values(self, client, db_session):
        """Test create sprint and verify all fields persist"""
        from database import Project
        
        project = Project(name="Project2", description="Test")
        db_session.add(project)
        db_session.commit()
        
        payload = {
            "name": "Sprint with Details",
            "project_id": project.id,
            "status": "not_started",
            "goal": "Complete features",
            "start_date": datetime.now(UTC).isoformat(),
        }
        response = client.post("/api/sprints", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["goal"] == "Complete features"


class TestSprintUpdateBranches:
    """Test all branches in update_sprint endpoint"""
    
    def test_update_existing_sprint(self, client, db_session):
        """Test updating an existing sprint"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint to Update",
            project_id=project.id,
            status="not_started",
            goal="Original goal"
        )
        db_session.add(sprint)
        db_session.commit()
        
        payload = {"goal": "New goal", "name": "Updated Sprint"}
        response = client.put(f"/api/sprints/{sprint.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["goal"] == "New goal"
        assert data["name"] == "Updated Sprint"
    
    def test_update_nonexistent_sprint_404(self, client):
        """Test updating non-existent sprint returns 404"""
        payload = {"goal": "Some goal"}
        response = client.put("/api/sprints/99999", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_sprint_partial_fields(self, client, db_session):
        """Test updating sprint with only some fields"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint",
            project_id=project.id,
            status="not_started",
            goal="Goal",
            start_date=datetime.now(UTC)
        )
        db_session.add(sprint)
        db_session.commit()
        original_name = sprint.name
        
        # Update only goal
        payload = {"goal": "Updated goal"}
        response = client.put(f"/api/sprints/{sprint.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        db_session.refresh(sprint)
        assert sprint.name == original_name  # Unchanged
        assert sprint.goal == "Updated goal"


class TestSprintDeleteBranches:
    """Test all branches in delete_sprint endpoint"""
    
    def test_delete_existing_sprint(self, client, db_session):
        """Test deleting an existing sprint"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint to Delete", project_id=project.id, status="not_started")
        db_session.add(sprint)
        db_session.commit()
        sprint_id = sprint.id
        
        response = client.delete(f"/api/sprints/{sprint_id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True
        
        # Verify deleted
        response = client.get(f"/api/sprints/{sprint_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_nonexistent_sprint_404(self, client):
        """Test deleting non-existent sprint returns 404"""
        response = client.delete("/api/sprints/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestStartSprintBranches:
    """Test all branches in start_sprint endpoint"""
    
    def test_start_nonexistent_sprint_404(self, client):
        """Test starting non-existent sprint returns 404"""
        response = client.post("/api/sprints/99999/start")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()
    
    def test_start_already_active_sprint_400(self, client, db_session):
        """Test starting sprint that's already active returns 400"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Active Sprint",
            project_id=project.id,
            status="active",
            is_active=1
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already active" in response.json()["detail"].lower()
    
    def test_start_closed_sprint_400(self, client, db_session):
        """Test starting closed sprint returns 400"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Closed Sprint",
            project_id=project.id,
            status="closed",
            is_active=0
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "closed" in response.json()["detail"].lower()
    
    def test_start_sprint_with_existing_active_in_project(self, client, db_session):
        """Test starting sprint when another is active in same project"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create active sprint in project
        active_sprint = Sprint(
            name="Currently Active",
            project_id=project.id,
            status="active",
            is_active=1
        )
        db_session.add(active_sprint)
        
        # Create new sprint to start
        new_sprint = Sprint(
            name="New Sprint",
            project_id=project.id,
            status="not_started",
            is_active=0
        )
        db_session.add(new_sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{new_sprint.id}/start")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already active" in response.json()["detail"].lower()
    
    def test_start_sprint_no_existing_active(self, client, db_session):
        """Test starting sprint when no other sprint is active"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test", default_sprint_duration_days=14)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint to Start",
            project_id=project.id,
            status="not_started",
            is_active=0
        )
        db_session.add(sprint)
        db_session.commit()
        sprint_id = sprint.id
        
        response = client.post(f"/api/sprints/{sprint_id}/start")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "active"
        assert data["is_active"] == 1
        assert data["start_date"] is not None
        assert data["end_date"] is not None
    
    def test_start_sprint_with_existing_end_date(self, client, db_session):
        """Test starting sprint that already has end_date set"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        existing_end_date = datetime.now(UTC) + timedelta(days=10)
        sprint = Sprint(
            name="Sprint with End",
            project_id=project.id,
            status="not_started",
            is_active=0,
            end_date=existing_end_date
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # End date should not be overwritten
        assert data["end_date"] is not None
    
    def test_start_sprint_project_with_default_duration(self, client, db_session):
        """Test start_sprint uses project default_sprint_duration_days"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test", default_sprint_duration_days=21)
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint",
            project_id=project.id,
            status="not_started"
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "active"
    
    def test_start_sprint_project_not_found_uses_default(self, client, db_session):
        """Test start_sprint uses default 14 days when project not found"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint",
            project_id=project.id,
            status="not_started"
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Delete project to simulate not found
        db_session.delete(project)
        db_session.commit()
        
        # Create new project with sprint pointing to deleted one
        orphan_project = Project(name="Orphan Project", description="Test")
        db_session.add(orphan_project)
        db_session.commit()
        
        orphan_sprint = Sprint(
            name="Orphan Sprint",
            project_id=999999,  # Non-existent project
            status="not_started"
        )
        db_session.add(orphan_sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{orphan_sprint.id}/start")
        assert response.status_code == status.HTTP_200_OK


class TestEndSprintBranches:
    """Test all branches in end_sprint endpoint"""
    
    def test_end_nonexistent_sprint_404(self, client):
        """Test ending non-existent sprint returns 404"""
        response = client.post("/api/sprints/99999/end")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_end_inactive_sprint_400(self, client, db_session):
        """Test ending inactive sprint returns 400"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Inactive Sprint",
            project_id=project.id,
            status="not_started"
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "only active sprints" in response.json()["detail"].lower()
    
    def test_end_active_sprint_with_done_stories(self, client, db_session):
        """Test ending sprint with done stories"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Active Sprint",
            project_id=project.id,
            status="active",
            is_active=1
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Add done story
        done_story = UserStory(
            story_id="US-1",
            title="Done Story",
            description="Test",
            project_id=project.id,
            sprint_id=sprint.id,
            status="done",
            effort=5,
            business_value=8
        )
        db_session.add(done_story)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "closed"
        assert data["is_active"] == 0
        
        # Verify done story stays in sprint
        db_session.refresh(done_story)
        assert done_story.sprint_id == sprint.id
        assert done_story.status == "done"
    
    def test_end_active_sprint_with_non_done_stories(self, client, db_session):
        """Test ending sprint moves non-done stories to backlog"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Active Sprint",
            project_id=project.id,
            status="active",
            is_active=1
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Add non-done story
        ready_story = UserStory(
            story_id="US-1",
            title="Ready Story",
            description="Test",
            project_id=project.id,
            sprint_id=sprint.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(ready_story)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == status.HTTP_200_OK
        
        # Verify story moved back to backlog
        db_session.refresh(ready_story)
        assert ready_story.sprint_id is None
        assert ready_story.status == "backlog"
    
    def test_end_sprint_with_mixed_story_statuses(self, client, db_session):
        """Test ending sprint with mix of done and non-done stories"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint",
            project_id=project.id,
            status="active",
            is_active=1
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Add multiple stories with different statuses
        stories_data = [
            ("US-1", "done", "done"),
            ("US-2", "in_progress", "backlog"),
            ("US-3", "ready", "backlog"),
            ("US-4", "done", "done"),
        ]
        
        stories = []
        for story_id, story_status, expected_status in stories_data:
            story = UserStory(
                story_id=story_id,
                title=f"Story {story_id}",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status=story_status,
                effort=5,
                business_value=8
            )
            db_session.add(story)
            stories.append((story, expected_status))
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == status.HTTP_200_OK
        
        # Verify each story has correct final state
        for story, expected_status in stories:
            db_session.refresh(story)
            if expected_status == "done":
                assert story.sprint_id == sprint.id
                assert story.status == "done"
            else:
                assert story.sprint_id is None
                assert story.status == "backlog"


class TestReopenSprintBranches:
    """Test all branches in reopen_sprint endpoint"""
    
    def test_reopen_nonexistent_sprint_404(self, client):
        """Test reopening non-existent sprint returns 404"""
        response = client.post("/api/sprints/99999/reopen")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_reopen_non_closed_sprint_400(self, client, db_session):
        """Test reopening non-closed sprint returns 400"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Active Sprint",
            project_id=project.id,
            status="active"
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/reopen")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "closed sprints" in response.json()["detail"].lower()
    
    def test_reopen_closed_sprint_no_active_sprint(self, client, db_session):
        """Test reopening closed sprint when no other sprint is active"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Closed Sprint",
            project_id=project.id,
            status="closed",
            is_active=0,
            end_date=datetime.now(UTC)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/reopen")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "active"
        assert data["is_active"] == 1
        assert data["end_date"] is None
    
    def test_reopen_closed_sprint_with_active_sprint_400(self, client, db_session):
        """Test reopening closed sprint when another is active returns 400"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create active sprint
        active_sprint = Sprint(
            name="Currently Active",
            project_id=project.id,
            status="active",
            is_active=1
        )
        db_session.add(active_sprint)
        
        # Create closed sprint to reopen
        closed_sprint = Sprint(
            name="Closed Sprint",
            project_id=project.id,
            status="closed",
            is_active=0,
            end_date=datetime.now(UTC)
        )
        db_session.add(closed_sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{closed_sprint.id}/reopen")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "currently active" in response.json()["detail"].lower()
    
    def test_reopen_not_started_sprint_400(self, client, db_session):
        """Test reopening not_started sprint returns 400"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Not Started Sprint",
            project_id=project.id,
            status="not_started"
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/reopen")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestGetAllSprintsBranches:
    """Test all branches in get_sprints endpoint"""
    
    def test_get_sprints_empty_list(self, client, db_session):
        """Test getting sprints when database is empty"""
        response = client.get("/api/sprints")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_get_sprints_with_multiple_sprints(self, client, db_session):
        """Test getting sprints with multiple sprints in database"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprints_data = [
            ("Sprint 1", "not_started"),
            ("Sprint 2", "active"),
            ("Sprint 3", "closed"),
        ]
        
        for name, sprint_status in sprints_data:
            sprint = Sprint(
                name=name,
                project_id=project.id,
                status=sprint_status
            )
            db_session.add(sprint)
        db_session.commit()
        
        response = client.get("/api/sprints")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        
        # Verify all sprints are returned
        names = [s["name"] for s in data]
        assert "Sprint 1" in names
        assert "Sprint 2" in names
        assert "Sprint 3" in names


class TestSprintEdgeCases:
    """Test edge cases and complex scenarios"""
    
    def test_start_and_end_sprint_sequence(self, client, db_session):
        """Test starting then ending a sprint"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint",
            project_id=project.id,
            status="not_started"
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Start sprint
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == status.HTTP_200_OK
        
        # Add story
        story = UserStory(
            story_id="US-1",
            title="Story",
            description="Test",
            project_id=project.id,
            sprint_id=sprint.id,
            status="in_progress",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # End sprint
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "closed"
        
        # Verify story moved back
        db_session.refresh(story)
        assert story.sprint_id is None
        assert story.status == "backlog"
    
    def test_sprint_lifecycle_complete(self, client, db_session):
        """Test complete sprint lifecycle: create -> start -> end -> reopen"""
        from database import Project, Sprint
        
        project = Project(name="Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create
        payload = {
            "name": "Lifecycle Sprint",
            "project_id": project.id,
            "status": "not_started"
        }
        response = client.post("/api/sprints", json=payload)
        assert response.status_code == status.HTTP_200_OK
        sprint_data = response.json()
        sprint_id = sprint_data["id"]
        
        # Start
        response = client.post(f"/api/sprints/{sprint_id}/start")
        assert response.status_code == status.HTTP_200_OK
        
        # End
        response = client.post(f"/api/sprints/{sprint_id}/end")
        assert response.status_code == status.HTTP_200_OK
        
        # Reopen
        response = client.post(f"/api/sprints/{sprint_id}/reopen")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "active"
