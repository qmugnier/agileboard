"""Export routes for Jira and other formats"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db, Project
from export_utils import JiraExporter
import json
from typing import Optional

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/jira-compatible/project")
def export_project_jira(
    project_id: int = Query(..., description="Project ID to export"),
    include_dependencies: bool = Query(False, description="Include issue links and dependencies"),
    db: Session = Depends(get_db)
):
    """Export project in Jira-compatible JSON format
    
    Returns data structure ready to import into Jira via API or manual import.
    Includes: Epics, Issues(User Stories), Sprints with proper mappings.
    """
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
        
        # Validate data completeness
        validation = JiraExporter.validate_export_completeness(db, project_id)
        if not validation["valid"]:
            raise HTTPException(
                status_code=400,
                detail=f"Export validation failed: {'; '.join(validation['errors'])}"
            )
        
        # Export with or without dependencies
        if include_dependencies:
            data = JiraExporter.export_with_dependencies(db, project_id)
        else:
            data = JiraExporter.export_project(db, project_id)
        
        return {
            "success": True,
            "data": data,
            "validation": validation,
            "message": f"Exported {validation['story_count']} stories from project '{project.name}'"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/jira-compatible/sprint")
def export_sprint_jira(
    sprint_id: int = Query(..., description="Sprint ID to export"),
    db: Session = Depends(get_db)
):
    """Export sprint in Jira-compatible JSON format
    
    Returns sprint data with all assigned stories in Jira format.
    """
    try:
        from database import Sprint
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise HTTPException(status_code=404, detail=f"Sprint {sprint_id} not found")
        
        data = JiraExporter.export_sprint(db, sprint_id)
        story_count = len(data["issues"])
        
        return {
            "success": True,
            "data": data,
            "message": f"Exported sprint '{sprint.name}' with {story_count} stories"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/validation")
def validate_export(
    project_id: int = Query(..., description="Project ID to validate"),
    db: Session = Depends(get_db)
):
    """Validate project data before export
    
    Checks for completeness and identifies missing required fields.
    Returns list of errors and warnings to fix before export.
    """
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
        
        validation = JiraExporter.validate_export_completeness(db, project_id)
        
        return {
            "valid": validation["valid"],
            "story_count": validation["story_count"],
            "errors": validation["errors"],
            "warnings": validation["warnings"],
            "ready_for_export": validation["valid"] and validation["story_count"] > 0
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/mark-synced")
def mark_story_synced(
    story_id: str = Query(..., description="Story ID to mark as synced"),
    jira_issue_key: str = Query(..., description="Jira issue key (e.g., PROJ-123)"),
    db: Session = Depends(get_db)
):
    """Mark a story as synced to Jira
    
    Updates the jira_issue_key and jira_synced_at timestamp for tracking.
    """
    try:
        from database import UserStory
        from datetime import datetime
        
        story = db.query(UserStory).filter(UserStory.story_id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail=f"Story {story_id} not found")
        
        story.jira_issue_key = jira_issue_key
        story.jira_synced_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": f"Story {story_id} marked as synced to {jira_issue_key}",
            "story": {
                "story_id": story.story_id,
                "jira_issue_key": story.jira_issue_key,
                "jira_synced_at": story.jira_synced_at.isoformat()
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark synced: {str(e)}")


@router.get("/format-info")
def export_format_info():
    """Get information about export formats and field mappings
    
    Returns reference information for understanding the export structure.
    """
    return {
        "formats": {
            "jira-compatible": "Jira-standard JSON format for direct API import"
        },
        "field_mappings": {
            "status": {
                "source": ["backlog", "ready", "in_progress", "done"],
                "target": ["To Do", "To Do", "In Progress", "Done"]
            },
            "priority": {
                "source": "business_value (1-5)",
                "target": ["Lowest", "Low", "Medium", "High", "Highest"]
            },
            "effort": {
                "source": "effort (story points)",
                "target": "story_points (Jira)"
            },
            "epic": {
                "source": "epic_id",
                "target": "epic_link (Jira)"
            }
        },
        "link_types": {
            "depends_on": "depends (Jira)",
            "blocks": "blocks (Jira)",
            "relates_to": "relates (Jira)",
            "duplicates": "duplicates (Jira)"
        }
    }
