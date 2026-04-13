"""
Add default sprints to existing default project
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "agile.db"

def add_default_sprints():
    """Add default sprints to the default project if they don't exist"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Get default project
        cursor.execute("SELECT id FROM projects WHERE is_default = 1")
        result = cursor.fetchone()
        if not result:
            print("✗ No default project found")
            return
        
        project_id = result[0]
        print(f"Default project ID: {project_id}")
        
        # Check existing sprints
        cursor.execute("SELECT COUNT(*) FROM sprints WHERE project_id = ?", (project_id,))
        count = cursor.fetchone()[0]
        print(f"Existing sprints: {count}")
        
        if count == 0:
            print("Adding default sprints...")
            sprints = [
                (project_id, "Sprint 1", "not_started"),
                (project_id, "Sprint 2", "not_started"),
                (project_id, "Sprint 3", "not_started"),
            ]
            
            for sprint in sprints:
                cursor.execute(
                    "INSERT INTO sprints (project_id, name, status) VALUES (?, ?, ?)",
                    sprint
                )
                print(f"  ✓ Added {sprint[1]}")
            
            conn.commit()
            print("\n✓ Default sprints added successfully!")
        else:
            print("✓ Default sprints already exist")
    
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"Updating database at: {DB_PATH}\n")
    if not DB_PATH.exists():
        print(f"✗ Database not found at {DB_PATH}")
        exit(1)
    add_default_sprints()
