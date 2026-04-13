"""User story management routes (CRUD operations)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from typing import List, Optional

from database import get_db, UserStory, Project, Sprint, ProjectStatus, StatusTransition, TeamMember, StoryHistory, us_dependencies
from schemas import (
    UserStory as UserStorySchema, UserStoryCreate, UserStoryUpdate, UserStoryWithDependencies,
    AssignRequest, DependencyCreate, DependencyDetail
)

router = APIRouter(prefix="/api/user-stories", tags=["stories"])


# ============ HELPER FUNCTIONS ============

def get_final_statuses(project_id: int, db: Session) -> List[ProjectStatus]:
    """Get all final status nodes for a project (endpoints in workflow)"""
    return db.query(ProjectStatus).filter(
        ProjectStatus.project_id == project_id,
        ProjectStatus.is_final == 1
    ).all()


def is_story_closed(story: UserStory, final_statuses: List[ProjectStatus]) -> bool:
    """Check if a story is in a closed/final status"""
    return any(status.status_name == story.status for status in final_statuses)


def get_blocking_dependents(story_id: str, db: Session) -> List[tuple]:
    """Get all stories that are blocked by this story (link_type='blocks')
    Returns list of (dependent_story_id, link_type) tuples"""
    blocking = db.query(
        us_dependencies.c.dependent_id,
        us_dependencies.c.link_type
    ).filter(
        and_(
            us_dependencies.c.dependency_id == story_id,
            us_dependencies.c.link_type == 'blocks'
        )
    ).all()
    return blocking


def get_story_dependencies_detailed(story_id: str, db: Session) -> List[DependencyDetail]:
    """Get all dependencies for a story with details"""
    deps = db.query(
        us_dependencies.c.dependent_id,
        us_dependencies.c.dependency_id,
        us_dependencies.c.link_type,
        UserStory.title,
        UserStory.status
    ).outerjoin(
        UserStory,
        UserStory.story_id == us_dependencies.c.dependency_id
    ).filter(
        us_dependencies.c.dependent_id == story_id
    ).all()
    
    result = []
    for dep in deps:
        result.append(DependencyDetail(
            dependent_story_id=dep[0],
            dependency_story_id=dep[1],
            link_type=dep[2],
            dependency_title=dep[3] if len(dep) > 3 else None,
            dependency_status=dep[4] if len(dep) > 4 else None
        ))
    return result


@router.get("", response_model=List[UserStorySchema])
def get_user_stories(project_id: int = None, sprint_id: int = None, status: str = None, db: Session = Depends(get_db)):
    """Get user stories with optional filtering"""
    query = db.query(UserStory)
    
    if project_id:
        query = query.filter(UserStory.project_id == project_id)
    if sprint_id:
        query = query.filter(UserStory.sprint_id == sprint_id)
    if status:
        query = query.filter(UserStory.status == status)
    
    return query.all()


@router.post("", response_model=UserStorySchema)
def create_user_story(story: UserStoryCreate, db: Session = Depends(get_db)):
    """Create a new user story"""
    project = db.query(Project).filter(Project.id == story.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate story_id
    max_story = db.query(UserStory).order_by(UserStory.story_id.desc()).first()
    new_number = 1
    if max_story and max_story.story_id.startswith('US'):
        try:
            new_number = int(max_story.story_id[2:]) + 1
        except ValueError:
            pass
    
    new_story_id = f"US{new_number}"
    while db.query(UserStory).filter(UserStory.story_id == new_story_id).first():
        new_number += 1
        new_story_id = f"US{new_number}"
    
    db_story = UserStory(
        story_id=new_story_id,
        **{k: v for k, v in story.model_dump().items() if k != 'story_id'}
    )
    db.add(db_story)
    db.commit()
    db.refresh(db_story)
    return db_story


@router.get("/{story_id}", response_model=UserStoryWithDependencies)
def get_user_story(story_id: str, db: Session = Depends(get_db)):
    """Get specific user story with dependencies"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    result = story
    result.dependencies = [dep.story_id for dep in story.dependencies]
    return result


@router.put("/{story_id}", response_model=UserStorySchema)
def update_user_story(story_id: str, update_data: UserStoryUpdate, db: Session = Depends(get_db)):
    """Update user story status/sprint with transition validation"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Check if story is in a closed sprint and if we're reopening to backlog
    is_reopening_closed_sprint = False
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if story.sprint_id:
        sprint = db.query(Sprint).filter(Sprint.id == story.sprint_id).first()
        if sprint and sprint.status == "closed":
            # Allow reopening to backlog (moving out of closed sprint)
            # Only check if sprint_id was explicitly set to None in the request
            is_reopening_to_backlog = (
                "sprint_id" in update_dict and update_dict.get("sprint_id") is None
            )
            if is_reopening_to_backlog:
                is_reopening_closed_sprint = True
            else:
                raise HTTPException(status_code=400, detail="Cannot modify stories in a closed sprint")
    
    # Check if in final status and validate status changes
    current_status_obj = db.query(ProjectStatus).filter(
        ProjectStatus.project_id == story.project_id,
        ProjectStatus.status_name == story.status
    ).first()
    
    if current_status_obj and current_status_obj.is_final:
        if "status" not in update_dict:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot edit story in final status '{story.status}'. Change status to a working state first."
            )
    
    # Validate sprint assignment
    if "sprint_id" in update_dict:
        if update_dict.get("sprint_id"):  # Adding/changing to a sprint
            new_sprint = db.query(Sprint).filter(Sprint.id == update_dict["sprint_id"]).first()
            if new_sprint:
                if not story.sprint_id and new_sprint.status == "active":
                    raise HTTPException(status_code=400, detail="Cannot add new stories from backlog to an active sprint")
                if new_sprint.status == "closed":
                    raise HTTPException(status_code=400, detail="Cannot assign stories to a closed sprint")
        else:  # Clearing sprint_id (removing from sprint)
            # Block removal from active sprint unless it's a closed sprint
            if story.sprint_id:
                sprint = db.query(Sprint).filter(Sprint.id == story.sprint_id).first()
                if sprint and sprint.status == "active":
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot remove stories from an active sprint. Story must be completed (final status) to close it, or close the sprint first."
                    )
    
    # Check blocking dependencies before status change validation
    if "status" in update_dict and update_dict.get("status") != story.status:
        new_status_obj = db.query(ProjectStatus).filter(
            ProjectStatus.project_id == story.project_id,
            ProjectStatus.status_name == update_dict.get("status")
        ).first()
        
        # Prevent moving stories to backlog when in an active sprint (unless reopening from final status)
        new_status = update_dict.get("status")
        if new_status == "backlog":
            # Check if story is currently in ANY sprint
            if story.sprint_id:
                sprint = db.query(Sprint).filter(Sprint.id == story.sprint_id).first()
                if sprint and sprint.status == "active":
                    # Check if this is a reopen (from final status) - allowed
                    current_status_obj = db.query(ProjectStatus).filter(
                        ProjectStatus.project_id == story.project_id,
                        ProjectStatus.status_name == story.status
                    ).first()
                    is_reopening_from_final = (current_status_obj and current_status_obj.is_final)
                    
                    if not is_reopening_from_final:
                        raise HTTPException(
                            status_code=400,
                            detail="Cannot move stories to backlog when in an active sprint. Story must be completed (final status) to close it, or close the sprint first."
                        )
        
        # If closing (moving to final status), check if blocking other stories
        if new_status_obj and new_status_obj.is_final:
            blocking_dependents = get_blocking_dependents(story_id, db)
            if blocking_dependents:
                blocked_ids = ', '.join([dep[0] for dep in blocking_dependents])
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot close story - it is blocking other stories: {blocked_ids}"
                )
    
    # Validate status transitions
    if "status" in update_dict and update_dict.get("status") != story.status:
        current_status = story.status
        new_status = update_dict.get("status")
        
        # Get status objects to check for final status
        current_status_obj = db.query(ProjectStatus).filter(
            ProjectStatus.project_id == story.project_id,
            ProjectStatus.status_name == current_status
        ).first()
        new_status_obj = db.query(ProjectStatus).filter(
            ProjectStatus.project_id == story.project_id,
            ProjectStatus.status_name == new_status
        ).first()
        
        # Check if this is a reopen operation (transitioning from final to non-final status)
        is_reopening = (current_status_obj and current_status_obj.is_final and 
                       new_status_obj and not new_status_obj.is_final)
        
        # Skip validation if:
        # 1. Current status is "backlog" (virtual status for unassigned stories)
        # 2. New status is "backlog" AND (currently NOT in active sprint OR is reopening from final)
        # 3. Reopening from a closed sprint (any status change allowed)
        # 4. Reopening from a final status to a working status (reopen exception)
        skip_transition_validation = (
            current_status == "backlog" or 
            is_reopening_closed_sprint or 
            is_reopening or
            (new_status == "backlog" and not story.sprint_id)  # Moving backlog stories (not in any sprint)
        )
        
        if not skip_transition_validation:
            # Only validate transition if both statuses exist in the project
            if current_status_obj and new_status_obj:
                # Check if explicit forward transition exists: current -> new
                forward_transition = db.query(StatusTransition).filter(
                    StatusTransition.from_status_id == current_status_obj.id,
                    StatusTransition.to_status_id == new_status_obj.id
                ).first()
                
                # Check if backward transition exists: new -> current (allows implicit backward)
                backward_transition = db.query(StatusTransition).filter(
                    StatusTransition.from_status_id == new_status_obj.id,
                    StatusTransition.to_status_id == current_status_obj.id
                ).first()
                
                # Check if transition is valid (either forward or backward exists)
                is_valid_transition = forward_transition or backward_transition
                
                # If no transitions exist at all for this project, allow any status change
                project_transitions = db.query(StatusTransition).join(
                    ProjectStatus, 
                    (ProjectStatus.id == StatusTransition.from_status_id) | 
                    (ProjectStatus.id == StatusTransition.to_status_id)
                ).filter(ProjectStatus.project_id == story.project_id).all()
                
                if project_transitions and not is_valid_transition:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot transition from '{current_status}' to '{new_status}' - not allowed by workflow"
                    )
    
    data = update_dict
    
    # Track status change
    if "status" in data and story.status != data["status"]:
        history_entry = StoryHistory(
            us_id=story_id,
            change_type="status_changed",
            old_value=story.status,
            new_value=data["status"],
            changed_by="system"
        )
        db.add(history_entry)
    
    # Track sprint change
    if "sprint_id" in data and story.sprint_id != data["sprint_id"]:
        old_name = "Backlog"
        new_name = "Backlog"
        if story.sprint_id:
            old_sprint = db.query(Sprint).filter(Sprint.id == story.sprint_id).first()
            if old_sprint:
                old_name = old_sprint.name
        if data["sprint_id"]:
            new_sprint = db.query(Sprint).filter(Sprint.id == data["sprint_id"]).first()
            if new_sprint:
                new_name = new_sprint.name
        history_entry = StoryHistory(
            us_id=story_id,
            change_type="sprint_changed",
            old_value=old_name,
            new_value=new_name,
            changed_by="system"
        )
        db.add(history_entry)
    
    for key, value in data.items():
        setattr(story, key, value)
    
    db.commit()
    db.refresh(story)
    return story


@router.delete("/{story_id}")
def delete_user_story(story_id: str, db: Session = Depends(get_db)):
    """Delete a user story"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story.sprint_id:
        sprint = db.query(Sprint).filter(Sprint.id == story.sprint_id).first()
        if sprint and sprint.status == "active":
            raise HTTPException(status_code=400, detail="Cannot delete a story assigned to an active sprint")
    
    if story.assigned_to and len(story.assigned_to) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a story that is assigned to team members")
    
    db.delete(story)
    db.commit()
    return {"success": True}


@router.post("/{story_id}/assign")
def assign_user_story(story_id: str, request: AssignRequest, db: Session = Depends(get_db)):
    """Assign user story to team member"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    team_member = db.query(TeamMember).filter(TeamMember.id == request.user_id).first()
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    if team_member not in story.assigned_to:
        old_assignees = ', '.join([m.name for m in story.assigned_to]) if story.assigned_to else "Unassigned"
        story.assigned_to.append(team_member)
        new_assignees = ', '.join([m.name for m in story.assigned_to])
        
        history_entry = StoryHistory(
            us_id=story_id,
            change_type="assignee_changed",
            old_value=old_assignees,
            new_value=new_assignees,
            changed_by="system"
        )
        db.add(history_entry)
    
    db.commit()
    return {"success": True}


@router.post("/{story_id}/unassign")
def unassign_user_story(story_id: str, request: AssignRequest, db: Session = Depends(get_db)):
    """Unassign user story from team member"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    team_member = db.query(TeamMember).filter(TeamMember.id == request.user_id).first()
    if team_member in story.assigned_to:
        old_assignees = ', '.join([m.name for m in story.assigned_to])
        story.assigned_to.remove(team_member)
        new_assignees = ', '.join([m.name for m in story.assigned_to]) if story.assigned_to else "Unassigned"
        
        history_entry = StoryHistory(
            us_id=story_id,
            change_type="assignee_changed",
            old_value=old_assignees,
            new_value=new_assignees,
            changed_by="system" 
        )
        db.add(history_entry)
    
    db.commit()
    return {"success": True}


@router.get("/{story_id}/history")
def get_story_history(story_id: str, db: Session = Depends(get_db)):
    """Get story change history"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    history = db.query(StoryHistory).filter(
        StoryHistory.us_id == story_id
    ).order_by(StoryHistory.created_at.desc()).all()
    
    return [
        {
            "id": h.id,
            "change_type": h.change_type,
            "old_value": h.old_value,
            "new_value": h.new_value,
            "changed_by": h.changed_by,
            "created_at": h.created_at.isoformat()
        }
        for h in history
    ]


# ============ DEPENDENCY ENDPOINTS ============

@router.get("/{story_id}/dependencies", response_model=List[DependencyDetail])
def get_story_dependencies(story_id: str, db: Session = Depends(get_db)):
    """Get all dependencies for a story with detailed information"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return get_story_dependencies_detailed(story_id, db)


@router.post("/{story_id}/dependencies")
def add_dependency(story_id: str, request: DependencyCreate, db: Session = Depends(get_db)):
    """Add a dependency link from story_id to another story
    
    Link types:
    - depends_on: story_id depends on dependency_story_id
    - blocks: story_id blocks dependency_story_id
    - relates_to: story_id is related to dependency_story_id
    - duplicates: story_id duplicates dependency_story_id
    """
    # Validate both stories exist
    from_story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not from_story:
        raise HTTPException(status_code=404, detail=f"Story {story_id} not found")
    
    to_story = db.query(UserStory).filter(UserStory.story_id == request.dependency_story_id).first()
    if not to_story:
        raise HTTPException(status_code=404, detail=f"Story {request.dependency_story_id} not found")
    
    # Validate link type
    valid_link_types = ["depends_on", "blocks", "relates_to", "duplicates"]
    if request.link_type not in valid_link_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid link_type. Must be one of: {', '.join(valid_link_types)}"
        )
    
    # Prevent self-dependencies
    if story_id == request.dependency_story_id:
        raise HTTPException(status_code=400, detail="Cannot create a self-dependency")
    
    # Check if dependency already exists
    existing = db.query(us_dependencies).filter(
        and_(
            us_dependencies.c.dependent_id == story_id,
            us_dependencies.c.dependency_id == request.dependency_story_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Dependency already exists")
    
    # Check for circular dependencies (only for depends_on and blocks)
    if request.link_type in ["depends_on", "blocks"]:
        # Check if to_story already depends on from_story
        circular = db.query(us_dependencies).filter(
            and_(
                us_dependencies.c.dependent_id == request.dependency_story_id,
                us_dependencies.c.dependency_id == story_id,
                us_dependencies.c.link_type.in_(["depends_on", "blocks"])
            )
        ).first()
        
        if circular:
            raise HTTPException(status_code=400, detail="Would create a circular dependency")
    
    # Add the dependency
    from sqlalchemy import insert
    stmt = insert(us_dependencies).values(
        dependent_id=story_id,
        dependency_id=request.dependency_story_id,
        link_type=request.link_type
    )
    db.execute(stmt)
    db.commit()
    
    return {
        "success": True,
        "dependent_story_id": story_id,
        "dependency_story_id": request.dependency_story_id,
        "link_type": request.link_type
    }


@router.delete("/{story_id}/dependencies/{dep_story_id}")
def remove_dependency(story_id: str, dep_story_id: str, db: Session = Depends(get_db)):
    """Remove a dependency link between two stories"""
    # Validate both stories exist
    from_story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not from_story:
        raise HTTPException(status_code=404, detail=f"Story {story_id} not found")
    
    to_story = db.query(UserStory).filter(UserStory.story_id == dep_story_id).first()
    if not to_story:
        raise HTTPException(status_code=404, detail=f"Story {dep_story_id} not found")
    
    # Delete the dependency
    from sqlalchemy import delete
    stmt = delete(us_dependencies).where(
        and_(
            us_dependencies.c.dependent_id == story_id,
            us_dependencies.c.dependency_id == dep_story_id
        )
    )
    result = db.execute(stmt)
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Dependency not found")
    
    return {"success": True, "message": f"Removed dependency from {story_id} to {dep_story_id}"}


@router.get("/{story_id}/blocking")
def get_blocking_stories(story_id: str, db: Session = Depends(get_db)):
    """Get all stories that are blocked by this story (link_type='blocks')
    When story A blocks story B: dependent_id=B, dependency_id=A
    This endpoint returns all stories B that are blocked by story A
    """
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Get story IDs that are blocked by this story
    # Dependency table: dependent_id (blocked story), dependency_id (blocking story)
    blocked_ids = db.query(us_dependencies.c.dependent_id).filter(
        and_(
            us_dependencies.c.dependency_id == story_id,  # This story is blocking
            us_dependencies.c.link_type == 'blocks'
        )
    ).all()
    
    blocked_ids = [row[0] for row in blocked_ids]
    
    if not blocked_ids:
        return []
    
    # Get the actual stories
    blocking = db.query(UserStory).filter(UserStory.story_id.in_(blocked_ids)).all()
    
    return blocking


@router.get("/{story_id}/blocked-by")
def get_blocked_by_stories(story_id: str, db: Session = Depends(get_db)):
    """Get all stories that this story depends on (link_type='depends_on')"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Get story IDs that this story depends on
    dependency_ids = db.query(us_dependencies.c.dependency_id).filter(
        and_(
            us_dependencies.c.dependent_id == story_id,
            us_dependencies.c.link_type == 'depends_on'
        )
    ).all()
    
    dependency_ids = [row[0] for row in dependency_ids]
    
    if not dependency_ids:
        return []
    
    # Get the actual stories
    blocked_by = db.query(UserStory).filter(UserStory.story_id.in_(dependency_ids)).all()
    
    return blocked_by


@router.get("/{story_id}/status-info")
def get_story_status_info(story_id: str, db: Session = Depends(get_db)):
    """Get status info including whether story is closed and blocking status"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Get final statuses for this project
    final_statuses = get_final_statuses(story.project_id, db)
    
    # Check if closed
    is_closed = is_story_closed(story, final_statuses)
    
    # Get blocking stories
    blocking = get_blocking_dependents(story_id, db)
    
    return {
        "story_id": story_id,
        "status": story.status,
        "is_closed": is_closed,
        "is_blocking_others": len(blocking) > 0,
        "blocking_stories": [dep[0] for dep in blocking],
        "final_status_names": [s.status_name for s in final_statuses]
    }

