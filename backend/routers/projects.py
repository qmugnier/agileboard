"""Project management routes"""



from fastapi import APIRouter, Depends, HTTPException, File, UploadFile



from sqlalchemy.orm import Session



from sqlalchemy import func



from datetime import datetime, UTC, timedelta



from typing import List



import shutil



import os







from database import get_db, Project, ProjectStatus, StatusTransition, Epic, Sprint, UserStory, TeamMember, DailyUpdate, StoryHistory

from schemas import (

    Project as ProjectSchema, ProjectCreate, ProjectUpdate,

    ProjectStatus as ProjectStatusSchema, ProjectStatusCreate, ProjectStatusUpdate,

    Epic as EpicSchema, EpicCreate, EpicUpdate,

    AssignRequest, DailyUpdate as DailyUpdateSchema, DailyUpdateCreate

)



from import_utils import import_backlog_from_csv







router = APIRouter(prefix="/api/projects", tags=["projects"])











@router.get("", response_model=List[ProjectSchema])



def get_projects(db: Session = Depends(get_db), include_hidden: bool = False):



    """Get all projects (exclude hidden projects by default)"""



    query = db.query(Project)



    if not include_hidden:



        query = query.filter(Project.is_hidden == 0)



    return query.all()











@router.get("/{project_id}", response_model=ProjectSchema)



def get_project(project_id: int, db: Session = Depends(get_db)):



    """Get project by ID"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    return project











@router.post("", response_model=ProjectSchema)



def create_project(project: ProjectCreate, db: Session = Depends(get_db)):



    """Create new project with default statuses and initial sprints"""



    db_project = Project(**project.model_dump())



    db.add(db_project)



    db.flush()



    



    # Add default statuses (only 3: ready, in_progress, done)



    default_statuses = [



        ProjectStatus(project_id=db_project.id, status_name="ready", color="#3B82F6", order=1, is_default=1),



        ProjectStatus(project_id=db_project.id, status_name="in_progress", color="#F59E0B", order=2, is_default=1),



        ProjectStatus(project_id=db_project.id, status_name="done", color="#10B981", order=3, is_locked=1, is_final=1, is_default=1),



    ]



    for status in default_statuses:



        db.add(status)



    



    db.flush()



    



    # Create bidirectional workflow transitions: ready ↔ in_progress ↔ done



    # Allows stories to move forward and be reopened/moved back



    ready = db.query(ProjectStatus).filter(ProjectStatus.project_id == db_project.id, ProjectStatus.status_name == "ready").first()



    in_progress = db.query(ProjectStatus).filter(ProjectStatus.project_id == db_project.id, ProjectStatus.status_name == "in_progress").first()



    done = db.query(ProjectStatus).filter(ProjectStatus.project_id == db_project.id, ProjectStatus.status_name == "done").first()



    



    if ready and in_progress and done:



        # Create forward workflow transitions only



        # Note: 'done' is a final status and should NOT have outgoing transitions



        # Reopening to backlog is handled separately via special logic



        for transition in [



            # Forward transitions only



            StatusTransition(from_status_id=ready.id, to_status_id=in_progress.id),



            StatusTransition(from_status_id=in_progress.id, to_status_id=done.id),



        ]:



            db.add(transition)



    



    # Create initial sprints with first one active



    # Use the num_forecasted_sprints setting (defaults to 5 if not specified)



    duration = db_project.default_sprint_duration_days or 14



    num_sprints = db_project.num_forecasted_sprints or 5



    for i in range(1, num_sprints + 1):



        start_date = datetime.now(UTC) + timedelta(days=(i-1) * duration)



        end_date = start_date + timedelta(days=duration)



        # No sprint is active by default



        sprint = Sprint(



            project_id=db_project.id,



            name=f"Sprint {i}",



            start_date=start_date,



            end_date=end_date,



            is_active=0,



            status="not_started",



            goal=f"Sprint {i}"



        )



        db.add(sprint)



    



    db.commit()



    db.refresh(db_project)



    return db_project











@router.put("/{project_id}", response_model=ProjectSchema)



def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):



    """Update project and handle sprint count changes"""



    db_project = db.query(Project).filter(Project.id == project_id).first()



    if not db_project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    # Block edits if project is closed (except is_hidden which can be changed)



    if db_project.closed_date:



        update_data = project.model_dump(exclude_unset=True)



        if update_data and not (len(update_data) == 1 and "is_hidden" in update_data):



            raise HTTPException(



                status_code=400,



                detail="Cannot edit a closed project. Only hiding/unhiding is allowed."



            )



    



    # Store old sprint count to handle changes



    old_sprint_count = db_project.num_forecasted_sprints or 5



    



    # Update project fields



    for key, value in project.model_dump(exclude_unset=True).items():



        setattr(db_project, key, value)



    



    # Handle sprint count changes



    new_sprint_count = db_project.num_forecasted_sprints or 5



    if new_sprint_count != old_sprint_count:



        all_sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()



        current_count = len([s for s in all_sprints if s.status not in ['closed', 'completed']])



        



        if new_sprint_count > current_count:



            # Create new sprints



            duration = db_project.default_sprint_duration_days or 14



            # Find the last sprint to determine start date (only sprints with end_date set)



            sprints_with_dates = [s for s in all_sprints if s.end_date is not None]



            last_sprint = max(sprints_with_dates, key=lambda s: s.end_date) if sprints_with_dates else None



            



            # Get the highest sprint number used so far (including closed sprints)



            # to ensure unique names for new sprints



            used_sprint_numbers = [int(s.name.replace("Sprint ", "")) for s in all_sprints 



                                 if s.name.startswith("Sprint ") and s.name.replace("Sprint ", "").isdigit()]



            next_sprint_number = max(used_sprint_numbers) + 1 if used_sprint_numbers else current_count + 1



            



            for i in range(new_sprint_count - current_count):



                if last_sprint and last_sprint.end_date:



                    start_date = last_sprint.end_date + timedelta(days=1)



                else:



                    start_date = datetime.now(UTC)



                end_date = start_date + timedelta(days=duration)



                



                sprint = Sprint(



                    project_id=project_id,



                    name=f"Sprint {next_sprint_number + i}",



                    start_date=start_date,



                    end_date=end_date,



                    is_active=0,



                    status="not_started",



                    goal=f"Sprint {next_sprint_number + i}"



                )



                db.add(sprint)



                last_sprint = sprint



        elif new_sprint_count < current_count:



            # When reducing sprint count, delete extra sprints that have no user stories



            sprints_to_delete = sorted(



                [s for s in all_sprints if s.status not in ['closed', 'completed']],



                key=lambda s: s.start_date,



                reverse=True



            )[:current_count - new_sprint_count]



            



            # Validate that no sprints with stories are being deleted



            for sprint in sprints_to_delete:



                stories_in_sprint = db.query(UserStory).filter(



                    UserStory.sprint_id == sprint.id,



                    UserStory.project_id == project_id



                ).count()



                



                if stories_in_sprint > 0:



                    raise HTTPException(



                        status_code=400,



                        detail=f"Cannot reduce sprint count. {sprint.name} has {stories_in_sprint} user story/stories assigned. Please move or remove them first."



                    )



            



            # If validation passes, delete the sprints



            for sprint in sprints_to_delete:



                db.delete(sprint)



    



    db.commit()



    db.refresh(db_project)



    return db_project











@router.post("/{project_id}/close", response_model=ProjectSchema)



def close_project(project_id: int, db: Session = Depends(get_db)):



    """Close a project: auto-close active sprint and make project read-only"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    if project.closed_date:



        raise HTTPException(status_code=400, detail="Project is already closed")



    



    # Auto-close any active sprint in this project



    active_sprint = db.query(Sprint).filter(



        Sprint.project_id == project_id,



        Sprint.status == "active"



    ).first()



    



    if active_sprint:



        # Move all non-done stories back to backlog



        stories = db.query(UserStory).filter(UserStory.sprint_id == active_sprint.id).all()



        for story in stories:



            if story.status != "done":



                # Log history for this sprint change



                history_entry = StoryHistory(



                    us_id=story.story_id,



                    change_type="sprint_changed",



                    old_value=active_sprint.name,



                    new_value="Backlog",



                    changed_by="system"



                )



                db.add(history_entry)



                



                # Move to backlog



                story.sprint_id = None



                story.status = "backlog"



        



        # Close the sprint



        active_sprint.status = "closed"



        active_sprint.is_active = 0



        active_sprint.end_date = datetime.now(UTC)



    



    # Close the project



    project.closed_date = datetime.now(UTC)



    project.is_hidden = 1  # Auto-hide when closed



    



    db.commit()



    db.refresh(project)



    return project











@router.delete("/{project_id}")



def delete_project(project_id: int, db: Session = Depends(get_db)):



    """Delete a closed project and all related records (cascading delete)"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    # Only allow deletion of closed projects



    if not project.closed_date:



        raise HTTPException(



            status_code=400,



            detail="Cannot delete an active project. Close it first."



        )



    



    db.delete(project)



    db.commit()



    return {"success": True, "message": f"Project '{project.name}' and all related data deleted"}











@router.get("/{project_id}/sprints")



def get_project_sprints(project_id: int, db: Session = Depends(get_db)):



    """Get all sprints for a project"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    return db.query(Sprint).filter(Sprint.project_id == project_id).all()











# Status endpoints



@router.get("/{project_id}/statuses", response_model=List[ProjectStatusSchema])



def get_project_statuses(project_id: int, db: Session = Depends(get_db)):



    """Get all statuses for a project"""



    return db.query(ProjectStatus).filter(ProjectStatus.project_id == project_id).order_by(ProjectStatus.order).all()











@router.post("/{project_id}/statuses", response_model=ProjectStatusSchema)



def create_project_status(project_id: int, status: ProjectStatusCreate, db: Session = Depends(get_db)):



    """Create new status for project"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    db_status = ProjectStatus(project_id=project_id, **status.model_dump())



    db.add(db_status)



    db.commit()



    db.refresh(db_status)



    return db_status











@router.put("/project-statuses/{status_id}", response_model=ProjectStatusSchema)



def update_project_status(status_id: int, status: ProjectStatusUpdate, db: Session = Depends(get_db)):



    """Update project status"""



    db_status = db.query(ProjectStatus).filter(ProjectStatus.id == status_id).first()



    if not db_status:



        raise HTTPException(status_code=404, detail="Status not found")



    



    for key, value in status.model_dump(exclude_unset=True).items():



        setattr(db_status, key, value)



    



    db.commit()



    db.refresh(db_status)



    return db_status











@router.delete("/project-statuses/{status_id}")



def delete_project_status(status_id: int, db: Session = Depends(get_db)):



    """Delete project status"""



    db_status = db.query(ProjectStatus).filter(ProjectStatus.id == status_id).first()



    if not db_status:



        raise HTTPException(status_code=404, detail="Status not found")



    



    if db_status.is_default:



        raise HTTPException(status_code=400, detail=f"Cannot delete default status '{db_status.status_name}'")



    



    story_count = db.query(UserStory).filter(



        UserStory.status == db_status.status_name,



        UserStory.project_id == db_status.project_id



    ).count()



    if story_count > 0:



        raise HTTPException(status_code=400, detail=f"Cannot delete status: {story_count} stories use it")



    



    db.delete(db_status)



    db.commit()



    return {"success": True}











# Epic management



@router.get("/{project_id}/epics", response_model=List[EpicSchema])



def get_project_epics(project_id: int, db: Session = Depends(get_db)):



    """Get all epics for a project"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    return project.epics











@router.post("/{project_id}/epics", response_model=EpicSchema)



def create_epic(project_id: int, epic: EpicCreate, db: Session = Depends(get_db)):



    """Create new epic"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    db_epic = Epic(**epic.model_dump())



    db.add(db_epic)



    db.flush()



    project.epics.append(db_epic)



    db.commit()



    db.refresh(db_epic)



    return db_epic











# Data import



@router.post("/import/csv")



async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):



    """Upload and import CSV backlog"""



    try:



        temp_path = f"temp_{file.filename}"



        with open(temp_path, "wb") as buffer:



            shutil.copyfileobj(file.file, buffer)



        



        import_backlog_from_csv(db, temp_path)



        os.remove(temp_path)



        



        return {"success": True, "message": "Backlog imported successfully"}



    except Exception as e:



        return {"success": False, "error": str(e)}











# Team member assignment



@router.post("/{project_id}/assign-team")



def assign_team_to_project(project_id: int, request: AssignRequest, db: Session = Depends(get_db)):



    """Assign team member to project"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    member = db.query(TeamMember).filter(TeamMember.id == request.user_id).first()



    if not member:



        raise HTTPException(status_code=404, detail="Team member not found")



    



    if member not in project.team_members:



        project.team_members.append(member)



        db.commit()



    



    return {"success": True}











@router.post("/{project_id}/unassign-team")



def unassign_team_from_project(project_id: int, request: AssignRequest, db: Session = Depends(get_db)):



    """Unassign team member from project"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    member = db.query(TeamMember).filter(TeamMember.id == request.user_id).first()



    if not member:



        raise HTTPException(status_code=404, detail="Team member not found")



    



    # Check if member has any active assignments in this project's stories



    from database import UserStory



    assignment_count = db.query(UserStory).filter(



        UserStory.project_id == project_id,



        UserStory.assigned_to.any(TeamMember.id == request.user_id)



    ).count()



    



    if assignment_count > 0:



        raise HTTPException(



            status_code=400, 



            detail=f"Cannot unassign member from project: has {assignment_count} active story assignment(s). Remove them from stories first."



        )



    



    if member in project.team_members:



        project.team_members.remove(member)



        db.commit()



    



    return {"success": True}











# Daily updates



@router.post("/daily-updates", response_model=DailyUpdateSchema)



def create_daily_update(update: DailyUpdateCreate, db: Session = Depends(get_db)):



    """Create daily update for a story"""



    story = db.query(UserStory).filter(UserStory.story_id == update.us_id).first()



    if not story:



        raise HTTPException(status_code=404, detail="Story not found")



    



    db_update = DailyUpdate(**update.model_dump())



    db.add(db_update)



    db.commit()



    db.refresh(db_update)



    return db_update











@router.get("/{project_id}/check-sprint-reduction")



def check_sprint_reduction(project_id: int, new_sprint_count: int, db: Session = Depends(get_db)):



    """Check if sprint count change is possible for a project"""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    # Get all sprints for the project



    all_sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()



    



    # Count sprints with active or pending status



    active_sprints = [s for s in all_sprints if s.status in ['active', 'pending']]



    forecasted_sprints = [s for s in all_sprints if s.status not in ['closed', 'completed']]



    



    # Can reduce if new count >= number of active sprints



    # Can always increase



    can_change = len(active_sprints) <= new_sprint_count



    



    return {



        "allowed": can_change,



        "current_count": len(forecasted_sprints),



        "new_count": new_sprint_count,



        "active_sprints": len(active_sprints),



        "message": "Sprint count can be updated" if can_change else f"Cannot reduce below {len(active_sprints)} due to active sprints"



    }











@router.get("/{project_id}/transitions")



def get_project_transitions(project_id: int, db: Session = Depends(get_db)):



    """Get all status transitions for a project. Auto-creates defaults if missing."""



    project = db.query(Project).filter(Project.id == project_id).first()



    if not project:



        raise HTTPException(status_code=404, detail="Project not found")



    



    # Get all statuses for this project



    statuses = db.query(ProjectStatus).filter(ProjectStatus.project_id == project_id).all()



    status_ids = [s.id for s in statuses]



    



    # Get all transitions involving these statuses



    transitions = db.query(StatusTransition).filter(



        (StatusTransition.from_status_id.in_(status_ids)) &



        (StatusTransition.to_status_id.in_(status_ids))



    ).all()



    



    # Auto-initialize default transitions if none exist but statuses do



    if len(transitions) == 0 and len(statuses) > 0:



        # Find ready, in_progress, done statuses



        ready_status = next((s for s in statuses if s.status_name == 'ready'), None)



        in_progress_status = next((s for s in statuses if s.status_name == 'in_progress'), None)



        done_status = next((s for s in statuses if s.status_name == 'done'), None)



        



        # Create default transitions if all three exist (forward-only workflow)



        if ready_status and in_progress_status and done_status:



            default_transitions = [



                StatusTransition(from_status_id=ready_status.id, to_status_id=in_progress_status.id),



                StatusTransition(from_status_id=in_progress_status.id, to_status_id=done_status.id),



            ]



            db.add_all(default_transitions)



            db.commit()



            transitions = default_transitions



    



    # Return transitions with full status details



    result = []



    for t in transitions:



        result.append({



            "id": t.id,



            "from_status_id": t.from_status_id,



            "to_status_id": t.to_status_id,



            "from_status": {



                "id": t.from_status.id,



                "status_name": t.from_status.status_name,



                "color": t.from_status.color,



                "order": t.from_status.order



            } if t.from_status else None,



            "to_status": {



                "id": t.to_status.id,



                "status_name": t.to_status.status_name,



                "color": t.to_status.color,



                "order": t.to_status.order



            } if t.to_status else None



        })



    



    return result











@router.post("/project-statuses/{status_id}/set-next/{next_status_id}")



def set_next_status(status_id: int, next_status_id: int, db: Session = Depends(get_db)):



    """Create a transition from one status to another"""



    # Look up the from_status



    from_status = db.query(ProjectStatus).filter(ProjectStatus.id == status_id).first()



    if not from_status:



        raise HTTPException(status_code=404, detail="Source status not found")



    



    # Prevent creating transitions FROM final statuses



    if from_status.is_final:



        raise HTTPException(



            status_code=400,



            detail=f"Cannot create transitions from final status '{from_status.status_name}'. Final statuses are endpoints in the workflow."



        )



    



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



    



    return {



        "id": transition.id,



        "from_status_id": transition.from_status_id,



        "to_status_id": transition.to_status_id,



        "from_status": from_status.status_name,



        "to_status": to_status.status_name



    }











@router.delete("/project-statuses/{from_status_id}/{to_status_id}")



def delete_status_transition(from_status_id: int, to_status_id: int, db: Session = Depends(get_db)):



    """Delete a status transition between two statuses"""



    transition = db.query(StatusTransition).filter(



        StatusTransition.from_status_id == from_status_id,



        StatusTransition.to_status_id == to_status_id



    ).first()



    



    if not transition:



        raise HTTPException(status_code=404, detail="Transition not found")



    



    db.delete(transition)



    db.commit()



    



    return {



        "success": True,



        "message": f"Transition from status {from_status_id} to status {to_status_id} deleted successfully"



    }











@router.get("/daily-updates/{us_id}")



def get_daily_updates(us_id: str, db: Session = Depends(get_db)):



    """Get daily updates for a story"""



    return db.query(DailyUpdate).filter(DailyUpdate.us_id == us_id).all()



