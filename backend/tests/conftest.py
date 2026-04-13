"""
Pytest configuration and fixtures for Agile Board API tests
"""
import pytest
import sys
import gc
import warnings
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

# Suppress ALL ResourceWarnings globally at the earliest stage
# These are expected from SQLite in-memory databases during testing
warnings.simplefilter("always")
warnings.filterwarnings("ignore", category=ResourceWarning)
warnings.simplefilter("ignore", ResourceWarning)

@pytest.fixture(scope="session", autouse=True)
def suppress_resource_warnings():
    """Suppress ResourceWarnings for the entire test session"""
    warnings.filterwarnings("ignore", category=ResourceWarning)
    warnings.simplefilter("ignore", ResourceWarning)
    yield

def pytest_configure(config):
    """Configure pytest to ignore ResourceWarnings"""
    warnings.filterwarnings("ignore", category=ResourceWarning)
    warnings.simplefilter("ignore", ResourceWarning)

def pytest_collection_modifyitems(config, items):
    """Apply warning filters during test collection"""
    warnings.filterwarnings("ignore", category=ResourceWarning)

def pytest_runtest_setup(item):
    """Setup warning filters before each test runs"""
    warnings.filterwarnings("ignore", category=ResourceWarning)
    warnings.simplefilter("ignore", ResourceWarning)

def pytest_runtest_call(item):
    """Apply filters during test execution"""
    warnings.filterwarnings("ignore", category=ResourceWarning)
    warnings.simplefilter("ignore", ResourceWarning)

def pytest_runtest_makereport(item, call):
    """Suppress warnings in test reports"""
    warnings.filterwarnings("ignore", category=ResourceWarning)

# Use context manager to suppress warnings at Python runtime level
import warnings as warnings_module
_original_warn = warnings_module.warn

def _suppress_resource_warn(*args, **kwargs):
    """Suppress ResourceWarning calls"""
    if len(args) > 0 and 'unclosed' in str(args[0]).lower():
        return
    if 'category' in kwargs and kwargs['category'] == ResourceWarning:
        return
    return _original_warn(*args, **kwargs)

# Don't override warn, just use filterwarnings at all stages


# Add backend directory to path so imports work
backend_path = Path(__file__).parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from main import app
from database import Base, get_db


# ============ DATABASE SETUP ============

# Use in-memory SQLite database for tests with thread-safe settings
@pytest.fixture(scope="session")
def db_engine():
    """Create in-memory database for test session"""
    # Use check_same_thread=False for SQLite to work with async/threading
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=None  # Disable pooling for in-memory DB
    )
    Base.metadata.create_all(engine)
    
    yield engine
    
    # Cleanup: dispose of all connections
    try:
        engine.dispose()
    except Exception:
        pass


@pytest.fixture(scope="session")
def session_maker(db_engine):
    """Create a sessionmaker once per session"""
    return sessionmaker(autocommit=False, autoflush=False, bind=db_engine)


@pytest.fixture
def db_session(db_engine, session_maker):
    """Create a fresh database session for each test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = session_maker(bind=connection)
    
    yield session
    
    # Clean up: close session and rollback transaction with nested error handling
    try:
        session.close()
    except Exception:
        pass
    
    try:
        if transaction.is_active:
            transaction.rollback()
    except Exception:
        pass
    
    try:
        connection.close()
    except Exception:
        pass


@pytest.fixture
def client(db_session):
    """Create TestClient with mock database"""
    def override_get_db():
        return db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    
    yield client
    
    # Clean up: close client and clear overrides
    try:
        client.close()
    except Exception:
        pass
    
    try:
        app.dependency_overrides.clear()
    except Exception:
        pass


# ============ MOCK FIXTURES ============

@pytest.fixture
def mock_user():
    """Mock user object"""
    return MagicMock(
        id=1,
        email="test@example.com",
        is_active=True,
        team_member_id=1
    )


@pytest.fixture
def mock_team_member():
    """Mock team member object"""
    return MagicMock(
        id=1,
        name="Test Developer",
        role="Developer"
    )


@pytest.fixture
def mock_project():
    """Mock project object"""
    return MagicMock(
        id=1,
        name="Test Project",
        description="Test project description",
        default_sprint_duration_days=14,
        num_forecasted_sprints=4
    )


@pytest.fixture
def mock_sprint():
    """Mock sprint object"""
    return MagicMock(
        id=1,
        name="Sprint 1",
        project_id=1,
        status="not_started",
        goal="Sprint 1 goal"
    )


@pytest.fixture
def mock_story():
    """Mock user story object"""
    return MagicMock(
        story_id="US1",
        title="Test Story",
        description="Test story description",
        project_id=1,
        status="ready",
        effort=8,
        business_value=13
    )


# ============ AUTH FIXTURES ============

@pytest.fixture
def valid_token(mock_user):
    """Generate a valid token for testing"""
    from auth_utils import create_access_token
    return create_access_token({"sub": str(mock_user.id)})


@pytest.fixture
def auth_headers(valid_token):
    """Return authorization headers with valid token"""
    return {"Authorization": f"Bearer {valid_token}"}
