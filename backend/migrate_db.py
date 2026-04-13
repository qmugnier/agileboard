"""
Database migration script to add missing columns to team_members table.
This script handles schema updates without losing data.
"""
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "agile.db"

def migrate_team_members_table():
    """Add missing columns to team_members table if they don't exist"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Get existing columns
        cursor.execute("PRAGMA table_info(team_members)")
        existing_columns = {row[1] for row in cursor.fetchall()}
        print(f"Existing columns: {existing_columns}")
        
        # Add email column without UNIQUE constraint first (nullable by default)
        if 'email' not in existing_columns:
            print(f"Adding column: email")
            try:
                cursor.execute("ALTER TABLE team_members ADD COLUMN email TEXT")
                print(f"✓ Added email")
            except sqlite3.OperationalError as e:
                print(f"✗ Could not add email: {e}")
        
        # Define columns to add (email already handled)
        columns_to_add = {
            'position': 'TEXT',
            'department': 'TEXT',
            'phone': 'TEXT',
            'avatar': 'TEXT',
            'is_active': 'INTEGER DEFAULT 1',
            'created_at': f'TEXT DEFAULT "{datetime.utcnow().isoformat()}"',
            'updated_at': f'TEXT DEFAULT "{datetime.utcnow().isoformat()}"',
        }
        
        # Add missing columns
        for col_name, col_def in columns_to_add.items():
            if col_name not in existing_columns:
                print(f"Adding column: {col_name}")
                try:
                    cursor.execute(f"ALTER TABLE team_members ADD COLUMN {col_name} {col_def}")
                    print(f"✓ Added {col_name}")
                except sqlite3.OperationalError as e:
                    print(f"✗ Could not add {col_name}: {e}")
            else:
                print(f"Column {col_name} already exists")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"Migrating database at: {DB_PATH}")
    if not DB_PATH.exists():
        print(f"✗ Database not found at {DB_PATH}")
        exit(1)
    migrate_team_members_table()
