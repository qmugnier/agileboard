"""Epic management routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Epic, UserStory
from schemas import (
    Epic as EpicSchema, EpicCreate, EpicUpdate
)

router = APIRouter(prefix="/api/epics", tags=["epics"])


@router.put("/{epic_id}", response_model=EpicSchema)
def update_epic(epic_id: int, epic: EpicUpdate, db: Session = Depends(get_db)):
    """Update an epic"""
    db_epic = db.query(Epic).filter(Epic.id == epic_id).first()
    if not db_epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    # Update only provided fields
    if epic.name is not None:
        db_epic.name = epic.name
    if epic.color is not None:
        db_epic.color = epic.color
    if epic.description is not None:
        db_epic.description = epic.description
    
    db.commit()
    db.refresh(db_epic)
    return db_epic


@router.delete("/{epic_id}")
def delete_epic(epic_id: int, db: Session = Depends(get_db)):
    """Delete an epic"""
    db_epic = db.query(Epic).filter(Epic.id == epic_id).first()
    if not db_epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    # Check if any stories are assigned to this epic
    story_count = db.query(UserStory).filter(UserStory.epic_id == epic_id).count()
    if story_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete epic: {story_count} stories are assigned to it"
        )
    
    db.delete(db_epic)
    db.commit()
    
    return {"success": True, "message": "Epic deleted successfully"}
