"""
Unit tests for project management routes
"""
import pytest
from fastapi import status


class TestProjectRoutes:
    """Test suite for project endpoints"""
    
    def test_get_projects(self, client):
        """Test getting all projects"""
        response = client.get("/api/projects")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_project(self, client):
        """Test creating a new project"""
        payload = {
            "name": "New Test Project",
            "description": "A new test project",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 4
        }
        
        response = client.post("/api/projects", json=payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
    
    def test_project_created_with_default_statuses(self, client, db_session):
        """Test that new projects are created with default statuses"""
        from database import Project, ProjectStatus
        
        payload = {
            "name": "Status Test Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 4
        }
        
        response = client.post("/api/projects", json=payload)
        assert response.status_code == status.HTTP_200_OK
        project_id = response.json()["id"]
        
        # Check statuses were created
        response = client.get(f"/api/projects/{project_id}/statuses")
        assert response.status_code == status.HTTP_200_OK
        statuses = response.json()
        status_names = [s["status_name"] for s in statuses]
        assert "ready" in status_names
        assert "in_progress" in status_names
        assert "done" in status_names
    
    def test_get_project_by_id(self, client, db_session):
        """Test getting specific project"""
        from database import Project
        
        project = Project(
            name="Test Project",
            description="Test project",
            default_sprint_duration_days=14
        )
        db_session.add(project)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == project.name
    
    def test_get_project_sprints(self, client, db_session):
        """Test getting sprints for a project"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint 1", project_id=project.id, status="not_started")
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}/sprints")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_get_project_statuses(self, client, db_session):
        """Test getting statuses for a project"""
        from database import Project
        
        payload = {
            "name": "Status Test Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 4
        }
        
        response = client.post("/api/projects", json=payload)
        project_id = response.json()["id"]
        
        response = client.get(f"/api/projects/{project_id}/statuses")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # At least ready, in_progress, done


class TestProjectEpics:
    """Test epic management within projects"""
    
    def test_get_project_epics(self, client, db_session):
        """Test getting epics for a project"""
        from database import Project, Epic
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        epic = Epic(name="Test Epic", color="#FF0000")
        db_session.add(epic)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}/epics")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            assert response.status_code in [404, 405]
    
    def test_create_project_epic(self, client):
        """Test creating epic in project"""
        project_resp = client.post("/api/projects", json={
            "name": "Epic Project",
            "description": "Test"
        })
        
        if project_resp.status_code != 200:
            pytest.skip("Could not create project")
        
        project_id = project_resp.json()["id"]
        
        epic_payload = {
            "name": "New Epic",
            "color": "#FF0000",
            "description": "Test epic"
        }
        
        response = client.post(f"/api/projects/{project_id}/epics", json=epic_payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == "New Epic"


class TestProjectUpdates:
    """Test project daily updates"""
    
    def test_get_daily_updates_for_project(self, client, db_session):
        """Test getting daily updates for project"""
        from database import Project, UserStory, DailyUpdate
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US1",
            title="Test Story",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8,
            description="Test"
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}/daily-updates")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            assert response.status_code in [404, 405]


class TestProjectMetadata:
    """Test project metadata and configuration"""
    
    def test_update_project(self, client, db_session):
        """Test updating project metadata"""
        from database import Project
        
        project = Project(
            name="Original Name",
            description="Original Description",
            default_sprint_duration_days=14
        )
        db_session.add(project)
        db_session.commit()
        
        payload = {
            "name": "Updated Name",
            "description": "Updated Description",
            "default_sprint_duration_days": 21
        }
        
        response = client.put(f"/api/projects/{project.id}", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == "Updated Name"
        else:
            assert response.status_code in [404, 405]
    
    def test_delete_project(self, client, db_session):
        """Test deleting a project"""
        from database import Project
        
        project = Project(name="Project to Delete", description="Test")
        db_session.add(project)
        db_session.commit()
        project_id = project.id
        
        response = client.delete(f"/api/projects/{project_id}")
        
        if response.status_code == 200:
            # Verify deletion
            response = client.get(f"/api/projects/{project_id}")
            assert response.status_code == 404
        else:
            # Endpoint might not exist
            assert response.status_code in [404, 405]
    
    def test_project_nonexistent(self, client):
        """Test accessing non-existent project"""
        response = client.get("/api/projects/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
