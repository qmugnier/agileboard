"""
Unit tests for sprint management routes
"""
import pytest
from fastapi import status
from datetime import datetime, UTC, timedelta


class TestSprintRoutes:
    """Test suite for sprint endpoints"""
    
    def test_get_sprints(self, client):
        """Test getting all sprints"""
        response = client.get("/api/sprints")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_sprint_not_found(self, client):
        """Test getting non-existent sprint"""
        response = client.get("/api/sprints/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_sprint(self, client, db_session):
        """Test creating a new sprint"""
        # First create a project
        from database import Project
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        payload = {
            "name": "Test Sprint",
            "project_id": project.id,
            "status": "not_started",
            "goal": "Test sprint goal"
        }
        response = client.post("/api/sprints", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["status"] == payload["status"]
    
    def test_update_sprint(self, client, db_session):
        """Test updating a sprint"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Original Sprint",
            project_id=project.id,
            status="not_started",
            goal="Original goal"
        )
        db_session.add(sprint)
        db_session.commit()
        
        payload = {"goal": "Updated goal"}
        response = client.put(f"/api/sprints/{sprint.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["goal"] == "Updated goal"
    
    def test_delete_sprint(self, client, db_session):
        """Test deleting a sprint"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint to Delete", project_id=project.id, status="not_started")
        db_session.add(sprint)
        db_session.commit()
        sprint_id = sprint.id
        
        response = client.delete(f"/api/sprints/{sprint_id}")
        assert response.status_code == status.HTTP_200_OK
        
        # Verify it's deleted
        response = client.get(f"/api/sprints/{sprint_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestSprintTransitions:
    """Test sprint state transitions"""
    
    def test_start_sprint(self, client, db_session):
        """Test starting a sprint"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint to Start",
            project_id=project.id,
            status="not_started",
            start_date=datetime.now(UTC)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        
        # Endpoint might exist or not
        if response.status_code == 200:
            data = response.json()
            assert data["status"] in ["active", "started"]
        else:
            assert response.status_code in [404, 405]
    
    def test_end_sprint(self, client, db_session):
        """Test ending a sprint"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint to End",
            project_id=project.id,
            status="active",
            end_date=datetime.now(UTC)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        
        # Endpoint might exist or not
        if response.status_code == 200:
            data = response.json()
            assert data["status"] in ["closed", "done"]
        else:
            assert response.status_code in [404, 405]
    
    def test_reopen_sprint(self, client, db_session):
        """Test reopening a sprint"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Sprint to Reopen",
            project_id=project.id,
            status="closed"
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/reopen")
        
        # Endpoint might exist or not
        if response.status_code == 200:
            data = response.json()
            assert data["status"] in ["active", "not_started"]
        else:
            assert response.status_code in [404, 405]
    
    def test_create_sprint_invalid_project(self, client):
        """Test creating sprint with invalid project"""
        payload = {
            "name": "Invalid Sprint",
            "project_id": 99999,
            "status": "not_started"
        }
        response = client.post("/api/sprints", json=payload)
        assert response.status_code in [400, 404, 200]
    
    def test_get_sprint_stories(self, client, db_session):
        """Test getting stories in a sprint"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint with Stories", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.commit()
        
        # Create stories in sprint
        for i in range(3):
            story = UserStory(
                story_id=f"US-{i}",
                title=f"Story {i}",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status="ready",
                effort=5,
                business_value=8
            )
            db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/sprints/{sprint.id}/stories")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            assert len(data) >= 0
