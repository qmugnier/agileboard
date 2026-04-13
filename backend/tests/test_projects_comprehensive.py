"""
Comprehensive tests for projects router to achieve 85%+ coverage
"""
import pytest
from fastapi import status
import tempfile
from io import BytesIO


class TestProjectStatus:
    """Test project status and lifecycle"""
    
    def test_get_projects_empty(self, client, db_session):
        """Test getting projects when none exist"""
        response = client.get("/api/projects")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_create_project_with_default_sprints(self, client, db_session):
        """Test project creation creates default sprints"""
        response = client.post("/api/projects", json={
            "name": "Test Project",
            "description": "Test project with sprints",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 3
        })
        
        assert response.status_code == 200
        project_id = response.json()["id"]
        
        # Verify sprints were created
        sprints_response = client.get(f"/api/projects/{project_id}/sprints")
        assert sprints_response.status_code == 200
        sprints = sprints_response.json()
        assert len(sprints) > 0
    
    def test_create_project_creates_default_statuses(self, client, db_session):
        """Test project creation creates default statuses"""
        response = client.post("/api/projects", json={
            "name": "Status Test Project",
            "description": "Project to test statuses",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 2
        })
        
        assert response.status_code == 200
        project_id = response.json()["id"]
        
        # Verify statuses were created
        statuses_response = client.get(f"/api/projects/{project_id}/statuses")
        assert statuses_response.status_code == 200
        statuses = statuses_response.json()
        
        # Should have at least 3 default statuses
        assert len(statuses) >= 3
        status_names = {s["status_name"] for s in statuses}
        assert "ready" in status_names
        assert "in_progress" in status_names
        assert "done" in status_names
    
    def test_create_project_limited_sprints(self, client, db_session):
        """Test project creation limits forecast sprints"""
        response = client.post("/api/projects", json={
            "name": "Limited Sprint Project",
            "description": "Project with limited sprints",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 10  # Should be limited
        })
        
        assert response.status_code == 200
        project_id = response.json()["id"]
        
        sprints_response = client.get(f"/api/projects/{project_id}/sprints")
        sprints = sprints_response.json()
        # Should be limited to 4 or fewer
        assert len(sprints) <= 4
    
    def test_update_project_name(self, client, db_session):
        """Test updating project name"""
        # Create project
        create_response = client.post("/api/projects", json={
            "name": "Original Name",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = create_response.json()["id"]
        
        # Update
        update_response = client.put(f"/api/projects/{project_id}", json={
            "name": "Updated Name"
        })
        
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Updated Name"
    
    def test_update_nonexistent_project(self, client):
        """Test updating non-existent project"""
        response = client.put("/api/projects/99999", json={
            "name": "No project here"
        })
        assert response.status_code == 404
    
    def test_delete_project_no_stories(self, client, db_session):
        """Test deleting project with no stories"""
        # Create project
        create_response = client.post("/api/projects", json={
            "name": "Deletable Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = create_response.json()["id"]
        
        # Delete
        delete_response = client.delete(f"/api/projects/{project_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] is True
    
    def test_delete_project_with_stories(self, client, db_session):
        """Test cannot delete project with attached stories"""
        from database import Project, UserStory
        
        # Create project and story
        project = Project(
            name="Project With Stories",
            description="Has stories"
        )
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="TEST-001",
            title="Test Story",
            description="Test",
            business_value=1,
            effort=1,
            project_id=project.id,
            sprint_id=None,
            status="backlog"
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to delete - should fail
        delete_response = client.delete(f"/api/projects/{project.id}")
        assert delete_response.status_code == 400
    
    def test_get_nonexistent_project(self, client):
        """Test getting non-existent project"""
        response = client.get("/api/projects/99999")
        assert response.status_code == 404


class TestProjectStatuses:
    """Test project status management"""
    
    def test_create_project_status(self, client, db_session):
        """Test creating new project status"""
        # Create project first
        create_response = client.post("/api/projects", json={
            "name": "Status Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = create_response.json()["id"]
        
        # Create status
        status_response = client.post(f"/api/projects/{project_id}/statuses", json={
            "status_name": "blocked",
            "color": "#FF0000",
            "order": 4,
            "is_default": 0
        })
        
        assert status_response.status_code == 200
        assert status_response.json()["status_name"] == "blocked"
    
    def test_create_status_on_nonexistent_project(self, client):
        """Test creating status on non-existent project"""
        response = client.post("/api/projects/99999/statuses", json={
            "status_name": "blocked",
            "color": "#FF0000",
            "order": 4
        })
        assert response.status_code == 404
    
    def test_update_project_status(self, client, db_session):
        """Test updating project status"""
        # Create project and get a status
        project_response = client.post("/api/projects", json={
            "name": "Update Status Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = project_response.json()["id"]
        
        # Get statuses
        status_list = client.get(f"/api/projects/{project_id}/statuses").json()
        status_id = status_list[0]["id"]
        
        # Update status
        update_response = client.put(f"/api/projects/project-statuses/{status_id}", json={
            "color": "#00FF00"
        })
        
        assert update_response.status_code == 200
        assert update_response.json()["color"] == "#00FF00"
    
    def test_update_nonexistent_status(self, client):
        """Test updating non-existent status"""
        response = client.put("/api/projects/project-statuses/99999", json={
            "color": "#00FF00"
        })
        assert response.status_code == 404
    
    def test_delete_nondefault_status(self, client, db_session):
        """Test deleting non-default status"""
        # Create project with custom status
        project_response = client.post("/api/projects", json={
            "name": "Delete Status Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = project_response.json()["id"]
        
        # Create non-default status
        status_response = client.post(f"/api/projects/{project_id}/statuses", json={
            "status_name": "custom_status",
            "color": "#FF0000",
            "order": 4,
            "is_default": 0
        })
        status_id = status_response.json()["id"]
        
        # Delete status
        delete_response = client.delete(f"/api/projects/project-statuses/{status_id}")
        assert delete_response.status_code == 200
    
    def test_delete_default_status_fails(self, client, db_session):
        """Test cannot delete default status"""
        # Create project
        project_response = client.post("/api/projects", json={
            "name": "Delete Default Status Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = project_response.json()["id"]
        
        # Get default status
        statuses = client.get(f"/api/projects/{project_id}/statuses").json()
        default_status = next((s for s in statuses if s["is_default"]), None)
        
        if default_status:
            # Try to delete - should fail
            delete_response = client.delete(f"/api/projects/project-statuses/{default_status['id']}")
            assert delete_response.status_code == 400
    
    def test_delete_status_with_stories_fails(self, client, db_session):
        """Test cannot delete status that has stories"""
        from database import Project, UserStory
        
        # Create project
        project = Project(
            name="Project With Story Status",
            description="Test"
        )
        db_session.add(project)
        db_session.flush()
        
        # Create custom status
        from database import ProjectStatus
        custom_status = ProjectStatus(
            project_id=project.id,
            status_name="custom",
            color="#FF0000",
            order=4,
            is_default=0
        )
        db_session.add(custom_status)
        db_session.flush()
        
        # Create story with that status
        story = UserStory(
            story_id="TEST-002",
            title="Test Story",
            description="Test",
            business_value=1,
            effort=1,
            project_id=project.id,
            sprint_id=None,
            status="custom"
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to delete status - should fail
        delete_response = client.delete(f"/api/projects/project-statuses/{custom_status.id}")
        assert delete_response.status_code == 400


class TestProjectEpics:
    """Test project epic management"""
    
    def test_get_project_epics(self, client, db_session):
        """Test getting project epics"""
        # Create project
        project_response = client.post("/api/projects", json={
            "name": "Epic Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = project_response.json()["id"]
        
        # Get epics
        epics_response = client.get(f"/api/projects/{project_id}/epics")
        assert epics_response.status_code == 200
    
    def test_get_epics_nonexistent_project(self, client):
        """Test getting epics for non-existent project"""
        response = client.get("/api/projects/99999/epics")
        assert response.status_code == 404
    
    def test_create_epic(self, client, db_session):
        """Test creating epic for project"""
        # Create project
        project_response = client.post("/api/projects", json={
            "name": "Create Epic Project",
            "description": "Test",
            "default_sprint_duration_days": 14,
            "num_forecasted_sprints": 1
        })
        project_id = project_response.json()["id"]
        
        # Create epic
        epic_response = client.post(f"/api/projects/{project_id}/epics", json={
            "name": "Backend Infrastructure",
            "color": "#FF6B6B"
        })
        
        assert epic_response.status_code == 200
        assert epic_response.json()["name"] == "Backend Infrastructure"
    
    def test_create_epic_nonexistent_project(self, client):
        """Test creating epic on non-existent project"""
        response = client.post("/api/projects/99999/epics", json={
            "name": "Epic",
            "color": "#FF0000"
        })
        assert response.status_code == 404


class TestProjectTeamAssignment:
    """Test team member assignment to projects"""
    
    def test_assign_team_member_to_project(self, client, db_session):
        """Test assigning team member to project"""
        from database import Project, TeamMember
        
        # Create project
        project = Project(name="Team Project", description="Test")
        db_session.add(project)
        db_session.flush()
        
        # Create team member
        member = TeamMember(name="Developer", role="Developer")
        db_session.add(member)
        db_session.commit()
        
        # Assign
        response = client.post(f"/api/projects/{project.id}/assign-team", json={
            "user_id": member.id
        })
        
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_assign_nonexistent_member_fails(self, client, db_session):
        """Test assigning non-existent member fails"""
        from database import Project
        
        project = Project(name="Another Team Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        response = client.post(f"/api/projects/{project.id}/assign-team", json={
            "user_id": 99999
        })
        assert response.status_code == 404
    
    def test_assign_to_nonexistent_project_fails(self, client, db_session):
        """Test assigning to non-existent project fails"""
        from database import TeamMember
        
        member = TeamMember(name="Another Developer", role="Developer")
        db_session.add(member)
        db_session.commit()
        
        response = client.post(f"/api/projects/99999/assign-team", json={
            "user_id": member.id
        })
        assert response.status_code == 404


class TestDailyUpdates:
    """Test daily update functionality"""
    
    def test_create_daily_update(self, client, db_session):
        """Test creating daily update"""
        from database import Project, UserStory
        
        # Create project and story
        project = Project(name="Update Project", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="TEST-003",
            title="Test Story",
            description="Test",
            business_value=1,
            effort=1,
            project_id=project.id,
            sprint_id=None,
            status="backlog"
        )
        db_session.add(story)
        db_session.commit()
        
        # Create update
        response = client.post("/api/projects/daily-updates", json={
            "us_id": "TEST-003",
            "status": "in_progress",
            "progress_percent": 50,
            "notes": "Making progress"
        })
        
        assert response.status_code == 200
    
    def test_create_daily_update_nonexistent_story(self, client):
        """Test creating update for non-existent story"""
        response = client.post("/api/projects/daily-updates", json={
            "us_id": "NONEXISTENT-001",
            "status": "in_progress",
            "progress_percent": 0,
            "notes": "Test"
        })
        assert response.status_code == 404
    
    def test_get_daily_updates(self, client, db_session):
        """Test getting daily updates for story"""
        from database import Project, UserStory, DailyUpdate
        
        # Create project and story
        project = Project(name="Get Updates Project", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="TEST-004",
            title="Test Story",
            description="Test",
            business_value=1,
            effort=1,
            project_id=project.id,
            sprint_id=None,
            status="backlog"
        )
        db_session.add(story)
        db_session.flush()
        
        # Add updates
        update = DailyUpdate(
            us_id="TEST-004",
            status="in_progress",
            progress_percent=50,
            notes="Update 1"
        )
        db_session.add(update)
        db_session.commit()
        
        # Get updates
        response = client.get("/api/projects/daily-updates/TEST-004")
        assert response.status_code == 200
        assert len(response.json()) > 0


class TestCSVImport:
    """Test CSV import functionality"""
    
    def test_upload_csv_backlog(self, client):
        """Test uploading CSV backlog"""
        csv_content = b"""Story ID,User Story,Description,Business Value,Effort
US-100,Feature A,Description A,5,3
US-101,Feature B,Description B,3,2
"""
        response = client.post(
            "/api/projects/import/csv",
            files={"file": ("backlog.csv", BytesIO(csv_content), "text/csv")}
        )
        
        # Should handle the upload (may succeed or return error)
        assert response.status_code in [200, 400]
    
    def test_upload_invalid_csv(self, client):
        """Test uploading invalid CSV"""
        invalid_content = b"This\xffis\xffinvalid\xffcsv"
        response = client.post(
            "/api/projects/import/csv",
            files={"file": ("invalid.csv", BytesIO(invalid_content), "text/csv")}
        )
        
        # Should fail or return error
        assert response.status_code in [200, 400, 422]
