#!/usr/bin/env python3
"""
Execute SQL migration file
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
MIGRATION_FILE = 'backend/migrations/20251007225902_add_content_type_column.sql'

def run_migration():
    """Execute the migration SQL file"""
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not found in environment")
        sys.exit(1)

    if not os.path.exists(MIGRATION_FILE):
        print(f"❌ ERROR: Migration file not found: {MIGRATION_FILE}")
        sys.exit(1)

    print("=" * 60)
    print("Running Content Type Migration")
    print("=" * 60)
    print(f"Migration file: {MIGRATION_FILE}")
    print()

    try:
        # Read migration SQL
        with open(MIGRATION_FILE, 'r') as f:
            sql = f.read()

        print("SQL to execute:")
        print("-" * 60)
        print(sql[:500] + "..." if len(sql) > 500 else sql)
        print("-" * 60)
        print()

        # Connect and execute
        print("Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Executing migration...")
        cur.execute(sql)

        conn.commit()

        print("✅ Migration executed successfully!")
        print()

        # Verify results
        cur.execute("""
            SELECT content_type, COUNT(*)
            FROM posts
            GROUP BY content_type
        """)
        results = cur.fetchall()

        print("Content type distribution:")
        for content_type, count in results:
            print(f"  {content_type}: {count} items")

        cur.close()
        conn.close()

        print()
        print("=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
