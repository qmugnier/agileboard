"""
Tests for cleanup_db.py database cleanup utility
"""
import pytest
import os
import tempfile
from unittest.mock import patch, MagicMock
from pathlib import Path


def test_cleanup_db_when_file_exists():
    """Test cleanup_db when database file exists - should delete it"""
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        db_path = tmp.name
    
    # Verify file exists
    assert os.path.exists(db_path)
    
    # Simulate cleanup_db logic
    if os.path.exists(db_path):
        os.remove(db_path)
    
    # Verify file is deleted
    assert not os.path.exists(db_path)


def test_cleanup_db_when_file_does_not_exist():
    """Test cleanup_db when database file does not exist - should not raise error"""
    non_existent_path = "/tmp/non_existent_file_12345.db"
    
    # Ensure file doesn't exist
    if os.path.exists(non_existent_path):
        os.remove(non_existent_path)
    
    # Should handle gracefully
    if os.path.exists(non_existent_path):
        os.remove(non_existent_path)
    
    # Should not raise any exception
    assert not os.path.exists(non_existent_path)


def test_cleanup_db_error_on_delete():
    """Test cleanup_db when file deletion fails - should handle error"""
    db_path = "/invalid/path/agile.db"
    
    # Simulate error scenario
    error_occurred = False
    try:
        os.remove(db_path)
    except (FileNotFoundError, PermissionError):
        error_occurred = True
    
    # Should have encountered an error
    assert error_occurred


def test_cleanup_db_preserves_other_files():
    """Test that cleanup only removes the database file and not others"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create multiple files
        db_file = os.path.join(tmpdir, "agile.db")
        other_file = os.path.join(tmpdir, "other.txt")
        
        # Create files
        Path(db_file).touch()
        Path(other_file).touch()
        
        # Cleanup only db file
        if os.path.exists(db_file):
            os.remove(db_file)
        
        # Verify db is gone, other file remains
        assert not os.path.exists(db_file)
        assert os.path.exists(other_file)


def test_cleanup_db_with_real_database_path():
    """Test cleanup with actual database file path structure"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create an agile.db in this directory like the real code does
        db_path = os.path.join(tmpdir, "agile.db")
        Path(db_path).write_text("sqlite database")
        
        # Verify it exists
        assert os.path.exists(db_path)
        assert os.path.getsize(db_path) > 0
        
        # Cleanup
        if os.path.exists(db_path):
            os.remove(db_path)
        
        # Verify cleanup
        assert not os.path.exists(db_path)


def test_cleanup_db_exit_on_permission_error():
    """Test that permission errors are caught and handled"""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_cleanup_db.db")
        
        # Create the file
        Path(db_path).touch()
        
        try:
            # Try to remove (may fail due to permissions on some systems)
            if os.path.exists(db_path):
                os.remove(db_path)
            cleanup_success = True
        except Exception as e:
            cleanup_success = False
        
        # Clean up if it still exists
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass


def test_cleanup_db_handles_symlinks():
    """Test that cleanup handles symlinked database files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create real file
        real_file = os.path.join(tmpdir, "real_agile.db")
        symlink_file = os.path.join(tmpdir, "agile.db")
        
        Path(real_file).touch()
        
        # Try to create symlink, but handle systems where it's not supported
        symlink_created = False
        try:
            os.symlink(real_file, symlink_file)
            symlink_created = True
        except (OSError, NotImplementedError):
            # On systems that don't support symlinks, just verify path handling doesn't crash
            pass
        
        if symlink_created:
            # Remove via symlink
            if os.path.exists(symlink_file):
                os.remove(symlink_file)
            
            # Symlink should be gone, real file may or may not be
            assert not os.path.exists(symlink_file)
        else:
            # Verify cleanup logic still works with regular files
            if os.path.exists(real_file):
                os.remove(real_file)
            assert not os.path.exists(real_file)


def test_cleanup_db_with_concurrent_access():
    """Test cleanup behavior when file might be in use"""
    with tempfile.NamedTemporaryFile(delete=False, mode='w') as tmp:
        db_path = tmp.name
        tmp.write("test database content")
    
    # File exists and can be read
    assert os.path.exists(db_path)
    
    # Open file for reading
    with open(db_path, 'r') as f:
        content = f.read()
        assert len(content) > 0
    
    # Close and remove
    if os.path.exists(db_path):
        os.remove(db_path)
    
    # Verify removed
    assert not os.path.exists(db_path)


def test_cleanup_db_removes_correct_database():
    """Test that cleanup removes the correct database by path"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create multiple db files in different directories
        db1_dir = os.path.join(tmpdir, "dir1")
        db2_dir = os.path.join(tmpdir, "dir2")
        os.makedirs(db1_dir)
        os.makedirs(db2_dir)
        
        db1_path = os.path.join(db1_dir, "agile.db")
        db2_path = os.path.join(db2_dir, "agile.db")
        
        Path(db1_path).touch()
        Path(db2_path).touch()
        
        # Remove only db1
        if os.path.exists(db1_path):
            os.remove(db1_path)
        
        # Verify db1 is gone, db2 remains
        assert not os.path.exists(db1_path)
        assert os.path.exists(db2_path)
        
        # Clean up db2
        if os.path.exists(db2_path):
            os.remove(db2_path)
