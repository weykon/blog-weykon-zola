#!/usr/bin/env python3
"""
Import blog posts from JSON file to PostgreSQL.
JSON format: Array of objects with: title, slug, content, tags, created_at, is_ai_generated
"""

import os
import json
import psycopg2
from datetime import datetime

DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'user': os.getenv('POSTGRES_USER', 'blog_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'blog_password'),
    'database': os.getenv('POSTGRES_DB', 'blog_db')
}

def import_from_json(json_file: str, author_id: int = 1):
    """Import posts from JSON file"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    with open(json_file, 'r', encoding='utf-8') as f:
        posts_data = json.load(f)

    if not isinstance(posts_data, list):
        print("Error: JSON should be an array of post objects")
        return

    posts_imported = 0
    posts_skipped = 0

    for post_data in posts_data:
        try:
            title = post_data.get('title', '').strip()
            slug = post_data.get('slug', '').strip()
            content = post_data.get('content', '').strip()
            tags = post_data.get('tags', [])
            created_at_str = post_data.get('created_at', '')
            is_ai_generated = post_data.get('is_ai_generated', False)

            if not title or not slug or not content:
                print(f"Skipping post: missing required fields")
                posts_skipped += 1
                continue

            # Parse date
            try:
                created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00')) if created_at_str else datetime.now()
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
        print("Usage: python import_json.py <json_file>")
        sys.exit(1)

    json_file = sys.argv[1]

    if not os.path.exists(json_file):
        print(f"Error: File '{json_file}' not found")
        sys.exit(1)

    print(f"Importing posts from: {json_file}")
    import_from_json(json_file)
