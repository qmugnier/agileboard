"""Utilities for exporting data to Jira-compatible format"""
from sqlalchemy.orm import Session
from database import Project, UserStory, Epic, Sprint, TeamMember
from datetime import datetime
from typing import List, Dict, Any, Optional
import json

class JiraExporter:
    """Export Agile Board data in Jira-compatible format"""
    
    # Business Value → Jira Priority mapping
    PRIORITY_MAP = {
        1: "Lowest",
        2: "Low",
        3: "Medium",
        4: "High",
        5: "Highest"
    }
    
    # Status → Jira Status mapping
    STATUS_MAP = {
        "backlog": "To Do",
        "ready": "To Do",
        "in_progress": "In Progress",
        "done": "Done"
    }
    
    # Link type correspondence
    LINK_TYPES = {
        "depends_on": "depends",
        "blocks": "blocks",
        "relates_to": "relates",
        "duplicates": "duplicates"
    }
    
    @staticmethod
    def export_project(db: Session, project_id: int) -> Dict[str, Any]:
        """Export entire project for Jira"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        return {
            "project": JiraExporter._format_project(project),
            "epics": JiraExporter._format_epics(db, project),
            "issues": JiraExporter._format_issues(db, project),
            "sprints": JiraExporter._format_sprints(db, project),
            "export_metadata": {
                "exported_at": datetime.utcnow().isoformat(),
                "source": "Agile Board",
                "format_version": "1.0"
            }
        }
    
    @staticmethod
    def export_sprint(db: Session, sprint_id: int) -> Dict[str, Any]:
        """Export single sprint for Jira"""
        from database import Sprint
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
        if not sprint:
            raise ValueError(f"Sprint {sprint_id} not found")
        
        stories = db.query(UserStory).filter(UserStory.sprint_id == sprint_id).all()
        
        return {
            "sprint": JiraExporter._format_sprint_detail(sprint),
            "issues": [JiraExporter._format_issue(story) for story in stories],
            "export_metadata": {
                "exported_at": datetime.utcnow().isoformat(),
                "source": "Agile Board",
                "format_version": "1.0"
            }
        }
    
    @staticmethod
    def _format_project(project: Project) -> Dict[str, Any]:
        """Format project data"""
        return {
            "key": project.name.upper().replace(" ", ""),
            "name": project.name,
            "description": project.description or "",
            "type": "software"
        }
    
    @staticmethod
    def _format_epics(db: Session, project: Project) -> List[Dict[str, Any]]:
        """Format epics for export"""
        epics = []
        for epic in project.epics:
            story_count = db.query(UserStory).filter(UserStory.epic_id == epic.id).count()
            epics.append({
                "id": epic.id,
                "name": epic.name,
                "description": epic.description or "",
                "status": epic.status,
                "story_count": story_count,
                "color": epic.color
            })
        return epics
    
    @staticmethod
    def _format_issues(db: Session, project: Project) -> List[Dict[str, Any]]:
        """Format user stories as Jira issues"""
        stories = db.query(UserStory).filter(UserStory.project_id == project.id).all()
        return [JiraExporter._format_issue(story) for story in stories]
    
    @staticmethod
    def _format_issue(story: UserStory) -> Dict[str, Any]:
        """Format single user story as Jira issue"""
        # Map business_value to priority
        priority_level = story.business_value if 1 <= story.business_value <= 5 else 3
        priority_name = JiraExporter.PRIORITY_MAP.get(priority_level, "Medium")
        
        # Convert status
        jira_status = JiraExporter.STATUS_MAP.get(story.status, "To Do")
        
        issue = {
            "key": story.story_id,
            "summary": story.title,
            "description": story.description,
            "type": "Story",
            "priority": priority_name,
            "status": jira_status,
            "story_points": story.effort,
            "custom_fields": {
                "business_value": story.business_value
            }
        }
        
        # Add epic link if present
        if story.epic_id:
            issue["epic_link"] = f"EPIC-{story.epic_id}"
        
        # Add assignees
        if story.assigned_to:
            issue["assignees"] = [
                {"name": member.name, "email": getattr(member, "email", None)}
                for member in story.assigned_to
            ]
        
        # Add dates
        if story.created_at:
            issue["created"] = story.created_at.isoformat()
        if story.updated_at:
            issue["updated"] = story.updated_at.isoformat()
        
        # Add Jira issue key if synced
        if story.jira_issue_key:
            issue["jira_key"] = story.jira_issue_key
        
        return issue
    
    @staticmethod
    def _format_sprints(db: Session, project: Project) -> List[Dict[str, Any]]:
        """Format sprints for export"""
        sprints = db.query(Sprint).filter(Sprint.project_id == project.id).all()
        result = []
        
        for sprint in sprints:
            story_count = db.query(UserStory).filter(UserStory.sprint_id == sprint.id).count()
            result.append({
                "id": sprint.id,
                "name": sprint.name,
                "status": sprint.status,
                "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
                "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
                "goal": sprint.goal,
                "story_count": story_count
            })
        
        return result
    
    @staticmethod
    def _format_sprint_detail(sprint: Sprint) -> Dict[str, Any]:
        """Format detailed sprint information"""
        return {
            "id": sprint.id,
            "name": sprint.name,
            "status": sprint.status,
            "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
            "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
            "goal": sprint.goal
        }
    
    @staticmethod
    def export_with_dependencies(db: Session, project_id: int) -> Dict[str, Any]:
        """Export with issue links/dependencies"""
        data = JiraExporter.export_project(db, project_id)
        
        # Add issue links
        issues_by_id = {issue["key"]: issue for issue in data["issues"]}
        
        # Fetch all dependencies for this project
        from sqlalchemy import and_
        from database import us_dependencies
        
        issues = db.query(UserStory).filter(UserStory.project_id == project_id).all()
        
        for issue in data["issues"]:
            story = next((s for s in issues if s.story_id == issue["key"]), None)
            if not story or not story.dependencies:
                continue
            
            links = []
            for dep in story.dependencies:
                # Get link type from association table
                link_type = db.query(us_dependencies.c.link_type).filter(
                    and_(
                        us_dependencies.c.dependent_id == story.story_id,
                        us_dependencies.c.dependency_id == dep.story_id
                    )
                ).scalar()
                
                link_type = link_type or "depends_on"
                jira_link_type = JiraExporter.LINK_TYPES.get(link_type, "relates")
                
                links.append({
                    "type": jira_link_type,
                    "target": dep.story_id
                })
            
            if links:
                issue["issue_links"] = links
        
        return data
    
    @staticmethod
    def validate_export_completeness(db: Session, project_id: int) -> Dict[str, Any]:
        """Validate that data is complete for export"""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"valid": False, "errors": ["Project not found"]}
        
        stories = db.query(UserStory).filter(UserStory.project_id == project_id).all()
        errors = []
        warnings = []
        
        story_count = len(stories)
        if story_count == 0:
            errors.append("No user stories in project")
        
        # Check for completeness
        for story in stories:
            if not story.title or not story.title.strip():
                errors.append(f"Story {story.story_id}: Missing title")
            if not story.description or not story.description.strip():
                warnings.append(f"Story {story.story_id}: Missing description")
            if story.effort <= 0:
                warnings.append(f"Story {story.story_id}: No effort points assigned")
        
        return {
            "valid": len(errors) == 0,
            "story_count": story_count,
            "errors": errors,
            "warnings": warnings
        }
