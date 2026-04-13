"""Subtasks and Comments management routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Subtask, Comment, UserStory, StoryHistory
from schemas import Subtask as SubtaskSchema, SubtaskCreate, Comment as CommentSchema, CommentCreate

router = APIRouter(tags=["stories"])


# ============ SUBTASKS ============

@router.get("/api/user-stories/{story_id}/subtasks", response_model=List[SubtaskSchema])
def get_subtasks(story_id: str, db: Session = Depends(get_db)):
    """Get all subtasks for a story"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return db.query(Subtask).filter(Subtask.us_id == story_id).all()


@router.post("/api/user-stories/{story_id}/subtasks", response_model=SubtaskSchema)
def create_subtask(story_id: str, subtask: SubtaskCreate, db: Session = Depends(get_db)):
    """Create new subtask for a story"""
    try:
        story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        db_subtask = Subtask(us_id=story_id, **subtask.model_dump())
        db.add(db_subtask)
        db.flush()
        
        history = StoryHistory(
            us_id=story_id,
            change_type="subtask_created",
            new_value=subtask.title,
            changed_by="system"
        )
        db.add(history)
        db.commit()
        db.refresh(db_subtask)
        return db_subtask
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/subtasks/{subtask_id}", response_model=SubtaskSchema)
def update_subtask(subtask_id: int, subtask_data: SubtaskCreate, db: Session = Depends(get_db)):
    """Update subtask"""
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    old_is_completed = bool(subtask.is_completed)
    update_data = subtask_data.model_dump()
    new_is_completed = update_data.get('is_completed', old_is_completed)
    
    for key, value in update_data.items():
        setattr(subtask, key, value)
    
    db.flush()
    
    if new_is_completed != old_is_completed:
        history = StoryHistory(
            us_id=subtask.us_id,
            change_type="subtask_completed",
            old_value="pending",
            new_value="completed" if new_is_completed else "pending",
            changed_by="system"
        )
        db.add(history)
    
    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/api/subtasks/{subtask_id}")
def delete_subtask(subtask_id: int, db: Session = Depends(get_db)):
    """Delete subtask"""
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    story_id = subtask.us_id
    subtask_title = subtask.title
    
    history = StoryHistory(
        us_id=story_id,
        change_type="subtask_deleted",
        old_value=subtask_title,
        changed_by="system"
    )
    db.add(history)
    db.delete(subtask)
    db.commit()
    
    return {"success": True}


# ============ COMMENTS ============

@router.get("/api/user-stories/{story_id}/comments", response_model=List[CommentSchema])
def get_comments(story_id: str, db: Session = Depends(get_db)):
    """Get all comments for a story"""
    story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return db.query(Comment).filter(Comment.us_id == story_id).order_by(Comment.created_at.desc()).all()


@router.post("/api/user-stories/{story_id}/comments", response_model=CommentSchema)
def create_comment(story_id: str, comment: CommentCreate, db: Session = Depends(get_db)):
    """Create new comment for a story"""
    try:
        story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        db_comment = Comment(us_id=story_id, **comment.model_dump())
        db.add(db_comment)
        db.flush()
        
        history = StoryHistory(
            us_id=story_id,
            change_type="comment_added",
            new_value=comment.content[:100],
            changed_by="system"
        )
        db.add(history)
        db.commit()
        db.refresh(db_comment)
        return db_comment
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/comments/{comment_id}", response_model=CommentSchema)
def update_comment(comment_id: int, comment_data: CommentCreate, db: Session = Depends(get_db)):
    """Update comment"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    update_data = comment_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(comment, key, value)
    
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    """Delete comment"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    story_id = comment.us_id
    comment_content = comment.content[:100]
    
    history = StoryHistory(
        us_id=story_id,
        change_type="comment_deleted",
        old_value=comment_content,
        changed_by="system"
    )
    db.add(history)
    db.delete(comment)
    db.commit()
    
    return {"success": True}
