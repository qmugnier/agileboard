"""Statistics and analytics routes"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db, Sprint, UserStory, StoryHistory, Project
from schemas import VelocityMetrics, SprintStats, TimeframeInfo, ActiveSprintStats, StatusBreakdown, EffortBreakdown, SprintDailyBreakdown, DailyDataPoint

router = APIRouter(prefix="/api/stats", tags=["stats"])


def get_sprint_for_timeframe(project_id: int, timeframe: str = "auto", db: Session = None):
    """
    Smart sprint selection logic based on timeframe:
    - 'auto': Return active sprint if exists, otherwise last closed sprint, otherwise None
    - 'active': Return active sprint only
    - 'last_closed': Return last closed sprint only
    - 'project': Return None (indicates all sprints/project-level data)
    """
    if timeframe == "project":
        return None
    
    # Get active sprint first
    active_sprint = db.query(Sprint).filter(
        Sprint.project_id == project_id,
        Sprint.status == "active"
    ).first()
    
    if active_sprint:
        if timeframe in ["auto", "active"]:
            return active_sprint
        elif timeframe == "last_closed":
            # Find last closed sprint
            pass
    
    # No active sprint, look for last closed
    if timeframe in ["auto", "last_closed"]:
        last_closed = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.status == "closed"
        ).order_by(Sprint.end_date.desc()).first()
        return last_closed
    
    return None


@router.get("/velocity", response_model=VelocityMetrics)
def get_velocity_metrics(
    project_id: int,
    timeframe: str = Query("auto", description="Timeline: auto, active, last_closed, or project"),
    db: Session = Depends(get_db)
):
    """
    Get velocity metrics for the specified timeframe.
    
    Timeframes:
    - auto: Current active sprint if exists, else last closed sprint, else project data
    - active: Only active sprint (error if none exists)
    - last_closed: Only last closed sprint (error if none exists)
    - project: All sprints in project (entire history)
    """
    sprint_stats = []
    timeframe_info = {}
    
    if timeframe == "project":
        # All sprints in project
        sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.end_date).all()
        timeframe_info = {
            "type": "project",
            "description": "All sprints in project",
            "sprint_count": len(sprints)
        }
    else:
        # Single sprint based on timeframe logic
        sprint = get_sprint_for_timeframe(project_id, timeframe, db)
        
        if not sprint:
            if timeframe == "active":
                raise HTTPException(status_code=404, detail="No active sprint found")
            elif timeframe == "last_closed":
                raise HTTPException(status_code=404, detail="No closed sprint found")
            else:  # auto
                # Fall through to project view
                sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.end_date).all()
                timeframe_info = {
                    "type": "project",
                    "description": "No active or closed sprint, showing all project data",
                    "sprint_count": len(sprints)
                }
        else:
            sprints = [sprint]
            timeframe_info = {
                "type": timeframe,
                "sprint_id": sprint.id,
                "sprint_name": sprint.name,
                "status": sprint.status,
                "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
                "end_date": sprint.end_date.isoformat() if sprint.end_date else None
            }
    
    # Calculate stats for each sprint
    for sprint in sprints:
        stories = db.query(UserStory).filter(UserStory.sprint_id == sprint.id).all()
        
        total_effort = sum(s.effort for s in stories)
        completed_effort = sum(s.effort for s in stories if s.status == "done")
        in_progress_effort = sum(s.effort for s in stories if s.status == "in_progress")
        
        completion_percent = int((completed_effort / total_effort * 100) if total_effort > 0 else 0)
        
        sprint_stats.append(SprintStats(
            sprint_id=sprint.id,
            sprint_name=sprint.name,
            total_effort=total_effort,
            completed_effort=completed_effort,
            in_progress_effort=in_progress_effort,
            backlog_effort=total_effort - completed_effort - in_progress_effort,
            velocity=completed_effort,
            completion_percent=completion_percent
        ))
    
    avg_velocity = sum(s.velocity for s in sprint_stats) / len(sprint_stats) if sprint_stats else 0
    trend = "up" if len(sprint_stats) > 1 and sprint_stats[-1].velocity > sprint_stats[-2].velocity else "down"
    
    # Convert timeframe_info dict to TimeframeInfo object
    timeframe_obj = TimeframeInfo(**timeframe_info) if timeframe_info else None
    metrics = VelocityMetrics(sprints=sprint_stats, average_velocity=avg_velocity, trend=trend, timeframe=timeframe_obj)
    return metrics


@router.get("/active-sprint", response_model=ActiveSprintStats)
def get_active_sprint_stats(
    project_id: int,
    timeframe: str = Query("auto", description="Timeline: auto, active, last_closed"),
    db: Session = Depends(get_db)
):
    """
    Get sprint statistics for the specified timeframe.
    
    Timeframes:
    - auto: Current active sprint if exists, else last closed sprint
    - active: Only active sprint (error if none exists)
    - last_closed: Only last closed sprint (error if none exists)
    """
    sprint = get_sprint_for_timeframe(project_id, timeframe, db)
    
    if not sprint:
        if timeframe == "active":
            raise HTTPException(status_code=404, detail="No active sprint found")
        elif timeframe == "last_closed":
            raise HTTPException(status_code=404, detail="No closed sprint found")
        else:  # auto
            raise HTTPException(status_code=404, detail="No active or closed sprint found")
    
    stories = db.query(UserStory).filter(UserStory.sprint_id == sprint.id).all()
    
    # Build timeframe info
    timeframe_info = TimeframeInfo(
        type=timeframe,
        sprint_id=sprint.id,
        sprint_name=sprint.name,
        status=sprint.status,
        start_date=sprint.start_date.isoformat() if sprint.start_date else None,
        end_date=sprint.end_date.isoformat() if sprint.end_date else None
    )
    
    # Build status breakdown
    status_breakdown = StatusBreakdown(
        backlog=len([s for s in stories if s.status == "backlog"]),
        ready=len([s for s in stories if s.status == "ready"]),
        in_progress=len([s for s in stories if s.status == "in_progress"]),
        done=len([s for s in stories if s.status == "done"])
    )
    
    # Build effort breakdown
    effort_breakdown = EffortBreakdown(
        total=sum(s.effort for s in stories) if stories else 0,
        completed=sum(s.effort for s in stories if s.status == "done") if stories else 0,
        in_progress=sum(s.effort for s in stories if s.status == "in_progress") if stories else 0,
        remaining=sum(s.effort for s in stories if s.status not in ["done", "in_progress"]) if stories else 0
    )
    
    return ActiveSprintStats(
        timeframe=timeframe_info,
        sprint_id=sprint.id,
        sprint_name=sprint.name,
        goal=sprint.goal,
        total_stories=len(stories),
        status_breakdown=status_breakdown,
        effort_breakdown=effort_breakdown
    )


@router.get("/sprint-daily-breakdown", response_model=SprintDailyBreakdown)
def get_sprint_daily_breakdown(
    sprint_id: int,
    db: Session = Depends(get_db)
):
    """
    Get daily breakdown for a specific sprint based on actual status history.
    - Always generates all days from sprint start to sprint end (full sprint duration on X-axis)
    - For each day, calculates effort based on actual StoryHistory records
    - Days may have no data if no status changes occurred yet
    """
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    stories = db.query(UserStory).filter(UserStory.sprint_id == sprint_id).all()
    
    if not sprint.end_date:
        raise HTTPException(status_code=400, detail="Sprint end date not set")
    
    sprint_start = sprint.start_date.date() if hasattr(sprint.start_date, 'date') else sprint.start_date
    sprint_end = sprint.end_date.date() if hasattr(sprint.end_date, 'date') else sprint.end_date
    
    # Validate we have an end_date (always required)
    if not sprint_end:
        raise HTTPException(status_code=400, detail="Sprint end date is not set")
    
    # Handle start_date based on sprint status
    if not sprint_start:
        # Pre-forecasted sprint (not yet started): calculate backwards 14 days from pre-calculated end_date
        # The pre-calculated end_date is set when sprint is created, 14 days after start
        sprint_start = sprint_end - timedelta(days=14)
    
    # Print debug info
    print(f"DEBUG: Sprint {sprint.name} - status={sprint.status}, DB: start={sprint.start_date}, end={sprint.end_date} | Used: start={sprint_start}, end={sprint_end}, duration={(sprint_end - sprint_start).days + 1} days")
    
    # Always show ALL sprint days (start to end) on X-axis
    # For active sprints: future days show as 0 (no data yet)
    # For closed sprints: all days have actual historical data
    days = []
    current_date = sprint_start
    day_num = 0
    
    while current_date <= sprint_end:
        # For this specific day, determine status of each story from history
        completed_effort = 0
        in_progress_effort = 0
        remaining_effort = 0
        completed_stories = 0
        in_progress_stories = 0
        remaining_stories = 0
        
        for story in stories:
            # Find the status of this story as of current_date
            # Query the most recent status_changed event on or before current_date
            history_up_to_date = db.query(StoryHistory).filter(
                StoryHistory.us_id == story.story_id,
                StoryHistory.change_type == "status_changed",
                func.date(StoryHistory.created_at) <= current_date
            ).order_by(StoryHistory.created_at.desc()).first()
            
            if history_up_to_date:
                # Use the status from history
                status_on_day = history_up_to_date.new_value
            else:
                # No history entry yet - use story's current status
                status_on_day = story.status
            
            # Clean status: remove whitespace and handle None
            status_on_day = (status_on_day or "").strip().lower() if status_on_day else "ready"
            
            # Add effort to appropriate bucket based on cleaned status
            if status_on_day == "done":
                completed_effort += story.effort
                completed_stories += 1
            elif status_on_day == "in_progress":
                in_progress_effort += story.effort
                in_progress_stories += 1
            else:  # ready, not_started, etc
                remaining_effort += story.effort
                remaining_stories += 1
        
        # Format day label with date
        day_label = f"Day {day_num} ({current_date.strftime('%m/%d')})"
        
        days.append(DailyDataPoint(
            day=day_label,
            date=current_date.isoformat(),
            completed_effort=completed_effort,
            in_progress_effort=in_progress_effort,
            remaining_effort=remaining_effort,
            completed_stories=completed_stories,
            in_progress_stories=in_progress_stories,
            remaining_stories=remaining_stories
        ))
        
        current_date += timedelta(days=1)
        day_num += 1
    
    return SprintDailyBreakdown(
        sprint_id=sprint.id,
        sprint_name=sprint.name,
        start_date=sprint_start.isoformat(),
        end_date=sprint_end.isoformat(),
        days=days
    )
