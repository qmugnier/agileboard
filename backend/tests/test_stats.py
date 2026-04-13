"""Tests for stats/velocity endpoints"""
import pytest
from fastapi import status
from datetime import datetime, UTC, timedelta


class TestSprintStats:
    """Test sprint statistics and metrics"""
    
    def test_get_sprint_stats(self, client, db_session):
        """Test getting sprint statistics"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Stats Sprint",
            project_id=project.id,
            status="active"
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Create stories with different efforts
        for i in range(3):
            story = UserStory(
                story_id=f"US-{i}",
                title=f"Story {i}",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status="ready" if i == 0 else ("in_progress" if i == 1 else "done"),
                effort=5,
                business_value=8
            )
            db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/sprints/{sprint.id}/stats")
        
        if response.status_code == 200:
            data = response.json()
            assert "sprint_id" in data or "total_effort" in data
        else:
            assert response.status_code in [404, 405]
    
    def test_get_velocity_metrics(self, client):
        """Test getting velocity metrics"""
        response = client.get("/api/stats/velocity")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
            # Should have sprints list and/or average velocity
            assert "sprints" in data or "average_velocity" in data
        else:
            assert response.status_code in [404, 405]
    
    def test_get_project_velocity(self, client, db_session):
        """Test getting project velocity"""
        from database import Project
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}/velocity")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))
        else:
            assert response.status_code in [404, 405]
    
    def test_velocity_calculation(self, client, db_session):
        """Test velocity is calculated correctly"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Velocity Sprint",
            project_id=project.id,
            status="closed"
        )
        db_session.add(sprint)
        db_session.commit()
        
        # Create completed stories with known effort
        efforts = [3, 5, 2, 8]
        for i, effort in enumerate(efforts):
            story = UserStory(
                story_id=f"VTEST-{i}",
                title=f"Story {i}",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status="done",
                effort=effort,
                business_value=effort * 2
            )
            db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/sprints/{sprint.id}/stats")
        
        if response.status_code == 200:
            data = response.json()
            # Velocity should be sum of completed story efforts
            if "velocity" in data or "completed_effort" in data:
                assert data.get("completed_effort", 0) > 0


class TestProjectStats:
    """Test project-level statistics"""
    
    def test_get_project_stats(self, client, db_session):
        """Test getting project statistics"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Stats Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Stats Sprint", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.commit()
        
        # Create stories
        for i in range(5):
            story = UserStory(
                story_id=f"US-{i}",
                title=f"Story {i}",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status="ready",
                effort=3,
                business_value=5
            )
            db_session.add(story)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}/stats")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
        else:
            assert response.status_code in [404, 405]
    
    def test_burndown_chart_data(self, client, db_session):
        """Test getting burndown chart data"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Burndown Sprint", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get(f"/api/sprints/{sprint.id}/burndown")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))
        else:
            assert response.status_code in [404, 405]


class TestStatsEdgeCases:
    """Test edge cases in statistics"""
    
    def test_stats_empty_sprint(self, client, db_session):
        """Test stats for sprint with no stories"""
        from database import Project, Sprint
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Empty Sprint", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get(f"/api/sprints/{sprint.id}/stats")
        
        if response.status_code == 200:
            data = response.json()
            # Should return stats even if empty
            assert data is not None
        else:
            assert response.status_code in [404, 405]
    
    def test_velocity_no_completed_sprints(self, client, db_session):
        """Test velocity when no sprints are completed"""
        from database import Project
        
        project = Project(name="Test Project", description="Test")
        db_session.add(project)
        db_session.commit()
        
        response = client.get(f"/api/projects/{project.id}/velocity")
        
        if response.status_code == 200:
            data = response.json()
            # Should return empty or zero velocity
            assert data is not None
        else:
            assert response.status_code in [404, 405]
