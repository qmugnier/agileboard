"""Import management routes for CSV file uploads"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from io import StringIO
import pandas as pd

from database import get_db, UserStory
from import_utils import import_backlog_from_csv

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/csv")
async def upload_csv(file: UploadFile = File(...), project_id: int = None, db: Session = Depends(get_db)):
    """Upload and import a CSV file with user stories to specified project"""
    try:
        # Validate file
        if not file.filename.endswith('.csv'):
            return {
                "success": False,
                "error": "File must be a CSV file (.csv extension required)"
            }
        
        # Validate project_id if provided
        if project_id:
            from database import Project
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return {
                    "success": False,
                    "error": f"Project with id {project_id} not found"
                }
        
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Validate CSV structure has at least headers and one data row
        lines = text_content.strip().split('\n')
        if len(lines) < 2:
            return {
                "success": False,
                "error": "CSV file must have headers and at least one data row"
            }
        
        # Get count before import
        count_before = db.query(UserStory).count()
        
        # Create a temporary CSV file path or use StringIO
        # Since import_backlog_from_csv expects a file path, we'll use a temp file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as tmp:
            tmp.write(text_content)
            tmp_path = tmp.name
        
        try:
            # Import the CSV (pass project_id if provided)
            import_backlog_from_csv(db, tmp_path, project_id=project_id)
            
            # Get count after import
            count_after = db.query(UserStory).count()
            imported_count = count_after - count_before
            
            return {
                "success": True,
                "message": f"Successfully imported {imported_count} user stories",
                "imported_count": imported_count,
                "total_stories": count_after
            }
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except:
                pass
                
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": f"Import failed: {str(e)}"
        }

