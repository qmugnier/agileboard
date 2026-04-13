from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, ForeignKey, Table, Text, text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
from pathlib import Path

# Use absolute path to database in workspace root
DB_PATH = Path(__file__).parent.parent / "agile.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Association table for dependencies (with link type for Jira compatibility)
us_dependencies = Table(
    'us_dependencies',
    Base.metadata,
    Column('dependent_id', String, ForeignKey('user_stories.story_id'), primary_key=True),
    Column('dependency_id', String, ForeignKey('user_stories.story_id'), primary_key=True),
    Column('link_type', String, default='depends_on')  # depends_on, blocks, relates_to, duplicates
)

# Association table for user assignments
us_assignments = Table(
    'us_assignments',
    Base.metadata,
    Column('us_id', String, ForeignKey('user_stories.story_id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('team_members.id'), primary_key=True)
)

# Association table for project team members
project_team_members = Table(
    'project_team_members',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('team_member_id', Integer, ForeignKey('team_members.id'), primary_key=True)
)

# Association table for project epics
project_epics = Table(
    'project_epics',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('epic_id', Integer, ForeignKey('epics.id'), primary_key=True)
)

class Sprint(Base):
    __tablename__ = "sprints"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    name = Column(String, index=True)  # e.g., "Sprint 1", "Sprint 2" (unique per project)
    status = Column(String, default="not_started")  # not_started, active, closed
    start_date = Column(DateTime, nullable=True)  # Set when sprint is started
    end_date = Column(DateTime, nullable=True)  # Set when sprint is closed
    is_active = Column(Integer, default=0)  # SQLite doesn't have boolean (deprecated, use status)
    goal = Column(String, nullable=True)
    
    project = relationship("Project", back_populates="sprints")
    user_stories = relationship("UserStory", back_populates="sprint")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_default = Column(Integer, default=0)  # SQLite boolean
    num_forecasted_sprints = Column(Integer, default=5)  # Number of planned sprints
    default_sprint_duration_days = Column(Integer, default=14)  # Default sprint duration in days
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    statuses = relationship("ProjectStatus", back_populates="project", cascade="all, delete-orphan")
    epics = relationship("Epic", secondary=project_epics, back_populates="projects")
    user_stories = relationship("UserStory", back_populates="project")
    team_members = relationship("TeamMember", secondary=project_team_members, back_populates="projects")

class ProjectStatus(Base):
    __tablename__ = "project_statuses"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True)
    status_name = Column(String)  # ready, in_progress, done, or custom
    color = Column(String, default="#3B82F6")  # Hex color code
    order = Column(Integer, default=0)  # Display order
    is_locked = Column(Integer, default=0)  # e.g., done is locked (can't move out)
    is_final = Column(Integer, default=0)  # Ending node - can't edit unless status changed to non-final
    next_status_id = Column(Integer, ForeignKey("project_statuses.id"), nullable=True)  # Workflow transition (deprecated - use StatusTransition table)
    is_default = Column(Integer, default=0)  # ready, in_progress, done cannot be deleted
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="statuses")
    next_status = relationship("ProjectStatus", remote_side=[id], foreign_keys=[next_status_id])
    outgoing_transitions = relationship("StatusTransition", foreign_keys="StatusTransition.from_status_id", back_populates="from_status")
    incoming_transitions = relationship("StatusTransition", foreign_keys="StatusTransition.to_status_id", back_populates="to_status")


class StatusTransition(Base):
    __tablename__ = "status_transitions"
    
    id = Column(Integer, primary_key=True, index=True)
    from_status_id = Column(Integer, ForeignKey("project_statuses.id"), index=True)
    to_status_id = Column(Integer, ForeignKey("project_statuses.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    from_status = relationship("ProjectStatus", foreign_keys=[from_status_id], back_populates="outgoing_transitions")
    to_status = relationship("ProjectStatus", foreign_keys=[to_status_id], back_populates="incoming_transitions")



class Epic(Base):
    __tablename__ = "epics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    color = Column(String, default="#9333EA")  # Hex color code (purple)
    description = Column(Text, nullable=True)
    status = Column(String, default="backlog")  # backlog, in_progress, done (for Jira compatibility)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    projects = relationship("Project", secondary=project_epics, back_populates="epics")
    user_stories = relationship("UserStory", back_populates="epic_obj")


class UserStory(Base):
    __tablename__ = "user_stories"
    
    story_id = Column(String, primary_key=True, index=True)
    epic_id = Column(Integer, ForeignKey("epics.id"), nullable=True)
    title = Column(String)
    description = Column(Text)
    business_value = Column(Integer)
    effort = Column(Integer)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True)
    status = Column(String, default="backlog")  # backlog, ready, in_progress, done
    jira_issue_key = Column(String, nullable=True, unique=True, index=True)  # e.g., "PROJ-123" for tracking
    jira_synced_at = Column(DateTime, nullable=True)  # Timestamp of last Jira sync
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="user_stories")
    sprint = relationship("Sprint", back_populates="user_stories")
    epic_obj = relationship("Epic", back_populates="user_stories")
    assigned_to = relationship("TeamMember", secondary=us_assignments, back_populates="user_stories")
    dependencies = relationship(
        "UserStory",
        secondary=us_dependencies,
        primaryjoin=story_id == us_dependencies.c.dependent_id,
        secondaryjoin=story_id == us_dependencies.c.dependency_id,
        backref="dependents"
    )
    daily_updates = relationship("DailyUpdate", back_populates="user_story", cascade="all, delete-orphan")
    subtasks = relationship("Subtask", back_populates="user_story", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user_story", cascade="all, delete-orphan")
    history = relationship("StoryHistory", back_populates="user_story", cascade="all, delete-orphan")

class TeamMember(Base):
    __tablename__ = "team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    email = Column(String, nullable=True, unique=True, index=True)
    role = Column(String)
    position = Column(String, nullable=True)  # e.g., "Senior", "Lead", "Mid-level"
    department = Column(String, nullable=True)  # e.g., "Backend", "Frontend", "QA"
    phone = Column(String, nullable=True)
    avatar = Column(String, nullable=True)  # URL to avatar image
    is_active = Column(Integer, default=1)  # Whether user can access the application
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user_stories = relationship("UserStory", secondary=us_assignments, back_populates="assigned_to")
    daily_updates = relationship("DailyUpdate", back_populates="team_member")
    projects = relationship("Project", secondary=project_team_members, back_populates="team_members")
    user = relationship("User", uselist=False, back_populates="team_member")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Integer, default=1)  # SQLite boolean
    stay_connected = Column(Integer, default=0)  # Remember me token
    team_member_id = Column(Integer, ForeignKey("team_members.id"), nullable=True, index=True)
    ocdc_id = Column(String, nullable=True)  # OpenID Connect ID
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    team_member = relationship("TeamMember", uselist=False, back_populates="user")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=True)  # Null = global
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    is_default = Column(Integer, default=0)  # Cannot be deleted if default
    order = Column(Integer, default=0)  # Display order
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", foreign_keys=[project_id])

class Position(Base):
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=True)  # Null = global
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    is_default = Column(Integer, default=0)  # Cannot be deleted if default
    order = Column(Integer, default=0)  # Display order
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", foreign_keys=[project_id])

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=True)  # Null = global
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    is_default = Column(Integer, default=0)  # Cannot be deleted if default
    order = Column(Integer, default=0)  # Display order
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", foreign_keys=[project_id])

class DailyUpdate(Base):
    __tablename__ = "daily_updates"
    
    id = Column(Integer, primary_key=True, index=True)
    us_id = Column(String, ForeignKey("user_stories.story_id"))
    team_member_id = Column(Integer, ForeignKey("team_members.id"), nullable=True)
    status = Column(String)  # not_started, in_progress, blocked, done
    progress_percent = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user_story = relationship("UserStory", back_populates="daily_updates")
    team_member = relationship("TeamMember", back_populates="daily_updates")

class Subtask(Base):
    __tablename__ = "subtasks"
    
    id = Column(Integer, primary_key=True, index=True)
    us_id = Column(String, ForeignKey("user_stories.story_id"), index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    is_completed = Column(Integer, default=0)  # SQLite boolean
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user_story = relationship("UserStory", back_populates="subtasks", cascade="all, delete-orphan", single_parent=True)

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    us_id = Column(String, ForeignKey("user_stories.story_id"), index=True)
    author = Column(String)  # Team member name
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user_story = relationship("UserStory", back_populates="comments", cascade="all, delete-orphan", single_parent=True)


class StoryHistory(Base):
    __tablename__ = "story_history"
    
    id = Column(Integer, primary_key=True, index=True)
    us_id = Column(String, ForeignKey("user_stories.story_id"), index=True)
    change_type = Column(String)  # status_changed, assignee_changed, sprint_changed
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    changed_by = Column(String, nullable=True)  # User or system
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user_story = relationship("UserStory", back_populates="history")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database with schema creation and migration support."""
    try:
        # Try to create tables normally first
        Base.metadata.create_all(bind=engine)
        
        # Check if epic_id column exists in user_stories
        with engine.connect() as conn:
            try:
                conn.execute(text("SELECT epic_id FROM user_stories LIMIT 1"))
                # Column exists, no migration needed
            except Exception:
                # Column doesn't exist, need to recreate user_stories table
                print("Migrating user_stories table to add epic_id column...")
                conn.execute(text("DROP TABLE IF EXISTS user_stories"))
                conn.execute(text("DROP TABLE IF EXISTS us_assignments"))
                conn.execute(text("DROP TABLE IF EXISTS us_dependencies"))
                conn.commit()
                
                # Recreate tables with new schema
                Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database initialization error: {e}")
        raise
