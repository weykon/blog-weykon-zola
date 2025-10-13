#!/usr/bin/env python3
"""
Migrate Markdown blog posts from Zola to PostgreSQL database.
Reads .md files with TOML frontmatter and inserts them into the database.
"""

import os
import re
import psycopg2
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import toml

# Database configuration from environment variables
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'user': os.getenv('POSTGRES_USER', 'blog_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'blog_password'),
    'database': os.getenv('POSTGRES_DB', 'blog_db')
}

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

def parse_frontmatter(content: str) -> Tuple[Dict[str, Any], str]:
    """Parse TOML frontmatter from markdown content"""
    pattern = r'^\+\+\+\n(.*?)\n\+\+\+\n(.*)'
    match = re.match(pattern, content, re.DOTALL)

    if not match:
        return {}, content

    frontmatter_str, body = match.groups()
    try:
        frontmatter = toml.loads(frontmatter_str)
        return frontmatter, body.strip()
    except Exception as e:
        print(f"Error parsing frontmatter: {e}")
        return {}, content

def parse_filename(filename: str) -> Tuple[Optional[int], str]:
    """
    Extract sequence number and title from filename.
    Example: "001-VSCode - window zen mode.md" -> (1, "vscode-window-zen-mode")
    """
    match = re.match(r'^(\d+)-(.+)\.md$', filename)
    if match:
        seq_num = int(match.group(1))
        title_part = match.group(2).lower()
        # Clean up title for slug
        slug = re.sub(r'[^\w\s-]', '', title_part)
        slug = re.sub(r'[\s_]+', '-', slug)
        slug = slug.strip('-')
        return seq_num, slug
    return None, filename.replace('.md', '').lower()

def parse_date(date_str: str) -> datetime:
    """Parse date with multiple format fallbacks"""
    formats = [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    print(f"Warning: Could not parse date '{date_str}', using current time")
    return datetime.now()

def extract_excerpt(content: str, max_length: int = 200) -> str:
    """Extract excerpt from content"""
    # Remove markdown formatting for excerpt
    text = re.sub(r'#+\s+', '', content)  # Remove headers
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # Remove bold
    text = re.sub(r'\*(.+?)\*', r'\1', text)  # Remove italic
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)  # Remove code blocks
    text = re.sub(r'`(.+?)`', r'\1', text)  # Remove inline code

    # Get first paragraph
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    if paragraphs:
        excerpt = paragraphs[0]
        if len(excerpt) > max_length:
            excerpt = excerpt[:max_length] + '...'
        return excerpt
    return ""

def get_or_create_tag(cursor, tag_name: str, category: Optional[str] = None) -> int:
    """Get existing tag or create new one"""
    slug = tag_name.lower().replace(' ', '-')

    # Check if tag exists
    cursor.execute("SELECT id FROM tags WHERE slug = %s", (slug,))
    result = cursor.fetchone()

    if result:
        return result[0]

    # Create new tag
    cursor.execute(
        "INSERT INTO tags (name, slug, category) VALUES (%s, %s, %s) RETURNING id",
        (tag_name, slug, category)
    )
    return cursor.fetchone()[0]

def migrate_markdown_files(blog_dir: str = "../content/blog", author_id: int = 1):
    """Process all markdown files and insert into database"""
    blog_path = Path(blog_dir)
    if not blog_path.exists():
        print(f"Error: Blog directory '{blog_dir}' not found")
        return

    conn = get_db_connection()
    cursor = conn.cursor()

    posts_processed = 0
    posts_skipped = 0

    md_files = sorted(blog_path.glob("*.md"))
    print(f"Found {len(md_files)} markdown files")

    for md_file in md_files:
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            frontmatter, body = parse_frontmatter(content)

            if not frontmatter and not body:
                print(f"Skipping {md_file.name}: Empty file")
                posts_skipped += 1
                continue

            # Extract data from frontmatter
            title = frontmatter.get('title', md_file.stem)
            date_str = frontmatter.get('date', '')
            tags = frontmatter.get('tags', [])
            taxonomies = frontmatter.get('taxonomies', {})

            # Parse filename for sequence and slug
            seq_num, base_slug = parse_filename(md_file.name)
            slug = frontmatter.get('slug', base_slug)

            # Ensure unique slug
            cursor.execute("SELECT id FROM posts WHERE slug = %s", (slug,))
            if cursor.fetchone():
                # Add sequence number to make unique
                if seq_num:
                    slug = f"{seq_num:03d}-{slug}"
                else:
                    slug = f"{md_file.stem}-{datetime.now().strftime('%Y%m%d')}"
                print(f"  Slug conflict, using: {slug}")

            # Parse date
            created_at = parse_date(date_str) if date_str else datetime.now()

            # Generate excerpt
            excerpt = frontmatter.get('description') or extract_excerpt(body)

            # Check if content looks AI-generated (heuristic)
            is_ai_generated = any(marker in body.lower() for marker in
                                  ['generated by', 'ai assistant', 'chatgpt', 'claude'])

            # Insert post
            cursor.execute("""
                INSERT INTO posts (
                    title, slug, content, excerpt, author_id,
                    is_ai_generated, is_draft, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id
            """, (
                title,
                slug,
                body,
                excerpt,
                author_id,
                is_ai_generated,
                False,  # Published by default
                created_at
            ))

            post_id = cursor.fetchone()[0]

            # Handle tags from both 'tags' and 'taxonomies'
            all_tags = set(tags) if isinstance(tags, list) else set()

            # Add taxonomy tags with their categories
            for category, tag_list in taxonomies.items():
                if isinstance(tag_list, list):
                    for tag in tag_list:
                        tag_id = get_or_create_tag(cursor, tag, category)
                        cursor.execute(
                            "INSERT INTO post_tags (post_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (post_id, tag_id)
                        )

            # Add regular tags without category
            for tag in all_tags:
                tag_id = get_or_create_tag(cursor, tag)
                cursor.execute(
                    "INSERT INTO post_tags (post_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (post_id, tag_id)
                )

            conn.commit()
            posts_processed += 1
            print(f"✓ Processed: {md_file.name} -> '{title}' (slug: {slug})")

        except Exception as e:
            conn.rollback()
            print(f"✗ Error processing {md_file.name}: {e}")
            posts_skipped += 1

    cursor.close()
    conn.close()

    print(f"\n=== Migration Complete ===")
    print(f"Posts processed: {posts_processed}")
    print(f"Posts skipped: {posts_skipped}")
    print(f"Total files: {len(md_files)}")

if __name__ == "__main__":
    import sys

    # Allow custom blog directory
    blog_dir = sys.argv[1] if len(sys.argv) > 1 else "../content/blog"

    print("Starting blog post migration from Zola to PostgreSQL...")
    print(f"Blog directory: {blog_dir}")
    print(f"Database: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    print()

    migrate_markdown_files(blog_dir)
