"""Test dependency tracking functionality"""
import pytest
from sqlalchemy.orm import Session
from sqlalchemy import insert
from database import UserStory, Project, ProjectStatus, us_dependencies


def test_add_dependency(client, db_session: Session):
    """Test adding a dependency between two stories"""
    # Create project with statuses
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create statuses
    status1 = ProjectStatus(project_id=project.id, status_name="ready", order=1)
    status2 = ProjectStatus(project_id=project.id, status_name="done", order=2, is_final=1)
    db_session.add(status1)
    db_session.add(status2)
    db_session.flush()
    
    # Create two stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # Add dependency: US1 depends on US2
    response = client.post(
        "/api/user-stories/US1/dependencies",
        json={
            "dependency_story_id": "US2",
            "link_type": "depends_on"
        }
    )
    
    assert response.status_code == 200
    assert response.json()["success"] == True
    assert response.json()["link_type"] == "depends_on"


def test_add_circular_dependency_prevention(client, db_session: Session):
    """Test that circular dependencies are prevented"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create two stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # Add US1 depends on US2
    client.post(
        "/api/user-stories/US1/dependencies",
        json={
            "dependency_story_id": "US2",
            "link_type": "depends_on"
        }
    )
    
    # Attempt to add US2 depends on US1 (circular)
    response = client.post(
        "/api/user-stories/US2/dependencies",
        json={
            "dependency_story_id": "US1",
            "link_type": "depends_on"
        }
    )
    
    assert response.status_code == 400
    assert "circular" in response.json()["detail"].lower()


def test_blocking_dependency_prevents_closure(client, db_session: Session):
    """Test that a story blocking others cannot be closed"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create statuses
    status_ready = ProjectStatus(project_id=project.id, status_name="ready", order=1)
    status_done = ProjectStatus(project_id=project.id, status_name="done", order=2, is_final=1)
    db_session.add(status_ready)
    db_session.add(status_done)
    db_session.flush()
    
    # Create two stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # Make US1 block US2
    stmt = insert(us_dependencies).values(
        dependent_id="US2",
        dependency_id="US1",
        link_type="blocks"
    )
    db_session.execute(stmt)
    db_session.commit()
    
    # Try to close US1 - should fail because it's blocking US2
    response = client.put(
        "/api/user-stories/US1",
        json={"status": "done"}
    )
    
    assert response.status_code == 400
    assert "blocking" in response.json()["detail"].lower()


def test_get_status_info(client, db_session: Session):
    """Test getting status info including closed state and blocking info"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create statuses
    status_ready = ProjectStatus(project_id=project.id, status_name="ready", order=1)
    status_done = ProjectStatus(project_id=project.id, status_name="done", order=2, is_final=1)
    db_session.add(status_ready)
    db_session.add(status_done)
    db_session.flush()
    
    # Create story
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.commit()
    
    # Get status info
    response = client.get("/api/user-stories/US1/status-info")
    
    assert response.status_code == 200
    data = response.json()
    assert data["story_id"] == "US1"
    assert data["status"] == "ready"
    assert data["is_closed"] == False
    assert "done" in data["final_status_names"]


def test_self_dependency_prevention(client, db_session: Session):
    """Test that stories cannot depend on themselves"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create story
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.commit()
    
    # Attempt self-dependency
    response = client.post(
        "/api/user-stories/US1/dependencies",
        json={
            "dependency_story_id": "US1",
            "link_type": "depends_on"
        }
    )
    
    assert response.status_code == 400
    assert "self" in response.json()["detail"].lower()


def test_invalid_link_type(client, db_session: Session):
    """Test that invalid link types are rejected"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create two stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # Attempt invalid link type
    response = client.post(
        "/api/user-stories/US1/dependencies",
        json={
            "dependency_story_id": "US2",
            "link_type": "invalid_type"
        }
    )
    
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


def test_get_dependencies(client, db_session: Session):
    """Test retrieving dependencies for a story"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create two stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # Add dependency
    client.post(
        "/api/user-stories/US1/dependencies",
        json={
            "dependency_story_id": "US2",
            "link_type": "depends_on"
        }
    )
    
    # Get dependencies
    response = client.get("/api/user-stories/US1/dependencies")
    
    assert response.status_code == 200
    deps = response.json()
    assert len(deps) == 1
    assert deps[0]["dependency_story_id"] == "US2"
    assert deps[0]["link_type"] == "depends_on"


def test_remove_dependency(client, db_session: Session):
    """Test removing a dependency"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create two stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # Add dependency
    client.post(
        "/api/user-stories/US1/dependencies",
        json={
            "dependency_story_id": "US2",
            "link_type": "depends_on"
        }
    )
    
    # Verify it was added
    response = client.get("/api/user-stories/US1/dependencies")
    assert len(response.json()) == 1
    
    # Remove dependency
    response = client.delete("/api/user-stories/US1/dependencies/US2")
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Verify it was removed
    response = client.get("/api/user-stories/US1/dependencies")
    assert len(response.json()) == 0


def test_get_blocking_stories(client, db_session: Session):
    """Test getting stories blocked by a story"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # US1 blocks US2
    stmt = insert(us_dependencies).values(
        dependent_id="US2",
        dependency_id="US1",
        link_type="blocks"
    )
    db_session.execute(stmt)
    db_session.commit()
    
    # Get stories blocked by US1
    response = client.get("/api/user-stories/US1/blocking")
    
    assert response.status_code == 200
    stories = response.json()
    assert len(stories) == 1
    assert stories[0]["story_id"] == "US2"


def test_get_blocked_by_stories(client, db_session: Session):
    """Test getting stories that block a story (dependencies)"""
    project = db_session.query(Project).first()
    if not project:
        project = Project(name="Test Project", is_default=1)
        db_session.add(project)
        db_session.flush()
    
    # Create stories
    story1 = UserStory(
        story_id="US1",
        title="Story 1",
        description="Description 1",
        business_value=10,
        effort=5,
        project_id=project.id,
        status="ready"
    )
    story2 = UserStory(
        story_id="US2",
        title="Story 2",
        description="Description 2",
        business_value=15,
        effort=8,
        project_id=project.id,
        status="ready"
    )
    db_session.add(story1)
    db_session.add(story2)
    db_session.commit()
    
    # US2 depends on US1
    stmt = insert(us_dependencies).values(
        dependent_id="US2",
        dependency_id="US1",
        link_type="depends_on"
    )
    db_session.execute(stmt)
    db_session.commit()
    
    # Get dependencies for US2
    response = client.get("/api/user-stories/US2/blocked-by")
    
    assert response.status_code == 200
    stories = response.json()
    assert len(stories) == 1
    assert stories[0]["story_id"] == "US1"
