"""Project status and workflow transition routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, ProjectStatus, StatusTransition, UserStory
from schemas import ProjectStatus as ProjectStatusSchema, ProjectStatusCreate, ProjectStatusUpdate

router = APIRouter(prefix="/api/project-statuses", tags=["statuses"])


@router.get("/{project_id}", response_model=List[ProjectStatusSchema])
def get_project_statuses(project_id: int, db: Session = Depends(get_db)):
    """Get all statuses for a project"""
    return db.query(ProjectStatus).filter(ProjectStatus.project_id == project_id).order_by(ProjectStatus.order).all()


@router.post("/{project_id}", response_model=ProjectStatusSchema)
def create_status(project_id: int, status: ProjectStatusCreate, db: Session = Depends(get_db)):
    """Create new status for project"""
    db_status = ProjectStatus(project_id=project_id, **status.model_dump())
    db.add(db_status)
    db.commit()
    db.refresh(db_status)
    return db_status


@router.put("/{project_id}/{status_id}", response_model=ProjectStatusSchema)
def update_status(project_id: int, status_id: int, status: ProjectStatusUpdate, db: Session = Depends(get_db)):
    """Update project status"""
    db_status = db.query(ProjectStatus).filter(
        ProjectStatus.id == status_id,
        ProjectStatus.project_id == project_id
    ).first()
    if not db_status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    for key, value in status.model_dump(exclude_unset=True).items():
        setattr(db_status, key, value)
    
    db.commit()
    db.refresh(db_status)
    return db_status


@router.delete("/{project_id}/{status_id}")
def delete_status(project_id: int, status_id: int, db: Session = Depends(get_db)):
    """Delete project status"""
    db_status = db.query(ProjectStatus).filter(
        ProjectStatus.id == status_id,
        ProjectStatus.project_id == project_id
    ).first()
    if not db_status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    if db_status.is_default:
        raise HTTPException(status_code=400, detail=f"Cannot delete default status '{db_status.status_name}'")
    
    story_count = db.query(UserStory).filter(
        UserStory.status == db_status.status_name,
        UserStory.project_id == project_id
    ).count()
    if story_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete status: {story_count} stories use it")
    
    db.delete(db_status)
    db.commit()
    return {"success": True}


# Transition endpoints
@router.post("/{from_status_id}/set-next/{to_status_id}")
def create_transition(from_status_id: int, to_status_id: int, db: Session = Depends(get_db)):
    """Create a transition between two statuses"""
    from_status = db.query(ProjectStatus).filter(ProjectStatus.id == from_status_id).first()
    to_status = db.query(ProjectStatus).filter(ProjectStatus.id == to_status_id).first()
    
    if not from_status or not to_status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    if from_status.is_final:
        raise HTTPException(status_code=400, detail=f"Cannot create transition FROM final status '{from_status.status_name}'")
    
    existing = db.query(StatusTransition).filter(
        StatusTransition.from_status_id == from_status_id,
        StatusTransition.to_status_id == to_status_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Transition already exists")
    
    transition = StatusTransition(from_status_id=from_status_id, to_status_id=to_status_id)
    db.add(transition)
    db.commit()
    
    return {
        "success": True,
        "from_status": from_status.status_name,
        "to_status": to_status.status_name
    }


@router.delete("/{from_status_id}/set-next/{to_status_id}")
def delete_transition(from_status_id: int, to_status_id: int, db: Session = Depends(get_db)):
    """Delete a status transition between two statuses"""
    transition = db.query(StatusTransition).filter(
        StatusTransition.from_status_id == from_status_id,
        StatusTransition.to_status_id == to_status_id
    ).first()
    
    if not transition:
        raise HTTPException(status_code=404, detail="Transition not found")
    
    db.delete(transition)
    db.commit()
    
    return {"success": True}
