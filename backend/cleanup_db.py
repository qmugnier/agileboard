#!/usr/bin/env python
import os
import sys

db_path = os.path.join(os.path.dirname(__file__), 'agile.db')
if os.path.exists(db_path):
    try:
        os.remove(db_path)
        print(f"✓ Deleted database: {db_path}")
    except Exception as e:
        print(f"✗ Error deleting database: {e}")
        sys.exit(1)
else:
    print(f"✓ Database does not exist: {db_path}")
