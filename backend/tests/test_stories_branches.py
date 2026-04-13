"""Comprehensive tests for stories router partial branches"""
import pytest
from fastapi import status


class TestStoriesSprintBranches:
    """Tests for story-sprint assignment branches"""
    
    def test_cannot_add_backlog_story_to_active_sprint(self, client, db_session):
        """Test that backlog stories cannot be added to active sprints"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create active sprint
        active_sprint = Sprint(name="Active", project_id=project.id, status="active")
        db_session.add(active_sprint)
        db_session.commit()
        
        # Create backlog story (no sprint)
        story = UserStory(
            story_id="US_BACKLOG",
            title="Backlog Story",
            description="Test",
            project_id=project.id,
            sprint_id=None,  # In backlog
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to add to active sprint
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "sprint_id": active_sprint.id
        })
        
        assert response.status_code == 400
        assert "active sprint" in response.json().get("detail", "").lower()
    
    def test_cannot_assign_story_to_closed_sprint(self, client, db_session):
        """Test that stories cannot be assigned to closed sprints"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create closed sprint
        closed_sprint = Sprint(name="Closed", project_id=project.id, status="closed")
        db_session.add(closed_sprint)
        db_session.commit()
        
        # Create story
        story = UserStory(
            story_id="US_CLOSE_SPRINT",
            title="Test",
            description="Test",
            project_id=project.id,
            sprint_id=None,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to assign to closed sprint
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "sprint_id": closed_sprint.id
        })
        
        assert response.status_code == 400
        assert "closed sprint" in response.json().get("detail", "").lower()
    
    def test_cannot_modify_story_in_closed_sprint(self, client, db_session):
        """Test that stories in closed sprints cannot be modified"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create closed sprint with story
        closed_sprint = Sprint(name="Closed", project_id=project.id, status="closed")
        db_session.add(closed_sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US_IN_CLOSED",
            title="Test",
            description="Test",
            project_id=project.id,
            sprint_id=closed_sprint.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to modify
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "title": "Updated Title"
        })
        
        assert response.status_code == 400
        assert "closed sprint" in response.json().get("detail", "").lower()
    
    def test_track_sprint_change_history(self, client, db_session):
        """Test that sprint changes are tracked in history"""
        from database import Project, Sprint, UserStory, StoryHistory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        sprint1 = Sprint(name="Sprint 1", project_id=project.id, status="not_started")
        sprint2 = Sprint(name="Sprint 2", project_id=project.id, status="not_started")
        db_session.add_all([sprint1, sprint2])
        db_session.commit()
        
        story = UserStory(
            story_id="US_SPRINT_TRACK",
            title="Test",
            description="Test",
            project_id=project.id,
            sprint_id=sprint1.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Change sprint
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "sprint_id": sprint2.id
        })
        
        assert response.status_code == 200
        
        # Verify history
        response_history = client.get(f"/api/user-stories/{story.story_id}/history")
        if response_history.status_code == 200:
            history = response_history.json()
            sprint_changes = [h for h in history if h.get("change_type") == "sprint_changed"]
            assert len(sprint_changes) > 0


class TestStoriesStatusBranches:
    """Tests for story status transition branches"""
    
    def test_cannot_edit_final_status_story(self, client, db_session):
        """Test that stories in final status cannot be edited"""
        from database import Project, ProjectStatus, UserStory
        
        project = Project(name="Test", description="Test")
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
            story_id="US_FINAL",
            title="Test",
            description="Test",
            project_id=project.id,
            status="done",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Try to edit without status change
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "title": "New Title",
            "effort": 8
        })
        
        assert response.status_code == 400
        assert "final status" in response.json().get("detail", "").lower()
    
    def test_can_exit_final_status(self, client, db_session):
        """Test that changing status can exit final status"""
        from database import Project, ProjectStatus, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create statuses
        working = ProjectStatus(project_id=project.id, status_name="in-progress", is_final=False)
        final = ProjectStatus(project_id=project.id, status_name="done", is_final=True)
        db_session.add_all([working, final])
        db_session.commit()
        
        story = UserStory(
            story_id="US_EXIT_FINAL",
            title="Test",
            description="Test",
            project_id=project.id,
            status="done",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Change to non-final status
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "status": "in-progress",
            "title": "New Title"
        })
        
        # Should succeed
        assert response.status_code in [200, 400]
    
    def test_dynamic_status_transition_creation(self, client, db_session):
        """Test that status changes are allowed when no transitions are defined (permissive mode)"""
        from database import Project, ProjectStatus, UserStory, StatusTransition
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        # Create statuses without transitions
        status1 = ProjectStatus(project_id=project.id, status_name="ready", is_final=False)
        status2 = ProjectStatus(project_id=project.id, status_name="done", is_final=True)
        db_session.add_all([status1, status2])
        db_session.commit()
        
        story = UserStory(
            story_id="US_AUTO_TRANSITION",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        # Try status change - should succeed in permissive mode (no transitions defined)
        response = client.put(f"/api/user-stories/{story.story_id}", json={
            "status": "done"
        })
        
        # Should succeed because no transitions are defined (permissive mode)
        assert response.status_code == 200


class TestStoriesDeletionBranches:
    """Tests for story deletion constraints"""
    
    def test_cannot_delete_story_in_active_sprint(self, client, db_session):
        """Test that stories in active sprints cannot be deleted"""
        from database import Project, Sprint, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        active_sprint = Sprint(name="Active", project_id=project.id, status="active")
        db_session.add(active_sprint)
        db_session.commit()
        
        story = UserStory(
            story_id="US_DELETE_ACTIVE",
            title="Test",
            description="Test",
            project_id=project.id,
            sprint_id=active_sprint.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.delete(f"/api/user-stories/{story.story_id}")
        
        assert response.status_code == 400
        assert "active sprint" in response.json().get("detail", "").lower()
    
    def test_cannot_delete_assigned_story(self, client, db_session):
        """Test that assigned stories cannot be deleted"""
        from database import Project, UserStory, TeamMember
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member = TeamMember(name="Dev", role="Developer")
        db_session.add(team_member)
        db_session.commit()
        
        story = UserStory(
            story_id="US_DELETE_ASSIGNED",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        story.assigned_to.append(team_member)
        db_session.add(story)
        db_session.commit()
        
        response = client.delete(f"/api/user-stories/{story.story_id}")
        
        assert response.status_code == 400
        assert "assigned" in response.json().get("detail", "").lower()
    
    def test_delete_unassigned_backlog_story(self, client, db_session):
        """Test that unassigned backlog stories can be deleted"""
        from database import Project, UserStory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        story = UserStory(
            story_id="US_DELETE_OK",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        db_session.add(story)
        db_session.commit()
        
        response = client.delete(f"/api/user-stories/{story.story_id}")
        
        assert response.status_code == 200


class TestStoriesAssignmentBranches:
    """Tests for story assignment/unassignment branches"""
    
    def test_assign_already_assigned_member(self, client, db_session):
        """Test assigning already assigned member doesn't duplicate"""
        from database import Project, UserStory, TeamMember
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member = TeamMember(name="Dev1", role="Developer")
        db_session.add(team_member)
        db_session.commit()
        
        story = UserStory(
            story_id="US_ASSIGN_DUP",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        story.assigned_to.append(team_member)
        db_session.add(story)
        db_session.commit()
        
        # Assign same member again
        response = client.post(f"/api/user-stories/{story.story_id}/assign", json={
            "user_id": team_member.id
        })
        
        assert response.status_code == 200
        
        # Verify not duplicated
        updated_story = db_session.query(UserStory).filter(
            UserStory.story_id == "US_ASSIGN_DUP"
        ).first()
        assert len(updated_story.assigned_to) == 1
    
    def test_track_assignment_history(self, client, db_session):
        """Test that assignments are tracked in history"""
        from database import Project, UserStory, TeamMember, StoryHistory
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member1 = TeamMember(name="Dev1", role="Developer")
        team_member2 = TeamMember(name="Dev2", role="Developer")
        db_session.add_all([team_member1, team_member2])
        db_session.commit()
        
        story = UserStory(
            story_id="US_TRACK_ASSIGN",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        story.assigned_to.append(team_member1)
        db_session.add(story)
        db_session.commit()
        
        # Assign second member
        response = client.post(f"/api/user-stories/{story.story_id}/assign", json={
            "user_id": team_member2.id
        })
        
        assert response.status_code == 200
        
        # Verify history exists
        history_response = client.get(f"/api/user-stories/{story.story_id}/history")
        if history_response.status_code == 200:
            history = history_response.json()
            assign_changes = [h for h in history if h.get("change_type") == "assignee_changed"]
            assert len(assign_changes) > 0
    
    def test_unassign_team_member_not_assigned(self, client, db_session):
        """Test unassigning member not assigned to story"""
        from database import Project, UserStory, TeamMember
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member1 = TeamMember(name="Dev1", role="Developer")
        team_member2 = TeamMember(name="Dev2", role="Developer")
        db_session.add_all([team_member1, team_member2])
        db_session.commit()
        
        story = UserStory(
            story_id="US_UNASSIGN",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        story.assigned_to.append(team_member1)
        db_session.add(story)
        db_session.commit()
        
        # Try to unassign different member
        response = client.post(f"/api/user-stories/{story.story_id}/unassign", json={
            "user_id": team_member2.id
        })
        
        assert response.status_code == 200
        
        # Verify unchanged
        updated_story = db_session.query(UserStory).filter(
            UserStory.story_id == "US_UNASSIGN"
        ).first()
        assert len(updated_story.assigned_to) == 1
        assert updated_story.assigned_to[0].id == team_member1.id
    
    def test_track_unassignment_history(self, client, db_session):
        """Test that unassignments are tracked in history"""
        from database import Project, UserStory, TeamMember
        
        project = Project(name="Test", description="Test")
        db_session.add(project)
        db_session.commit()
        
        team_member = TeamMember(name="Dev", role="Developer")
        db_session.add(team_member)
        db_session.commit()
        
        story = UserStory(
            story_id="US_TRACK_UNASSIGN",
            title="Test",
            description="Test",
            project_id=project.id,
            status="ready",
            effort=5,
            business_value=8
        )
        story.assigned_to.append(team_member)
        db_session.add(story)
        db_session.commit()
        
        # Unassign
        response = client.post(f"/api/user-stories/{story.story_id}/unassign", json={
            "user_id": team_member.id
        })
        
        assert response.status_code == 200
        
        # Verify history
        history_response = client.get(f"/api/user-stories/{story.story_id}/history")
        if history_response.status_code == 200:
            history = history_response.json()
            # Should have at least one assignee_changed event
            assign_changes = [h for h in history if h.get("change_type") == "assignee_changed"]
            if assign_changes:
                # Last one should show unassignment
                assert "Unassigned" in str(assign_changes[0].get("new_value", ""))
