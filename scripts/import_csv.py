#!/usr/bin/env python3
"""
Import blog posts from CSV file to PostgreSQL.
CSV format: title, slug, content, tags, created_at, is_ai_generated
"""

import os
import csv
import psycopg2
from datetime import datetime
from typing import Optional

DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'user': os.getenv('POSTGRES_USER', 'blog_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'blog_password'),
    'database': os.getenv('POSTGRES_DB', 'blog_db')
}

def import_from_csv(csv_file: str, author_id: int = 1):
    """Import posts from CSV file"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    posts_imported = 0
    posts_skipped = 0

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            try:
                title = row.get('title', '').strip()
                slug = row.get('slug', '').strip()
                content = row.get('content', '').strip()
                tags = row.get('tags', '').split(',')
                created_at_str = row.get('created_at', '')
                is_ai_generated = row.get('is_ai_generated', 'false').lower() == 'true'

                if not title or not slug or not content:
                    print(f"Skipping row: missing required fields")
                    posts_skipped += 1
                    continue

                # Parse date
                try:
                    created_at = datetime.fromisoformat(created_at_str) if created_at_str else datetime.now()
                except:
                    created_at = datetime.now()

                # Check for duplicates
                cursor.execute("SELECT id FROM posts WHERE slug = %s", (slug,))
                if cursor.fetchone():
                    print(f"Skipping '{title}': slug already exists")
                    posts_skipped += 1
                    continue

                # Insert post
                cursor.execute("""
                    INSERT INTO posts (
                        title, slug, content, author_id, is_ai_generated, is_draft, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, false, %s)
                    RETURNING id
                """, (title, slug, content, author_id, is_ai_generated, created_at))

                post_id = cursor.fetchone()[0]

                # Add tags
                for tag_name in tags:
                    tag_name = tag_name.strip()
                    if not tag_name:
                        continue

                    tag_slug = tag_name.lower().replace(' ', '-')

                    # Get or create tag
                    cursor.execute("SELECT id FROM tags WHERE slug = %s", (tag_slug,))
                    tag = cursor.fetchone()

                    if not tag:
                        cursor.execute(
                            "INSERT INTO tags (name, slug) VALUES (%s, %s) RETURNING id",
                            (tag_name, tag_slug)
                        )
                        tag_id = cursor.fetchone()[0]
                    else:
                        tag_id = tag[0]

                    cursor.execute(
                        "INSERT INTO post_tags (post_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (post_id, tag_id)
                    )

                conn.commit()
                posts_imported += 1
                print(f"✓ Imported: {title}")

            except Exception as e:
                conn.rollback()
                print(f"✗ Error: {e}")
                posts_skipped += 1

    cursor.close()
    conn.close()

    print(f"\n=== Import Complete ===")
    print(f"Posts imported: {posts_imported}")
    print(f"Posts skipped: {posts_skipped}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python import_csv.py <csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]

    if not os.path.exists(csv_file):
        print(f"Error: File '{csv_file}' not found")
        sys.exit(1)

    print(f"Importing posts from: {csv_file}")
    import_from_csv(csv_file)
