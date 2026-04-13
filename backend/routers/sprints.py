"""Sprint management routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, UTC, timedelta
from typing import List

from database import get_db, Sprint, UserStory, StoryHistory, Project
from schemas import Sprint as SprintSchema, SprintCreate, SprintUpdate

router = APIRouter(prefix="/api/sprints", tags=["sprints"])


@router.get("", response_model=List[SprintSchema])
def get_sprints(db: Session = Depends(get_db)):
    """Get all sprints"""
    return db.query(Sprint).all()


@router.get("/{sprint_id}", response_model=SprintSchema)
def get_sprint(sprint_id: int, db: Session = Depends(get_db)):
    """Get specific sprint"""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return sprint


@router.post("", response_model=SprintSchema)
def create_sprint(sprint: SprintCreate, db: Session = Depends(get_db)):
    """Create new sprint"""
    db_sprint = Sprint(**sprint.model_dump())
    db.add(db_sprint)
    db.commit()
    db.refresh(db_sprint)
    return db_sprint


@router.put("/{sprint_id}", response_model=SprintSchema)
def update_sprint(sprint_id: int, sprint_data: SprintUpdate, db: Session = Depends(get_db)):
    """Update sprint
    
    Note: If updating is_active to True (activating sprint), sprint sequence validation is applied.
    """
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    update_data = sprint_data.model_dump(exclude_unset=True)
    
    # If trying to activate the sprint, apply sprint sequence validation
    is_attempting_activation = update_data.get("is_active") == True
    
    if is_attempting_activation:
        # Extract sprint number from name (e.g., "Sprint 3" → 3)
        try:
            sprint_number = int(sprint.name.split()[-1])
        except (ValueError, IndexError):
            sprint_number = None
        
        # If this is not Sprint 1, verify that the previous sprint has been closed
        if sprint_number and sprint_number > 1:
            previous_sprint_number = sprint_number - 1
            # Look for the previous sprint in the same project
            all_sprints = db.query(Sprint).filter(Sprint.project_id == sprint.project_id).all()
            previous_sprints = [s for s in all_sprints 
                               if s.name.startswith("Sprint ") and 
                               s.name.split()[-1].isdigit() and 
                               int(s.name.split()[-1]) == previous_sprint_number]
            
            if previous_sprints:
                prev_sprint = previous_sprints[0]
                # Previous sprint must be closed or completed
                if prev_sprint.status not in ["closed", "completed"]:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Cannot activate {sprint.name}. {prev_sprint.name} must be closed first. Current status: {prev_sprint.status}"
                    )
        
        # Check if any other sprint is currently active in the same project
        active_sprint = db.query(Sprint).filter(
            Sprint.project_id == sprint.project_id,
            Sprint.status == "active"
        ).first()
        if active_sprint:
            raise HTTPException(status_code=400, detail=f"Sprint '{active_sprint.name}' is already active in this project. Close it first.")
    
    for key, value in update_data.items():
        setattr(sprint, key, value)
    
    db.commit()
    db.refresh(sprint)
    return sprint


@router.delete("/{sprint_id}")
def delete_sprint(sprint_id: int, db: Session = Depends(get_db)):
    """Delete sprint"""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    db.delete(sprint)
    db.commit()
    return {"success": True}


@router.post("/{sprint_id}/start", response_model=SprintSchema)
def start_sprint(sprint_id: int, db: Session = Depends(get_db)):
    """Start a sprint - only one sprint can be active per project at a time
    
    Validation rules:
    - Only Sprint 1 can be started if it's the first sprint ever
    - Other sprints can only be started if the previous sprint has been closed
    """
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    if sprint.status == "active":
        raise HTTPException(status_code=400, detail="Sprint is already active")
    
    if sprint.status == "closed":
        raise HTTPException(status_code=400, detail="Cannot start a closed sprint")
    
    # Check if any other sprint in THIS PROJECT is currently active
    active_sprint = db.query(Sprint).filter(
        Sprint.project_id == sprint.project_id,
        Sprint.status == "active"
    ).first()
    if active_sprint:
        raise HTTPException(status_code=400, detail=f"Sprint '{active_sprint.name}' is already active in this project. Close it first.")
    
    # Validate sprint sequence: only allow starting a sprint if previous sprint is closed
    # Extract sprint number from name (e.g., "Sprint 3" → 3)
    try:
        sprint_number = int(sprint.name.split()[-1])
    except (ValueError, IndexError):
        sprint_number = None
    
    # If this is not Sprint 1, verify that the previous sprint has been closed
    if sprint_number and sprint_number > 1:
        previous_sprint_number = sprint_number - 1
        # Look for the previous sprint in the same project
        all_sprints = db.query(Sprint).filter(Sprint.project_id == sprint.project_id).all()
        previous_sprints = [s for s in all_sprints 
                           if s.name.startswith("Sprint ") and 
                           s.name.split()[-1].isdigit() and 
                           int(s.name.split()[-1]) == previous_sprint_number]
        
        if previous_sprints:
            prev_sprint = previous_sprints[0]
            # Previous sprint must be closed or completed, not in not_started state
            if prev_sprint.status not in ["closed", "completed"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot start {sprint.name}. {prev_sprint.name} must be closed first. Current status: {prev_sprint.status}"
                )
    
    # Get project and its default sprint duration
    project = db.query(Project).filter(Project.id == sprint.project_id).first()
    default_duration = project.default_sprint_duration_days if project else 14
    
    # Start the sprint and set end date
    sprint.status = "active"
    sprint.is_active = 1
    sprint.start_date = datetime.now(UTC)
    if not sprint.end_date:
        sprint.end_date = sprint.start_date + timedelta(days=default_duration)
    
    db.commit()
    db.refresh(sprint)
    return sprint


@router.post("/{sprint_id}/end", response_model=SprintSchema)
def end_sprint(sprint_id: int, db: Session = Depends(get_db)):
    """End a sprint - moves non-done stories back to backlog"""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    if sprint.status != "active":
        raise HTTPException(status_code=400, detail="Only active sprints can be ended")
    
    # Move all non-done stories back to backlog
    stories = db.query(UserStory).filter(UserStory.sprint_id == sprint_id).all()
    for story in stories:
        if story.status != "done":
            # Log history for this sprint change
            history_entry = StoryHistory(
                us_id=story.story_id,
                change_type="sprint_changed",
                old_value=sprint.name,
                new_value="Backlog",
                changed_by="system"
            )
            db.add(history_entry)
            
            # Move to backlog
            story.sprint_id = None
            story.status = "backlog"
    
    # Close the sprint
    sprint.status = "closed"
    sprint.is_active = 0
    sprint.end_date = datetime.now(UTC)
    
    db.commit()
    db.refresh(sprint)
    return sprint


@router.post("/{sprint_id}/reopen", response_model=SprintSchema)
def reopen_sprint(sprint_id: int, db: Session = Depends(get_db)):
    """Reopen a closed sprint and restore previously removed stories
    
    - Only if no other sprint is currently active in the same project
    - Validates sprint sequence: previous sprint must be closed
    - Automatically restores stories that were moved to backlog during close
      (excludes completed stories)
    - Restored stories are set to 'ready' status
    """
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    if sprint.status != "closed":
        raise HTTPException(status_code=400, detail="Only closed sprints can be reopened")
    
    # Check if any other sprint is currently active in the same project
    active_sprint = db.query(Sprint).filter(
        Sprint.project_id == sprint.project_id,
        Sprint.status == "active"
    ).first()
    if active_sprint:
        raise HTTPException(status_code=400, detail=f"Cannot reopen: Sprint '{active_sprint.name}' is currently active in this project")
    
    # Validate sprint sequence: only allow reopening a sprint if previous sprint is closed
    # Extract sprint number from name (e.g., "Sprint 3" → 3)
    try:
        sprint_number = int(sprint.name.split()[-1])
    except (ValueError, IndexError):
        sprint_number = None
    
    # If this is not Sprint 1, verify that the previous sprint has been closed
    if sprint_number and sprint_number > 1:
        previous_sprint_number = sprint_number - 1
        # Look for the previous sprint in the same project
        all_sprints = db.query(Sprint).filter(Sprint.project_id == sprint.project_id).all()
        previous_sprints = [s for s in all_sprints 
                           if s.name.startswith("Sprint ") and 
                           s.name.split()[-1].isdigit() and 
                           int(s.name.split()[-1]) == previous_sprint_number]
        
        if previous_sprints:
            prev_sprint = previous_sprints[0]
            # Previous sprint must be closed or completed, not in not_started state
            if prev_sprint.status not in ["closed", "completed"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot reopen {sprint.name}. {prev_sprint.name} must be closed first. Current status: {prev_sprint.status}"
                )
    
    # Reopen the sprint
    sprint.status = "active"
    sprint.is_active = 1
    
    # Calculate new end_date: reopen time + sprint duration
    project = db.query(Project).filter(Project.id == sprint.project_id).first()
    default_duration = project.default_sprint_duration_days if project else 14
    sprint.end_date = datetime.now(UTC) + timedelta(days=default_duration)
    
    # DO NOT update start_date - keep the original start date
    
    db.commit()
    
    # Smart story restoration: find stories that were removed from this sprint during close
    # and restore them to the sprint with 'ready' status
    backlog_stories = db.query(UserStory).filter(
        UserStory.project_id == sprint.project_id,
        UserStory.sprint_id == None,
        UserStory.status == "backlog"
    ).all()
    
    restored_count = 0
    for story in backlog_stories:
        # Check if this story was recently moved from this sprint to backlog
        # by looking for a sprint_changed event in its history
        history_entry = db.query(StoryHistory).filter(
            StoryHistory.us_id == story.story_id,
            StoryHistory.change_type == "sprint_changed",
            StoryHistory.old_value == sprint.name,
            StoryHistory.new_value == "Backlog"
        ).order_by(StoryHistory.created_at.desc()).first()
        
        if history_entry:
            # This story was removed from this sprint, restore it
            history_log = StoryHistory(
                us_id=story.story_id,
                change_type="sprint_changed",
                old_value="Backlog",
                new_value=sprint.name,
                changed_by="system"
            )
            db.add(history_log)
            
            story.sprint_id = sprint.id
            story.status = "ready"
            restored_count += 1
    
    if restored_count > 0:
        db.commit()
        print(f"Restored {restored_count} stories to {sprint.name}")
    
    db.refresh(sprint)
    return sprint
