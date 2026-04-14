from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# Authentication Schemas
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    stay_connected: bool = False

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    stay_connected: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    team_member_id: Optional[int] = None
    stay_connected: bool = False

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    is_active: bool
    team_member_id: Optional[int] = None
    created_at: datetime

class AuthConfig(BaseModel):
    signup_enabled: bool = True
    ocdc_enabled: bool = False
    ocdc_client_id: Optional[str] = None
    ocdc_discovery_url: Optional[str] = None
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_special: bool = True

# Team Member Schemas
class TeamMemberBase(BaseModel):
    name: str
    role: str
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    is_active: int = 1

class TeamMemberCreate(TeamMemberBase):
    password: Optional[str] = None  # Password for app access user account

class PasswordReset(BaseModel):
    password: str = Field(..., min_length=8)

class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    is_active: Optional[int] = None

class TeamMember(TeamMemberBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Sprint Schemas
class SprintBase(BaseModel):
    name: str
    goal: Optional[str] = None
    is_active: bool = False

class SprintCreate(SprintBase):
    project_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class Sprint(SprintBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    project_id: int
    status: str  # not_started, active, closed
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# Daily Update Schemas
class DailyUpdateBase(BaseModel):
    status: str  # not_started, in_progress, blocked, done
    progress_percent: int = 0
    notes: Optional[str] = None

class DailyUpdateCreate(DailyUpdateBase):
    us_id: str
    team_member_id: Optional[int] = None

class DailyUpdate(DailyUpdateBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    us_id: str
    team_member_id: Optional[int]
    updated_at: datetime

# Epic Schemas
class EpicBase(BaseModel):
    name: str
    color: str = "#9333EA"
    description: Optional[str] = None

class EpicCreate(EpicBase):
    pass

class EpicUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class Epic(EpicBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime

# User Story Schemas
class UserStoryBase(BaseModel):
    epic_id: Optional[int] = None
    title: str
    description: str
    business_value: int
    effort: int

class UserStoryCreate(UserStoryBase):
    story_id: Optional[str] = None
    project_id: int
    sprint_id: Optional[int] = None
    status: Optional[str] = None

class UserStoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    business_value: Optional[int] = None
    effort: Optional[int] = None
    project_id: Optional[int] = None
    sprint_id: Optional[int] = None
    status: Optional[str] = None
    epic_id: Optional[int] = None
    
class UserStory(UserStoryBase):
    model_config = ConfigDict(from_attributes=True)
    
    story_id: str
    project_id: Optional[int]
    sprint_id: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_to: List[TeamMember] = []
    daily_updates: List[DailyUpdate] = []
    epic_obj: Optional[Epic] = None

class UserStoryWithDependencies(UserStory):
    dependencies: List[str] = []

# Dependency Schemas
class DependencyBase(BaseModel):
    dependency_story_id: str
    link_type: str = "depends_on"  # depends_on, blocks, relates_to, duplicates

class DependencyCreate(DependencyBase):
    pass

class Dependency(DependencyBase):
    user_story_id: str
    link_type: str

class DependencyDetail(BaseModel):
    dependent_story_id: str
    dependency_story_id: str
    link_type: str  # depends_on, blocks, relates_to, duplicates
    dependent_title: Optional[str] = None
    dependency_title: Optional[str] = None
    dependent_status: Optional[str] = None
    dependency_status: Optional[str] = None

# Velocity & Stats Schemas
class SprintStats(BaseModel):
    sprint_id: int
    sprint_name: str
    total_effort: int
    completed_effort: int
    in_progress_effort: int
    backlog_effort: int
    velocity: int
    completion_percent: int

class TimeframeInfo(BaseModel):
    type: str  # "auto", "active", "last_closed", "project"
    sprint_id: Optional[int] = None
    sprint_name: Optional[str] = None
    status: Optional[str] = None  # "active", "closed"
    start_date: Optional[str] = None  # ISO format
    end_date: Optional[str] = None  # ISO format
    sprint_count: Optional[int] = None  # For project view
    description: Optional[str] = None

class VelocityMetrics(BaseModel):
    sprints: List[SprintStats]
    average_velocity: float
    trend: str
    timeframe: Optional[TimeframeInfo] = None

class StatusBreakdown(BaseModel):
    backlog: int = 0
    ready: int = 0
    in_progress: int = 0
    done: int = 0

class EffortBreakdown(BaseModel):
    total: int = 0
    completed: int = 0
    in_progress: int = 0
    remaining: int = 0

class ActiveSprintStats(BaseModel):
    timeframe: TimeframeInfo
    sprint_id: int
    sprint_name: str
    goal: Optional[str] = None
    total_stories: int = 0
    status_breakdown: StatusBreakdown = StatusBreakdown()
    effort_breakdown: EffortBreakdown = EffortBreakdown()

class DailyDataPoint(BaseModel):
    day: str
    date: str
    completed_effort: int = 0
    in_progress_effort: int = 0
    remaining_effort: int = 0
    completed_stories: int = 0
    in_progress_stories: int = 0
    remaining_stories: int = 0

class SprintDailyBreakdown(BaseModel):
    sprint_id: int
    sprint_name: str
    start_date: str
    end_date: str
    days: List[DailyDataPoint]

# Assignment Request Schema
class AssignRequest(BaseModel):
    user_id: int

# Subtask Schemas
class SubtaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_completed: bool = False

class SubtaskCreate(SubtaskBase):
    pass

class Subtask(SubtaskBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    us_id: str
    created_at: datetime
    updated_at: datetime

# Comment Schemas
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    author: str

class Comment(CommentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    us_id: str
    author: str
    created_at: datetime
    updated_at: datetime

# Project Status Schemas
class ProjectStatusBase(BaseModel):
    status_name: str
    color: str = "#3B82F6"
    order: int = 0
    is_locked: bool = False
    is_final: bool = False

class ProjectStatusCreate(ProjectStatusBase):
    next_status_id: Optional[int] = None

class ProjectStatusUpdate(BaseModel):
    status_name: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_locked: Optional[bool] = None
    is_final: Optional[bool] = None
    next_status_id: Optional[int] = None

class ProjectStatus(ProjectStatusBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    project_id: int
    is_default: bool = False
    next_status_id: Optional[int] = None
    created_at: datetime

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    is_hidden: bool = False
    num_forecasted_sprints: int = 5  # Number of planned sprints
    default_sprint_duration_days: int = 14  # Default sprint duration in days
    allow_backlog_to_running_sprint: int = 0  # Allow moving backlog to/from running sprints

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_hidden: Optional[bool] = None
    num_forecasted_sprints: Optional[int] = None
    default_sprint_duration_days: Optional[int] = None
    allow_backlog_to_running_sprint: Optional[int] = None

class Project(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    closed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    statuses: List[ProjectStatus] = []
    epics: List[Epic] = []
    team_members: List[TeamMember] = []
# Role Schemas
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: int = 0
    order: int = 0

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[int] = None
    order: Optional[int] = None

class Role(RoleBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime

# Position Schemas
class PositionBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: int = 0
    order: int = 0

class PositionCreate(PositionBase):
    pass

class PositionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[int] = None
    order: Optional[int] = None

class Position(PositionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: int = 0
    order: int = 0

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[int] = None
    order: Optional[int] = None

class Department(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime