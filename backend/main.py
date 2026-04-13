"""
FastAPI Main Application - Agile Board API
Refactored to use modular router structure
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
from sqlalchemy.orm import Session

from database import get_db, init_db, SessionLocal, UserStory

# Import routers
from routers import auth, sprints, projects, stories, teams, stats, interactions, imports, exports, statuses, epics, config
from import_utils import import_backlog_from_csv, create_sample_sprints

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent
CSV_PATH = PROJECT_ROOT / "data" / "us.csv"


# ============ LIFESPAN HANDLER ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown handler"""
    # Startup
    from database import engine
    from import_utils import create_default_project
    
    init_db()
    db = SessionLocal()
    try:
        # Ensure default project always exists
        create_default_project(db)
        
        count = db.query(UserStory).count()
        if count == 0:
            if CSV_PATH.exists():
                import_backlog_from_csv(db, str(CSV_PATH))
                create_sample_sprints(db)
                print(f"✓ Backlog imported from CSV: {CSV_PATH}")
            else:
                print(f"⚠ CSV file not found at {CSV_PATH}")
                create_sample_sprints(db)
                print("✓ Created sample sprints (no CSV data)")
    finally:
        try:
            db.close()
        except Exception:
            pass
        finally:
            # Dispose of connection pool to clean up unclosed connections
            try:
                engine.dispose()
            except Exception:
                pass
    
    yield
    
    # Shutdown - ensure no connections are left open
    try:
        engine.dispose()
    except Exception:
        pass


# ============ APP CREATION & SETUP ============

app = FastAPI(
    title="Agile Board API",
    version="1.0.0",
    description="Modular FastAPI application for Agile project management",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ INCLUDE ROUTERS ============

app.include_router(auth.router)
app.include_router(sprints.router)
app.include_router(projects.router)
app.include_router(stories.router)
app.include_router(teams.router)
app.include_router(stats.router)
app.include_router(interactions.router)
app.include_router(imports.router)
app.include_router(exports.router)
app.include_router(statuses.router)
app.include_router(epics.router)
app.include_router(config.router)


# ============ PROJECT STATUSES ENDPOINTS (Root Level) ============

@app.post("/api/project-statuses/{status_id}/set-next/{next_status_id}")
def set_next_status_root(status_id: int, next_status_id: int, db: Session = Depends(get_db)):
    """Create a transition from one status to another (root-level endpoint)"""
    from database import ProjectStatus, StatusTransition
    from fastapi import HTTPException
    
    # Look up the from_status
    from_status = db.query(ProjectStatus).filter(ProjectStatus.id == status_id).first()
    if not from_status:
        raise HTTPException(status_code=404, detail="Source status not found")
    
    # Prevent transitions FROM final statuses
    if from_status.is_final:
        raise HTTPException(status_code=400, detail=f"Cannot create transition from final status '{from_status.status_name}'")
    
    # Look up the to_status and verify it's in the same project
    to_status = db.query(ProjectStatus).filter(
        ProjectStatus.id == next_status_id,
        ProjectStatus.project_id == from_status.project_id
    ).first()
    if not to_status:
        raise HTTPException(status_code=404, detail="Target status not found or in different project")
    
    # Check if transition already exists
    existing = db.query(StatusTransition).filter(
        StatusTransition.from_status_id == status_id,
        StatusTransition.to_status_id == next_status_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Transition already exists")
    
    transition = StatusTransition(
        from_status_id=status_id,
        to_status_id=next_status_id
    )
    db.add(transition)
    db.commit()
    db.refresh(transition)
    return transition


@app.delete("/api/project-statuses/{from_status_id}/set-next/{to_status_id}")
def delete_status_transition_root(from_status_id: int, to_status_id: int, db: Session = Depends(get_db)):
    """Delete a status transition (workflow connection)"""
    from database import StatusTransition
    from fastapi import HTTPException
    
    transition = db.query(StatusTransition).filter(
        StatusTransition.from_status_id == from_status_id,
        StatusTransition.to_status_id == to_status_id
    ).first()
    
    if not transition:
        raise HTTPException(status_code=404, detail="Transition not found")
    
    db.delete(transition)
    db.commit()
    return {"message": "Transition deleted successfully"}


@app.put("/api/project-statuses/{project_id}/{status_id}")
def update_project_status_root(project_id: int, status_id: int, status_data: dict, db: Session = Depends(get_db)):
    """Update project status (root-level endpoint)"""
    from database import ProjectStatus
    from fastapi import HTTPException
    from schemas import ProjectStatusUpdate
    
    db_status = db.query(ProjectStatus).filter(
        ProjectStatus.id == status_id,
        ProjectStatus.project_id == project_id
    ).first()
    if not db_status:
        raise HTTPException(status_code=404, detail="Status not found")
    
    # Update fields from request
    update_data = ProjectStatusUpdate(**status_data)
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(db_status, key, value)
    
    db.commit()
    db.refresh(db_status)
    return db_status


@app.delete("/api/status-objects/{project_id}/{status_id}")
def delete_project_status_root(project_id: int, status_id: int, db: Session = Depends(get_db)):
    """Delete project status"""
    from database import ProjectStatus, UserStory
    from fastapi import HTTPException
    
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
        raise HTTPException(status_code=400, detail=f"Cannot delete status with {story_count} stories. Move stories to another status first.")
    
    db.delete(db_status)
    db.commit()
    return {"message": "Status deleted successfully"}


# ============ DEBUG ENDPOINTS ============

@app.get("/api/debug/all-history")
def debug_all_history(db: Session = Depends(get_db)):
    """DEBUG: See all history entries in database"""
    from database import StoryHistory
    history = db.query(StoryHistory).order_by(StoryHistory.created_at.desc()).all()
    return {
        "total": len(history),
        "entries": [
            {
                "id": h.id,
                "us_id": h.us_id,
                "change_type": h.change_type,
                "old_value": h.old_value,
                "new_value": h.new_value,
                "created_at": h.created_at.isoformat() if h.created_at else None
            }
            for h in history
        ]
    }


@app.get("/api/debug/data-summary")
def get_data_summary(db: Session = Depends(get_db)):
    """Debug endpoint to see current data state"""
    from database import Sprint
    total_stories = db.query(UserStory).count()
    backlog_stories = db.query(UserStory).filter(UserStory.sprint_id == None).count()
    
    sprints = db.query(Sprint).all()
    sprint_summary = [{
        "id": s.id,
        "name": s.name,
        "story_count": db.query(UserStory).filter(UserStory.sprint_id == s.id).count()
    } for s in sprints]
    
    return {
        "total_stories": total_stories,
        "backlog_count": backlog_stories,
        "sprints": sprint_summary,
        "sample_backlog_stories": [
            {"story_id": s.story_id, "title": s.title, "sprint_id": s.sprint_id, "status": s.status}
            for s in db.query(UserStory).filter(UserStory.sprint_id == None).limit(3).all()
        ]
    }


# ============ ROOT ENDPOINT ============

@app.get("/")
def root():
    """API root endpoint"""
    return {
        "title": "Agile Board API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
