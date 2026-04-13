"""
Comprehensive tests for sprints and interactions routers - target 85%+ coverage
"""
import pytest
from datetime import datetime, UTC, timedelta


class TestSprintStartConditions:
    """Test sprint start endpoint with all branch conditions"""
    
    def test_start_already_active_sprint(self, client, db_session):
        """Test cannot start an already active sprint"""
        from database import Project, Sprint
        
        project = Project(name="Sprint Start Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        # Create active sprint
        sprint = Sprint(
            project_id=project.id,
            name="Active Sprint",
            status="active",
            is_active=1,
            start_date=datetime.now(UTC),
            end_date=datetime.now(UTC) + timedelta(days=14)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == 400
        assert "already active" in response.json()["detail"].lower()
    
    def test_start_closed_sprint_fails(self, client, db_session):
        """Test cannot start a closed sprint"""
        from database import Project, Sprint
        
        project = Project(name="Sprint Close Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        # Create closed sprint
        sprint = Sprint(
            project_id=project.id,
            name="Closed Sprint",
            status="closed",
            is_active=0,
            start_date=datetime.now(UTC) - timedelta(days=28),
            end_date=datetime.now(UTC) - timedelta(days=14)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == 400
        assert "closed" in response.json()["detail"].lower()
    
    def test_start_when_another_sprint_active(self, client, db_session):
        """Test cannot start sprint when another is already active in same project"""
        from database import Project, Sprint
        
        project = Project(name="Multi Sprint Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        # Create active sprint
        active = Sprint(
            project_id=project.id,
            name="Really Active Sprint",
            status="active",
            is_active=1,
            start_date=datetime.now(UTC),
            end_date=datetime.now(UTC) + timedelta(days=14)
        )
        db_session.add(active)
        db_session.flush()
        
        # Create not-started sprint
        not_started = Sprint(
            project_id=project.id,
            name="Not Started Sprint",
            status="not_started",
            is_active=0,
            start_date=datetime.now(UTC) + timedelta(days=14),
            end_date=datetime.now(UTC) + timedelta(days=28)
        )
        db_session.add(not_started)
        db_session.commit()
        
        # Try to start not_started sprint - should fail
        response = client.post(f"/api/sprints/{not_started.id}/start")
        assert response.status_code == 400
        assert "already active" in response.json()["detail"].lower()
    
    def test_start_sets_end_date_if_missing(self, client, db_session):
        """Test starting sprint sets end_date if not already set"""
        from database import Project, Sprint
        
        project = Project(
            name="Sprint End Date Test",
            description="Test",
            default_sprint_duration_days=14
        )
        db_session.add(project)
        db_session.flush()
        
        # Create sprint without end_date
        sprint = Sprint(
            project_id=project.id,
            name="No End Date Sprint",
            status="not_started",
            is_active=0,
            start_date=datetime.now(UTC),
            end_date=None
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == 200
        
        db_session.refresh(sprint)
        assert sprint.end_date is not None
    
    def test_start_sprint_success(self, client, db_session):
        """Test successfully starting a sprint"""
        from database import Project, Sprint
        
        project = Project(name="Successful Sprint Start", description="Test")
        db_session.add(project)
        db_session.flush()
        
        sprint = Sprint(
            project_id=project.id,
            name="To Start",
            status="not_started",
            is_active=0
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/start")
        assert response.status_code == 200
        assert response.json()["status"] == "active"


class TestSprintEndConditions:
    """Test sprint end endpoint with various conditions"""
    
    def test_end_non_active_sprint(self, client, db_session):
        """Test cannot end a sprint that's not active"""
        from database import Project, Sprint
        
        project = Project(name="Sprint End Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        sprint = Sprint(
            project_id=project.id,
            name="Not Active Sprint",
            status="not_started",
            is_active=0
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == 400
        assert "active" in response.json()["detail"].lower()
    
    def test_end_sprint_moves_non_done_to_backlog(self, client, db_session):
        """Test ending sprint moves non-done stories back to backlog"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Sprint Backlog Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        # Create active sprint
        sprint = Sprint(
            project_id=project.id,
            name="Active for End",
            status="active",
            is_active=1,
            start_date=datetime.now(UTC),
            end_date=datetime.now(UTC) + timedelta(days=14)
        )
        db_session.add(sprint)
        db_session.flush()
        
        # Add stories
        story1 = UserStory(
            story_id="BACKLOG-1",
            title="In Progress",
            description="Test",
            business_value=1,
            effort=1,
            project_id=project.id,
            sprint_id=sprint.id,
            status="in_progress"
        )
        story2 = UserStory(
            story_id="BACKLOG-2",
            title="Done",
            description="Test",
            business_value=1,
            effort=1,
            project_id=project.id,
            sprint_id=sprint.id,
            status="done"
        )
        db_session.add(story1)
        db_session.add(story2)
        db_session.commit()
        
        # End sprint
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == 200
        
        # Check story1 moved to backlog
        db_session.refresh(story1)
        assert story1.sprint_id is None
        assert story1.status == "backlog"
        
        # Check story2 still done
        db_session.refresh(story2)
        assert story2.status == "done"
    
    def test_end_sprint_changes_status(self, client, db_session):
        """Test ending sprint changes status to closed"""
        from database import Project, Sprint
        
        project = Project(name="Sprint Status Change", description="Test")
        db_session.add(project)
        db_session.flush()
        
        sprint = Sprint(
            project_id=project.id,
            name="To Close",
            status="active",
            is_active=1,
            start_date=datetime.now(UTC),
            end_date=datetime.now(UTC) + timedelta(days=14)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/end")
        assert response.status_code == 200
        assert response.json()["status"] == "closed"


class TestSprintReopenConditions:
    """Test sprint reopen endpoint"""
    
    def test_reopen_non_closed_sprint(self, client, db_session):
        """Test cannot reopen a sprint that's not closed"""
        from database import Project, Sprint
        
        project = Project(name="Reopen Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        sprint = Sprint(
            project_id=project.id,
            name="Active Sprint",
            status="active",
            is_active=1
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/reopen")
        assert response.status_code == 400
        assert "closed" in response.json()["detail"].lower()
    
    def test_cannot_reopen_when_active_exists(self, client, db_session):
        """Test cannot reopen sprint when another is active"""
        from database import Project, Sprint
        
        project = Project(name="Multi Reopen Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        # Active sprint (different project or global check)
        active = Sprint(
            project_id=project.id,
            name="Active Sprint",
            status="active",
            is_active=1
        )
        db_session.add(active)
        db_session.flush()
        
        # Closed sprint to reopen
        closed = Sprint(
            project_id=project.id,
            name="Closed Sprint",
            status="closed",
            is_active=0
        )
        db_session.add(closed)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{closed.id}/reopen")
        # Should fail due to active sprint existing
        assert response.status_code == 400
    
    def test_reopen_closed_sprint_success(self, client, db_session):
        """Test successfully reopening a closed sprint"""
        from database import Project, Sprint
        
        project = Project(name="Reopen Success Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        sprint = Sprint(
            project_id=project.id,
            name="Closed",
            status="closed",
            is_active=0,
            start_date=datetime.now(UTC) - timedelta(days=14),
            end_date=datetime.now(UTC)
        )
        db_session.add(sprint)
        db_session.commit()
        
        response = client.post(f"/api/sprints/{sprint.id}/reopen")
        assert response.status_code == 200
        assert response.json()["status"] == "active"


class TestSubtaskOperations:
    """Test subtask creation and management"""
    
    def test_create_subtask_with_history(self, client, db_session):
        """Test creating subtask creates history entry"""
        from database import Project, UserStory, StoryHistory
        
        project = Project(name="Subtask Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="STORY-100",
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
        
        response = client.post("/api/user-stories/STORY-100/subtasks", json={
            "title": "Subtask 1",
            "description": "Test subtask"
        })
        
        assert response.status_code == 200
        
        # Verify history was created
        history = db_session.query(StoryHistory).filter_by(us_id="STORY-100").all()
        assert any(h.change_type == "subtask_created" for h in history)
    
    def test_update_subtask_completion_status(self, client, db_session):
        """Test updating subtask completion creates history"""
        from database import Project, UserStory, Subtask, StoryHistory
        
        project = Project(name="Subtask Update Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="STORY-101",
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
        
        subtask = Subtask(
            us_id="STORY-101",
            title="Subtask to Complete",
            description="Test",
            is_completed=0
        )
        db_session.add(subtask)
        db_session.commit()
        
        response = client.put(f"/api/subtasks/{subtask.id}", json={
            "title": "Subtask to Complete",
            "description": "Test",
            "is_completed": 1
        })
        
        assert response.status_code == 200
        
        # Verify history was created for completion
        history = db_session.query(StoryHistory).filter_by(us_id="STORY-101").all()
        assert any(h.change_type == "subtask_completed" for h in history)


class TestCommentOperations:
    """Test comment creation and management"""
    
    def test_create_comment_with_history(self, client, db_session):
        """Test creating comment creates history entry"""
        from database import Project, UserStory, StoryHistory
        
        project = Project(name="Comment Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="STORY-200",
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
        
        response = client.post("/api/user-stories/STORY-200/comments", json={
            "content": "This is a test comment",
            "author": "test_user"
        })
        
        assert response.status_code == 200
        
        # Verify history was created
        history = db_session.query(StoryHistory).filter_by(us_id="STORY-200").all()
        assert any(h.change_type == "comment_added" for h in history)
    
    def test_update_comment(self, client, db_session):
        """Test updating comment content"""
        from database import Project, UserStory, Comment
        
        project = Project(name="Update Comment Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="STORY-201",
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
        
        comment = Comment(
            us_id="STORY-201",
            content="Original comment",
            author="original_author"
        )
        db_session.add(comment)
        db_session.commit()
        
        response = client.put(f"/api/comments/{comment.id}", json={
            "content": "Updated comment",
            "author": "updated_author"
        })
        
        assert response.status_code == 200
        assert response.json()["content"] == "Updated comment"
    
    def test_delete_comment_creates_history(self, client, db_session):
        """Test deleting comment creates history entry"""
        from database import Project, UserStory, Comment, StoryHistory
        
        project = Project(name="Delete Comment Test", description="Test")
        db_session.add(project)
        db_session.flush()
        
        story = UserStory(
            story_id="STORY-202",
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
        
        comment = Comment(
            us_id="STORY-202",
            content="To be deleted",
            author="test_author"
        )
        db_session.add(comment)
        db_session.commit()
        
        response = client.delete(f"/api/comments/{comment.id}")
        assert response.status_code == 200
        
        # Verify history was created
        history = db_session.query(StoryHistory).filter_by(us_id="STORY-202").all()
        assert any(h.change_type == "comment_deleted" for h in history)


class TestErrorHandling:
    """Test error handling in sprints and interactions"""
    
    def test_start_nonexistent_sprint(self, client):
        """Test starting non-existent sprint"""
        response = client.post("/api/sprints/99999/start")
        assert response.status_code == 404
    
    def test_get_subtasks_nonexistent_story(self, client):
        """Test getting subtasks for non-existent story"""
        response = client.get("/api/user-stories/NONEXISTENT/subtasks")
        assert response.status_code == 404
    
    def test_get_comments_nonexistent_story(self, client):
        """Test getting comments for non-existent story"""
        response = client.get("/api/user-stories/NONEXISTENT/comments")
        assert response.status_code == 404
    
    def test_update_nonexistent_subtask(self, client):
        """Test updating non-existent subtask"""
        response = client.put("/api/subtasks/99999", json={
            "title": "Test",
            "description": "Test"
        })
        assert response.status_code == 404
    
    def test_delete_nonexistent_comment(self, client):
        """Test deleting non-existent comment"""
        response = client.delete("/api/comments/99999")
        assert response.status_code == 404
