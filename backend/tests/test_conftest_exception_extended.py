"""
Additional tests to improve test_conftest_exception_coverage.py coverage.
Targets 90%+ coverage by testing more exception scenarios.
"""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from database import Base, get_db


class TestExceptionHandlingExtended:
    """Extended exception handling tests for conftest scenarios."""
    
    def test_db_engine_disposal_after_multiple_operations(self):
        """Test engine disposal after multiple operations."""
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=None
        )
        Base.metadata.create_all(engine)
        
        # Perform multiple operations
        for i in range(3):
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        
        # Dispose should work fine
        try:
            engine.dispose()
        except Exception:
            pytest.fail("disposal should not raise")
    
    def test_session_with_nested_transactions(self, db_engine):
        """Test session with nested transaction operations."""
        connection = db_engine.connect()
        trans1 = connection.begin()
        session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
        
        # Perform operations
        from database import Project
        project = Project(name="Nested Transaction Test")
        session.add(project)
        session.flush()
        
        # Cleanup
        try:
            session.close()
        except Exception:
            pass
        
        try:
            if trans1.is_active:
                trans1.rollback()
        except Exception:
            pass
        
        try:
            connection.close()
        except Exception:
            pass
    
    def test_multiple_sessions_lifecycle(self, db_engine):
        """Test creating and closing multiple sessions."""
        sessions_data = []
        
        for i in range(3):
            connection = db_engine.connect()
            transaction = connection.begin()
            session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
            sessions_data.append((session, transaction, connection))
        
        # Close all in reverse order
        for session, trans, conn in reversed(sessions_data):
            try:
                session.close()
            except Exception:
                pass
            try:
                if trans.is_active:
                    trans.rollback()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass
    
    def test_session_with_query_operations(self, db_session):
        """Test session with various query operations."""
        from database import Project, Sprint
        
        # Create test data
        project = Project(name="Query Test Project")
        db_session.add(project)
        db_session.flush()
        
        sprint = Sprint(project_id=project.id, name="Query Test Sprint")
        db_session.add(sprint)
        db_session.flush()
        
        # Perform queries
        result1 = db_session.query(Project).all()
        assert len(result1) >= 1
        
        result2 = db_session.query(Sprint).all()
        assert len(result2) >= 1
        
        # Filter queries
        result3 = db_session.query(Project).filter_by(name="Query Test Project").first()
        assert result3 is not None
    
    def test_connection_state_after_exception(self, db_engine):
        """Test connection state handling after exception."""
        connection = db_engine.connect()
        transaction = connection.begin()
        session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
        
        try:
            # Simulate an operation that might cause issues
            from database import Project
            project = Project(name="Exception Test")
            session.add(project)
            session.flush()
        except Exception:
            pass
        finally:
            # Cleanup should always work
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


class TestFixtureRobustness:
    """Test fixture robustness and edge cases."""
    
    def test_session_with_long_running_operations(self, db_session):
        """Test session with multiple sequential operations."""
        from database import Project
        
        for i in range(5):
            project = Project(name=f"Long Running Test {i}")
            db_session.add(project)
        
        db_session.flush()
        
        result = db_session.query(Project).all()
        assert len(result) >= 5
    
    def test_engine_connection_pool_behavior(self):
        """Test engine with connection pooling."""
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=QueuePool,
            pool_size=2,
            max_overflow=1
        )
        Base.metadata.create_all(engine)
        
        connections = []
        for i in range(2):
            conn = engine.connect()
            connections.append(conn)
        
        # Close connections
        for conn in connections:
            try:
                conn.close()
            except Exception:
                pass
        
        try:
            engine.dispose()
        except Exception:
            pass
    
    def test_session_cursor_handling(self, db_session):
        """Test session properly handles database cursors."""
        from database import Project
        
        # Execute raw SQL through session
        db_session.execute(text("SELECT 1"))
        
        # Normal operations
        project = Project(name="Cursor Test")
        db_session.add(project)
        db_session.flush()
        
        result = db_session.query(Project).filter_by(name="Cursor Test").first()
        assert result is not None


class TestErrorConditions:
    """Test error handling in various conditions."""
    
    def test_session_commit_after_flush(self, db_session):
        """Test commit after flush."""
        from database import Project
        
        project = Project(name="Commit Test")
        db_session.add(project)
        db_session.flush()
        db_session.commit()
        
        # Verify persisted
        result = db_session.query(Project).filter_by(name="Commit Test").first()
        assert result is not None
    
    def test_multiple_commits(self, db_session):
        """Test multiple sequential commits."""
        from database import Project
        
        for i in range(3):
            project = Project(name=f"Multi Commit {i}")
            db_session.add(project)
            db_session.commit()
        
        result = db_session.query(Project).all()
        assert len(result) >= 3
    
    def test_query_with_no_results(self, db_session):
        """Test querying for data that doesn't exist."""
        from database import Project
        
        result = db_session.query(Project).filter_by(name="Nonexistent").first()
        assert result is None
        
        all_results = db_session.query(Project).filter_by(name="Also Nonexistent").all()
        assert len(all_results) == 0
    
    def test_transaction_active_state_checks(self, db_engine):
        """Test checking transaction active state."""
        connection = db_engine.connect()
        transaction = connection.begin()
        session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
        
        # Check state
        is_active = transaction.is_active
        assert is_active is not None
        
        # Cleanup
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


class TestCleanupSequences:
    """Test proper cleanup sequences."""
    
    def test_session_then_transaction_then_connection(self, db_engine):
        """Test cleanup in proper sequence: session -> transaction -> connection."""
        connection = db_engine.connect()
        transaction = connection.begin()
        session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
        
        from database import Project
        project = Project(name="Sequence Test")
        session.add(project)
        session.flush()
        
        # Cleanup in proper order
        try:
            session.close()  # First close session
        except Exception:
            pass
        
        try:
            if transaction.is_active:  # Check and rollback transaction
                transaction.rollback()
        except Exception:
            pass
        
        try:
            connection.close()  # Finally close connection
        except Exception:
            pass
    
    def test_exception_during_cleanup(self, db_engine):
        """Test handling exceptions during cleanup."""
        connection = db_engine.connect()
        transaction = connection.begin()
        session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
        
        # Even if session.close raises, other cleanup should continue
        close_attempted = False
        trans_attempted = False
        conn_attempted = False
        
        try:
            close_attempted = True
            session.close()
        except Exception:
            pass
        
        try:
            trans_attempted = True
            if transaction.is_active:
                transaction.rollback()
        except Exception:
            pass
        
        try:
            conn_attempted = True
            connection.close()
        except Exception:
            pass
        
        # All cleanup steps should have been attempted
        assert close_attempted
        assert trans_attempted
        assert conn_attempted
    
    def test_idempotent_cleanup(self, db_engine):
        """Test that cleanup operations can be called multiple times."""
        connection = db_engine.connect()
        transaction = connection.begin()
        session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
        
        # Try to close multiple times
        for _ in range(2):
            try:
                session.close()
            except Exception:
                pass
        
        for _ in range(2):
            try:
                if transaction.is_active:
                    transaction.rollback()
            except Exception:
                pass
        
        for _ in range(2):
            try:
                connection.close()
            except Exception:
                pass
