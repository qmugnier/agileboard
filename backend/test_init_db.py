#!/usr/bin/env python
"""Test script to initialize database and verify new tables"""
from database import Base, engine, Role, Position, Department, SessionLocal
from sqlalchemy import inspect

# Create all tables
Base.metadata.create_all(bind=engine)

# Check if tables were created
inspector = inspect(engine)
tables = inspector.get_table_names()

print("Tables in database:")
for table in sorted(tables):
    print(f"  ✓ {table}")

# Check if our new tables exist
new_tables = ['roles', 'positions', 'departments']
print("\n--- New Configuration Tables ---")
for table in new_tables:
    if table in tables:
        cols = inspector.get_columns(table)
        print(f"\n✓ {table} table created with columns:")
        for col in cols:
            print(f"  - {col['name']}: {col['type']}")
    else:
        print(f"\n✗ {table} NOT FOUND")

# Insert default roles/positions/departments
print("\n--- Inserting Default Values ---")
db = SessionLocal()
try:
    # Check if defaults already exist
    existing_roles = db.query(Role).filter(Role.is_default == 1).count()
    
    if existing_roles == 0:
        # Create default roles
        default_roles = [
            Role(name='Engineer', is_default=1, order=1),
            Role(name='Senior Engineer', is_default=1, order=2),
            Role(name='Staff Engineer', is_default=1, order=3),
            Role(name='Architect', is_default=1, order=4),
            Role(name='Product Manager', is_default=1, order=5),
            Role(name='QA', is_default=1, order=6),
            Role(name='QA Lead', is_default=1, order=7),
            Role(name='DevOps', is_default=1, order=8),
            Role(name='Scrum Master', is_default=1, order=9),
        ]
        
        default_positions = [
            Position(name='Junior', is_default=1, order=1),
            Position(name='Mid-level', is_default=1, order=2),
            Position(name='Senior', is_default=1, order=3),
            Position(name='Lead', is_default=1, order=4),
            Position(name='Principal', is_default=1, order=5),
        ]
        
        default_departments = [
            Department(name='Backend', is_default=1, order=1),
            Department(name='Frontend', is_default=1, order=2),
            Department(name='Full Stack', is_default=1, order=3),
            Department(name='DevOps', is_default=1, order=4),
            Department(name='QA', is_default=1, order=5),
            Department(name='Product', is_default=1, order=6),
            Department(name='Design', is_default=1, order=7),
        ]
        
        for item in default_roles + default_positions + default_departments:
            db.add(item)
        
        db.commit()
        print(f"✓ Inserted {len(default_roles)} default roles")
        print(f"✓ Inserted {len(default_positions)} default positions")
        print(f"✓ Inserted {len(default_departments)} default departments")
    else:
        print("✓ Default values already exist")
        
finally:
    db.close()

print("\n✅ Database initialization complete!")
