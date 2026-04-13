#!/usr/bin/env python3
"""
Script to create a closed sprint for testing the timeframe feature.
Run this after the backend is running and the database is initialized.
"""
from datetime import datetime, timedelta
from database import SessionLocal, Sprint, UserStory

def create_test_closed_sprint():
    db = SessionLocal()
    try:
        # Get project 1 (or create if needed)
        project_id = 1
        
        # Check if a closed sprint already exists
        existing_closed = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.status == "closed"
        ).first()
        
        if existing_closed:
            print(f"✓ Closed sprint already exists: {existing_closed.name}")
            return
        
        # Get the earliest sprint to use as a reference
        first_sprint = db.query(Sprint).filter(
            Sprint.project_id == project_id
        ).order_by(Sprint.start_date).first()
        
        if not first_sprint:
            print("✗ No sprints found for project 1. Please create sprints first.")
            return
        
        # Create a closed sprint that ended before the first sprint
        closed_sprint = Sprint(
            project_id=project_id,
            name="Sprint 0 (Previous)",
            goal="Earlier sprint for testing timeframe fallback",
            status="closed",
            start_date=first_sprint.start_date - timedelta(days=20),
            end_date=first_sprint.start_date - timedelta(days=1)
        )
        
        db.add(closed_sprint)
        db.commit()
        
        print(f"✓ Created closed sprint: {closed_sprint.name}")
        print(f"  - Status: {closed_sprint.status}")
        print(f"  - Dates: {closed_sprint.start_date.date()} to {closed_sprint.end_date.date()}")
        print(f"\nNow you can test timeframe=last_closed in the analytics!")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error creating closed sprint: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_closed_sprint()
