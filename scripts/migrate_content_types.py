#!/usr/bin/env python3
"""
Migration script to verify and report content_type classification.
This script checks the classification done by the SQL migration.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def verify_migration():
    """
    Verify content type migration and report statistics
    """
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not found in environment")
        sys.exit(1)

    print("=" * 60)
    print("Content Type Migration Verification")
    print("=" * 60)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Check if content_type column exists
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'posts' AND column_name = 'content_type'
        """)
        column_info = cur.fetchone()

        if not column_info:
            print("❌ ERROR: content_type column does not exist")
            print("   Please run SQL migration first:")
            print("   cd backend && cargo sqlx migrate run")
            sys.exit(1)

        print(f"✅ Column exists: {column_info['column_name']}")
        print(f"   Type: {column_info['data_type']}")
        print(f"   Nullable: {column_info['is_nullable']}")
        print()

        # Count total posts
        cur.execute("SELECT COUNT(*) as total FROM posts")
        total = cur.fetchone()['total']
        print(f"📊 Total posts in database: {total}")
        print()

        # Count by content_type
        cur.execute("""
            SELECT
                content_type,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM posts
            GROUP BY content_type
            ORDER BY content_type
        """)
        results = cur.fetchall()

        print("Content Type Distribution:")
        print("-" * 60)
        for row in results:
            print(f"  {row['content_type']:10s}: {row['count']:3d} items ({row['percentage']:5.2f}%)")

        print()

        # Check for NULL values
        cur.execute("SELECT COUNT(*) as null_count FROM posts WHERE content_type IS NULL")
        null_count = cur.fetchone()['null_count']

        if null_count > 0:
            print(f"⚠️  WARNING: Found {null_count} posts with NULL content_type")
        else:
            print("✅ No NULL content_type values found")

        print()

        # Detailed breakdown
        print("Detailed Breakdown:")
        print("-" * 60)

        # Posts analysis
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_draft THEN 1 END) as drafts,
                COUNT(CASE WHEN is_ai_generated THEN 1 END) as ai_generated,
                AVG(view_count) as avg_views,
                AVG(LENGTH(content)) as avg_length
            FROM posts
            WHERE content_type = 'post'
        """)
        post_stats = cur.fetchone()

        print(f"\n  📝 POSTS:")
        print(f"     Total: {post_stats['total']}")
        print(f"     Drafts: {post_stats['drafts']}")
        print(f"     AI Generated: {post_stats['ai_generated']}")
        print(f"     Avg Views: {post_stats['avg_views']:.1f}")
        print(f"     Avg Length: {post_stats['avg_length']:.0f} chars")

        # Mutters analysis
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN is_draft THEN 1 END) as drafts,
                AVG(view_count) as avg_views,
                AVG(LENGTH(content)) as avg_length,
                MAX(LENGTH(content)) as max_length,
                MIN(LENGTH(content)) as min_length
            FROM posts
            WHERE content_type = 'mutter'
        """)
        mutter_stats = cur.fetchone()

        print(f"\n  💬 MUTTERS:")
        print(f"     Total: {mutter_stats['total']}")
        print(f"     Drafts: {mutter_stats['drafts']}")
        print(f"     Avg Views: {mutter_stats['avg_views']:.1f}")
        print(f"     Avg Length: {mutter_stats['avg_length']:.0f} chars")
        print(f"     Length Range: {mutter_stats['min_length']}-{mutter_stats['max_length']} chars")

        # Check indexes
        print()
        print("Index Verification:")
        print("-" * 60)

        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'posts'
            AND indexname LIKE '%content_type%'
        """)
        indexes = cur.fetchall()

        if indexes:
            for idx in indexes:
                print(f"  ✅ {idx['indexname']}")
        else:
            print("  ⚠️  No content_type indexes found")

        print()
        print("=" * 60)
        print("✅ Migration verification complete!")
        print("=" * 60)

        # Sample data
        print("\nSample Posts (first 3):")
        cur.execute("""
            SELECT id, title, content_type, LENGTH(content) as content_len, view_count
            FROM posts
            WHERE content_type = 'post'
            ORDER BY created_at DESC
            LIMIT 3
        """)
        for post in cur.fetchall():
            print(f"  #{post['id']}: {post['title'][:50]}... ({post['content_len']} chars, {post['view_count']} views)")

        print("\nSample Mutters (first 3):")
        cur.execute("""
            SELECT id, title, content_type, LENGTH(content) as content_len, view_count
            FROM posts
            WHERE content_type = 'mutter'
            ORDER BY created_at DESC
            LIMIT 3
        """)
        for mutter in cur.fetchall():
            title = mutter['title'][:60] if mutter['title'] else '[no title]'
            print(f"  #{mutter['id']}: {title}... ({mutter['content_len']} chars, {mutter['view_count']} views)")

        cur.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_migration()
