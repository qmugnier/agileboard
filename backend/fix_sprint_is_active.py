"""
Fix NULL is_active values in sprints table
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "agile.db"

def fix_sprint_is_active():
    """Set is_active to 0 (False) for all sprints where it's NULL"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check current state
        cursor.execute("SELECT COUNT(*) FROM sprints WHERE is_active IS NULL")
        null_count = cursor.fetchone()[0]
        print(f"Sprints with NULL is_active: {null_count}")
        
        if null_count > 0:
            # Update NULL values to 0 (False)
            cursor.execute("UPDATE sprints SET is_active = 0 WHERE is_active IS NULL")
            conn.commit()
            print(f"✓ Updated {cursor.rowcount} sprints")
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM sprints WHERE is_active = 0")
        inactive_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM sprints WHERE is_active = 1")
        active_count = cursor.fetchone()[0]
        
        print(f"\nFinal state:")
        print(f"  Active (1): {active_count}")
        print(f"  Inactive (0): {inactive_count}")
        print(f"\n✓ Migration completed successfully!")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"Fixing sprints in database at: {DB_PATH}\n")
    if not DB_PATH.exists():
        print(f"✗ Database not found at {DB_PATH}")
        exit(1)
    fix_sprint_is_active()
