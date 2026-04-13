import pandas as pd
from sqlalchemy.orm import Session
from database import UserStory, Sprint, Project, ProjectStatus, Epic, us_dependencies, StatusTransition
from datetime import datetime, timedelta, timezone

def create_default_project(db: Session):
    """Create default project with default statuses and sprints"""
    # Check if default project already exists
    default_project = db.query(Project).filter(Project.is_default == 1).first()
    if not default_project:
        # Create project if it doesn't exist
        default_project = Project(
            name="Default Project",
            description="Default project for all stories",
            is_default=1,
            num_forecasted_sprints=5
        )
        db.add(default_project)
        db.flush()
        
        # Add default statuses (only 3: ready, in_progress, done)
        default_statuses = [
            ProjectStatus(project_id=default_project.id, status_name="ready", color="#3B82F6", order=1),
            ProjectStatus(project_id=default_project.id, status_name="in_progress", color="#F59E0B", order=2),
            ProjectStatus(project_id=default_project.id, status_name="done", color="#10B981", order=3, is_locked=1, is_final=1),
        ]
        for status in default_statuses:
            db.add(status)
        
        db.flush()
        
        # Create forward-only status transitions for the default project
        ready = db.query(ProjectStatus).filter(ProjectStatus.project_id == default_project.id, ProjectStatus.status_name == "ready").first()
        in_progress = db.query(ProjectStatus).filter(ProjectStatus.project_id == default_project.id, ProjectStatus.status_name == "in_progress").first()
        done = db.query(ProjectStatus).filter(ProjectStatus.project_id == default_project.id, ProjectStatus.status_name == "done").first()
        
        if ready and in_progress and done:
            # Create forward workflow transitions only
            for transition in [
                StatusTransition(from_status_id=ready.id, to_status_id=in_progress.id),
                StatusTransition(from_status_id=in_progress.id, to_status_id=done.id),
            ]:
                db.add(transition)
    
    # Ensure default sprints exist (idempotent - only creates if missing)
    sprint_count = db.query(Sprint).filter(Sprint.project_id == default_project.id).count()
    if sprint_count == 0:
        # Create sprints matching num_forecasted_sprints (default is 5)
        duration = default_project.default_sprint_duration_days or 14
        now = datetime.now(timezone.utc)
        num_sprints = default_project.num_forecasted_sprints or 5
        
        # Create sprints: all as not_started (no sprint starts by default)
        for i in range(1, num_sprints + 1):
            start_date = now + timedelta(days=(i-1) * duration)
            end_date = start_date + timedelta(days=duration)
            
            sprint = Sprint(
                project_id=default_project.id,
                name=f"Sprint {i}",
                start_date=start_date,
                end_date=end_date,
                is_active=0,
                status="not_started",
                goal=f"Sprint {i}"
            )
            db.add(sprint)
    
    db.commit()
    return default_project

def import_backlog_from_csv(db: Session, csv_path: str, project_id: int = None):
    """Import user stories from CSV file - stories start in backlog with no sprint
    
    Supports three CSV formats:
    1. User Story format: Epic, Story ID, User Story, Description, Business Value, Effort, Dependencies
       - Epic: Epic name (optional, creates/links epic)
       - Story ID: Unique identifier (required)
       - User Story: Story title (required)
       - Description: Story description (required)
       - Business Value: Numeric value (required)
       - Effort: Fibonacci points (required)
       - Dependencies: Comma-separated story IDs (optional)
    
    2. Old format: Story ID, User Story, Description, Business Value, Effort
       - Legacy format without Epic assignment
    
    3. New format: name, description, priority, story_points (optional), epic_id (optional)
       - Modern format with priority levels
       - priority: low, medium, high
       - story_points: Numeric effort points
       - epic_id: Epic record id
    
    Args:
        db: Database session
        csv_path: Path to CSV file
        project_id: Optional project ID to assign stories to. If not provided, uses default project.
    """
    # Get the project to assign stories to
    from database import Project
    
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            print(f"[WARNING]  Project with id {project_id} not found. Using default project instead.")
            project = db.query(Project).filter(Project.is_default == 1).first()
            if not project:
                project = create_default_project(db)
    else:
        project = db.query(Project).filter(Project.is_default == 1).first()
        if not project:
            project = create_default_project(db)
    
    df = pd.read_csv(csv_path)
    
    # Detect CSV format based on available columns
    has_user_story_format = 'Story ID' in df.columns and 'User Story' in df.columns and 'Business Value' in df.columns and 'Effort' in df.columns
    has_old_format = 'Story ID' in df.columns and 'User Story' in df.columns
    has_new_format = 'name' in df.columns and 'description' in df.columns and 'priority' in df.columns
    
    if not has_user_story_format and not has_old_format and not has_new_format:
        print(f"[WARNING]  CSV format not recognized. Expected:")
        print(f"   - User Story: Epic, Story ID, User Story, Description, Business Value, Effort, Dependencies")
        print(f"   - Old: Story ID, User Story, Description, Business Value, Effort")
        print(f"   - New: name, description, priority, story_points (optional), epic_id (optional)")
        return
    
    # Create epics first if they exist in the data
    if has_user_story_format and 'Epic' in df.columns:
        epic_names = df['Epic'].dropna().unique()
        epic_colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
        for i, epic_name in enumerate(epic_names):
            epic_name = str(epic_name).strip()
            if epic_name:
                # Check if epic already exists
                existing_epic = db.query(Epic).filter(Epic.name == epic_name).first()
                if not existing_epic:
                    color = epic_colors[i % len(epic_colors)]
                    epic = Epic(name=epic_name, color=color)
                    db.add(epic)
                    epic.projects.append(project)
        db.commit()
    elif has_old_format and 'Epic' in df.columns:
        epic_names = df['Epic'].dropna().unique()
        epic_colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']
        for i, epic_name in enumerate(epic_names):
            epic_name = str(epic_name).strip()
            if epic_name:
                # Check if epic already exists
                existing_epic = db.query(Epic).filter(Epic.name == epic_name).first()
                if not existing_epic:
                    color = epic_colors[i % len(epic_colors)]
                    epic = Epic(name=epic_name, color=color)
                    db.add(epic)
                    epic.projects.append(project)
        db.commit()
    
    # Map priority to business_value
    priority_to_bv = {'low': 1, 'medium': 2, 'high': 3}
    
    # Counter for story_id generation
    existing_stories = db.query(UserStory).all()
    max_story_num = 0
    for story in existing_stories:
        if story.story_id.startswith('STORY-'):
            try:
                num = int(story.story_id.split('-')[1])
                max_story_num = max(max_story_num, num)
            except (IndexError, ValueError):
                pass
    
    next_story_num = max_story_num + 1
    
    # Create user stories based on format
    # First pass: collect all stories to be created (for dependency linking)
    stories_to_create = []
    
    for idx, row in df.iterrows():
        try:
            if has_user_story_format:
                # User Story format: Epic, Story ID, User Story, Description, Business Value, Effort, Dependencies
                story_id = str(row.get('Story ID', '')).strip()
                title = str(row.get('User Story', '')).strip()
                description = str(row.get('Description', '')).strip()
                business_value = row.get('Business Value', 0)
                effort = row.get('Effort', 0)
                epic_name = str(row.get('Epic', '')).strip()
                # Handle NaN in dependencies column
                dependencies_str = '' if pd.isna(row.get('Dependencies', '')) else str(row.get('Dependencies', '')).strip()
                
                # Validate required fields
                if not story_id or not title or not description:
                    print(f"[WARNING]  Skipping row {idx + 2}: missing story ID, title, or description")
                    continue
                
                # Convert values
                try:
                    business_value = int(business_value) if not pd.isna(business_value) else 0
                except (ValueError, TypeError):
                    business_value = 0
                
                try:
                    effort = int(effort) if not pd.isna(effort) else 0
                except (ValueError, TypeError):
                    effort = 0
                
                # Find epic by name
                epic_id_int = None
                if epic_name:
                    epic = db.query(Epic).filter(
                        Epic.name == epic_name,
                        Epic.projects.any(Project.id == project.id)
                    ).first()
                    if epic:
                        epic_id_int = epic.id
                
                # Parse dependencies
                dependency_ids = []
                if dependencies_str and dependencies_str != 'nan':
                    dependency_ids = [dep.strip() for dep in dependencies_str.split(',') if dep.strip() and dep.strip() != 'nan']
                
                stories_to_create.append({
                    'story_id': story_id,
                    'title': title,
                    'description': description,
                    'business_value': business_value,
                    'effort': effort,
                    'epic_id': epic_id_int,
                    'dependencies': dependency_ids,
                    'row': idx
                })
                
            elif has_old_format:
                # Old format: Story ID, User Story, Description, Business Value, Effort, (Epic, Dependencies)
                story_id = str(row.get('Story ID', '')).strip()
                title = str(row.get('User Story', '')).strip()
                description = str(row.get('Description', '')).strip()
                business_value = row.get('Business Value', 0)
                effort = row.get('Effort', 0)
                epic_name = str(row.get('Epic', '')).strip() if 'Epic' in df.columns else ''
                # Handle NaN in dependencies column
                dependencies_str = '' if 'Dependencies' not in df.columns or pd.isna(row.get('Dependencies', '')) else str(row.get('Dependencies', '')).strip()
                
                # Validate required fields
                if not story_id or not title or not description:
                    print(f"[WARNING]  Skipping row {idx + 2}: missing story ID, title, or description")
                    continue
                
                # Convert values
                try:
                    business_value = int(business_value) if not pd.isna(business_value) else 0
                except (ValueError, TypeError):
                    business_value = 0
                
                try:
                    effort = int(effort) if not pd.isna(effort) else 0
                except (ValueError, TypeError):
                    effort = 0
                
                # Find epic by name
                epic_id_int = None
                if epic_name:
                    epic = db.query(Epic).filter(
                        Epic.name == epic_name,
                        Epic.projects.any(Project.id == project.id)
                    ).first()
                    if epic:
                        epic_id_int = epic.id
                
                # Parse dependencies
                dependency_ids = []
                if dependencies_str and dependencies_str != 'nan':
                    dependency_ids = [dep.strip() for dep in dependencies_str.split(',') if dep.strip() and dep.strip() != 'nan']
                
                stories_to_create.append({
                    'story_id': story_id,
                    'title': title,
                    'description': description,
                    'business_value': business_value,
                    'effort': effort,
                    'epic_id': epic_id_int,
                    'dependencies': dependency_ids,
                    'row': idx
                })
                
            else:  # has_new_format
                # New format: generate story ID
                story_id = f"STORY-{next_story_num}"
                next_story_num += 1
                
                # Get values from CSV
                title = str(row.get('name', '')).strip()
                description = str(row.get('description', '')).strip()
                priority = str(row.get('priority', 'medium')).strip().lower()
                story_points = row.get('story_points', 0)
                epic_id = row.get('epic_id', None)
                
                # Validate required fields
                if not title or not description:
                    print(f"[WARNING]  Skipping row {idx + 2}: missing name or description")
                    continue
                
                # Convert priority to business_value
                business_value = priority_to_bv.get(priority, 2)
                
                # Convert story_points to effort
                try:
                    if pd.isna(story_points) or story_points == '':
                        effort = 0
                    else:
                        effort = int(float(story_points))
                        if effort < 0:
                            effort = 0
                except (ValueError, TypeError):
                    print(f"[WARNING]  Row {idx + 2}: Invalid story_points '{story_points}', using 0")
                    effort = 0
                
                # Convert epic_id (handle NaN and string values)
                epic_id_int = None
                if epic_id and not pd.isna(epic_id):
                    try:
                        epic_id_int = int(float(epic_id))
                    except (ValueError, TypeError):
                        print(f"[WARNING]  Row {idx + 2}: Invalid epic_id '{epic_id}', skipping epic assignment")
                
                stories_to_create.append({
                    'story_id': story_id,
                    'title': title,
                    'description': description,
                    'business_value': business_value,
                    'effort': effort,
                    'epic_id': epic_id_int,
                    'dependencies': [],
                    'row': idx
                })
        
        except Exception as e:
            print(f"[WARNING]  Error processing row {idx + 2}: {str(e)}")
            continue
    
    # Second pass: create stories and link dependencies
    for story_data in stories_to_create:
        try:
            # Check for existing story
            existing = db.query(UserStory).filter(UserStory.story_id == story_data['story_id']).first()
            if existing:
                print(f"[WARNING]  Story {story_data['story_id']} already exists, skipping")
                continue
            
            # Create user story
            user_story = UserStory(
                story_id=story_data['story_id'],
                title=story_data['title'],
                description=story_data['description'],
                business_value=story_data['business_value'],
                effort=story_data['effort'],
                epic_id=story_data['epic_id'],
                project_id=project.id,
                sprint_id=None,  # Stories start in backlog with no sprint
                status="backlog"
            )
            db.add(user_story)
        
        except Exception as e:
            print(f"[WARNING]  Error importing row {story_data.get('row', '?') + 2}: {str(e)}")
            continue
    
    db.commit()
    
    # Third pass: link dependencies using explicit link_type
    from sqlalchemy import insert
    for story_data in stories_to_create:
        if story_data['dependencies']:
            try:
                story = db.query(UserStory).filter(UserStory.story_id == story_data['story_id']).first()
                if story:
                    for dep_id in story_data['dependencies']:
                        dep_story = db.query(UserStory).filter(UserStory.story_id == dep_id).first()
                        if dep_story:
                            # Add dependency: current story depends on dep_story (link_type='depends_on')
                            # First check if it already exists
                            existing = db.query(us_dependencies).filter(
                                us_dependencies.c.dependent_id == story_data['story_id'],
                                us_dependencies.c.dependency_id == dep_id
                            ).first()
                            
                            if not existing:
                                stmt = insert(us_dependencies).values(
                                    dependent_id=story_data['story_id'],
                                    dependency_id=dep_id,
                                    link_type='depends_on'
                                )
                                db.execute(stmt)
                        else:
                            print(f"[WARNING]  Story {story_data['story_id']}: Dependency '{dep_id}' not found")
            except Exception as e:
                print(f"[WARNING]  Error linking dependencies for row {story_data.get('row', '?') + 2}: {str(e)}")
                continue
    
    db.commit()
    print(f"[OK] Imported {len(stories_to_create)} user stories from CSV")
    return True

def create_sample_sprints(db: Session):
    """Create sample sprints for each project (first one active, rest as not started)"""
    from database import Project
    
    projects = db.query(Project).all()
    
    for project in projects:
        # Check if sprints already exist for this project
        existing_sprints = db.query(Sprint).filter(Sprint.project_id == project.id).all()
        if existing_sprints:
            continue  # Skip if sprints already exist for this project
        
        # Create sprints matching num_forecasted_sprints (default is 5)
        duration = project.default_sprint_duration_days or 14
        now = datetime.now(timezone.utc)
        num_sprints = project.num_forecasted_sprints or 5
        
        for i in range(1, num_sprints + 1):
            start_date = now + timedelta(days=(i-1) * duration)
            end_date = start_date + timedelta(days=duration)
            is_active = 1 if i == 1 else 0
            status = "active" if i == 1 else "not_started"
            
            sprint = Sprint(
                project_id=project.id,
                name=f"Sprint {i}",
                start_date=start_date,
                end_date=end_date,
                is_active=is_active,
                status=status,
                goal=f"Sprint {i}"
            )
            db.add(sprint)
    
    db.commit()
