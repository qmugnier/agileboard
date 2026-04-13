"""Comprehensive tests for stats router - targeting 85% branch coverage"""
import pytest
from datetime import datetime, UTC


class TestStatsVelocityBranches:
    """Tests for velocity metrics branches"""
    
    def test_velocity_with_empty_sprints(self, client):
        """Get velocity when no sprints exist"""
        response = client.get("/api/stats/velocity")
        assert response.status_code == 200
        data = response.json()
        assert data["sprints"] == []
        assert data["average_velocity"] == 0
    
    def test_velocity_single_sprint_no_stories(self, client, db_session):
        """Calculate velocity for sprint with no stories"""
        from database import Project, Sprint
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint 1", project_id=project.id, status="closed")
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get("/api/stats/velocity")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sprints"]) == 1
        assert data["sprints"][0]["total_effort"] == 0
        assert data["sprints"][0]["completion_percent"] == 0
    
    def test_velocity_multiple_sprints_with_varying_efforts(self, client, db_session):
        """Calculate velocity across multiple sprints with different efforts"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create 3 sprints with different velocities
        sprints = []
        for i in range(3):
            sprint = Sprint(name=f"Sprint {i+1}", project_id=project.id, status="closed")
            db_session.add(sprint)
            db_session.flush()
            sprints.append(sprint)
            
            # Add stories with different completion
            for j in range(2):
                story = UserStory(
                    story_id=f"US-{i}-{j}",
                    title="Test",
                    description="Test",
                    project_id=project.id,
                    sprint_id=sprint.id,
                    status="done" if j == 0 else "in_progress",
                    effort=5,
                    business_value=8
                )
                db_session.add(story)
        
        db_session.commit()
        
        response = client.get("/api/stats/velocity")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sprints"]) == 3
        # Average velocity should be calculated
        assert data["average_velocity"] > 0
    
    def test_velocity_trend_calculation_up(self, client, db_session):
        """Test trend calculation when velocity increases"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create 2 sprints with increasing velocity
        for i in range(2):
            sprint = Sprint(name=f"Sprint {i+1}", project_id=project.id, status="closed")
            db_session.add(sprint)
            db_session.flush()
            
            # First sprint: 5 effort done, second sprint: 10 effort done
            effort_to_complete = (i + 1) * 5
            for j in range(2):
                story = UserStory(
                    story_id=f"TREND_UP-{i}-{j}",
                    title="Test",
                    description="Test",
                    project_id=project.id,
                    sprint_id=sprint.id,
                    status="done" if j == 0 else "backlog",
                    effort=effort_to_complete,
                    business_value=8
                )
                db_session.add(story)
        
        db_session.commit()
        
        response = client.get("/api/stats/velocity")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sprints"]) == 2
        # Trend should be "up" if second sprint velocity > first
        assert data["trend"] in ["up", "down"]
    
    def test_velocity_trend_calculation_down(self, client, db_session):
        """Test trend calculation when velocity decreases"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create 2 sprints with decreasing velocity
        velocities = [20, 10]
        for i, vel in enumerate(velocities):
            sprint = Sprint(name=f"Sprint {i+1}", project_id=project.id, status="closed")
            db_session.add(sprint)
            db_session.flush()
            
            story = UserStory(
                story_id=f"TREND_DOWN-{i}",
                title="Test",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status="done",
                effort=vel,
                business_value=8
            )
            db_session.add(story)
        
        db_session.commit()
        
        response = client.get("/api/stats/velocity")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sprints"]) == 2
        assert data["trend"] == "down"
    
    def test_velocity_completion_percent_calculation(self, client, db_session):
        """Test completion percentage across different scenarios"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Sprint", project_id=project.id, status="closed")
        db_session.add(sprint)
        db_session.flush()
        
        # Add stories: 50% done, 25% in_progress, 25% backlog
        for i, status in enumerate(["done", "done", "in_progress", "backlog"]):
            story = UserStory(
                story_id=f"PERCENT-{i}",
                title="Test",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status=status,
                effort=5,
                business_value=8
            )
            db_session.add(story)
        
        db_session.commit()
        
        response = client.get("/api/stats/velocity")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sprints"][0]["completion_percent"] in [40, 50]  # 10 out of 20


class TestStatsActiveSprint:
    """Tests for active sprint statistics"""
    
    def test_get_active_sprint_no_active(self, client, db_session):
        """Get active sprint when none exists"""
        from database import Project, Sprint
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Not Active", project_id=project.id, status="not_started")
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get("/api/stats/active-sprint")
        assert response.status_code == 404
        assert "No active sprint" in response.json()["detail"]
    
    def test_get_active_sprint_with_no_stories(self, client, db_session):
        """Get active sprint stats with no stories"""
        from database import Project, Sprint
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(
            name="Active Sprint",
            project_id=project.id,
            status="active",
            goal="Test goal"
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.get("/api/stats/active-sprint")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sprint_name"] == "Active Sprint"
        assert data["goal"] == "Test goal"
        assert data["total_stories"] == 0
        assert data["status_breakdown"]["backlog"] == 0
    
    def test_get_active_sprint_with_mixed_status_stories(self, client, db_session):
        """Get active sprint stats with stories in different states"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Active", project_id=project.id, status="active", goal="Complete features")
        db_session.add(sprint)
        db_session.flush()
        
        # Add stories in different statuses
        statuses = ["ready", "in_progress", "done", "backlog"]
        for i, status in enumerate(statuses):
            story = UserStory(
                story_id=f"ACTIVE-{i}",
                title="Test",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status=status,
                effort=5,
                business_value=8
            )
            db_session.add(story)
        
        db_session.commit()
        
        response = client.get("/api/stats/active-sprint")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_stories"] == 4
        assert data["status_breakdown"]["ready"] == 1
        assert data["status_breakdown"]["in_progress"] == 1
        assert data["status_breakdown"]["done"] == 1
        assert data["status_breakdown"]["backlog"] == 1
    
    def test_get_active_sprint_effort_breakdown(self, client, db_session):
        """Test effort breakdown for active sprint"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint = Sprint(name="Active", project_id=project.id, status="active")
        db_session.add(sprint)
        db_session.flush()
        
        # Add stories with different efforts
        efforts = [
            ("done", 8),
            ("in_progress", 5),
            ("ready", 3),
        ]
        
        for i, (status, effort) in enumerate(efforts):
            story = UserStory(
                story_id=f"EFFORT-{i}",
                title="Test",
                description="Test",
                project_id=project.id,
                sprint_id=sprint.id,
                status=status,
                effort=effort,
                business_value=8
            )
            db_session.add(story)
        
        db_session.commit()
        
        response = client.get("/api/stats/active-sprint")
        assert response.status_code == 200
        data = response.json()
        
        assert data["effort_breakdown"]["total"] == 16
        assert data["effort_breakdown"]["completed"] == 8
        assert data["effort_breakdown"]["in_progress"] == 5
        assert data["effort_breakdown"]["remaining"] == 3
    
    def test_multiple_active_sprints_gets_first(self, client, db_session):
        """Test that .first() returns one sprint when multiple exist"""
        from database import Project, Sprint
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create multiple active sprints
        for i in range(2):
            sprint = Sprint(name=f"Active {i}", project_id=project.id, status="active")
            db_session.add(sprint)
        
        db_session.commit()
        
        response = client.get("/api/stats/active-sprint")
        assert response.status_code == 200
        data = response.json()
        
        # Should return one of them
        assert "sprint_id" in data
        assert "sprint_name" in data
