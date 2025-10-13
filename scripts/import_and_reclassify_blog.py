#!/usr/bin/env python3
"""
Import missing blog articles and reclassify all as 'post' type
从weykon.com/blog获取回来的都是post，不需要分析其是否内容长短的问题
"""

import os
import re
import psycopg2
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'user': os.getenv('POSTGRES_USER', 'blog_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'blog_password'),
    'database': os.getenv('POSTGRES_DB', 'blog_db')
}

BLOG_DIR = Path("content/blog")

def extract_slug_from_dirname(dirname: str) -> str:
    """Extract slug from directory name (remove number prefix)"""
    slug = re.sub(r'^\d+-', '', dirname)
    return slug

def convert_image_urls(html_content: str) -> str:
    """Convert absolute image URLs to local paths"""
    # Convert https://weykon.com/blog/images/* to /static/images/*
    html_content = re.sub(
        r'https?://weykon\.com/blog/images/',
        '/static/images/',
        html_content
    )
    # Convert relative blog paths
    html_content = re.sub(
        r'(?<!")blog/images/',
        '/static/images/',
        html_content
    )
    return html_content

def extract_content_from_html(html_path: Path) -> Dict:
    """Extract all content from HTML file for database import"""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        # Extract title
        title_tag = soup.find('h2', class_='title')
        if not title_tag:
            title_tag = soup.find('h1')
        title = title_tag.get_text().strip() if title_tag else "Untitled"

        # Extract date
        date_tag = soup.find('p', class_='subtitle')
        created_at = None
        if date_tag:
            strong = date_tag.find('strong')
            if strong:
                date_str = strong.get_text().strip()
                try:
                    created_at = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except:
                    pass

        if not created_at:
            # Fallback to file modification time
            created_at = datetime.fromtimestamp(html_path.stat().st_mtime)

        # Extract full HTML content from container
        container = soup.find('div', class_='container')
        if container:
            # Remove top-bar and other non-content elements
            for elem in container.find_all(['div'], class_=['top-bar', 'color-palette-hook']):
                elem.decompose()

            # Get HTML content and convert to markdown-like format
            # For now, keep it as HTML since we render markdown
            html_content = str(container)

            # Convert image URLs
            html_content = convert_image_urls(html_content)

            # Try to extract plain text for excerpt
            text_content = container.get_text(separator='\n', strip=True)

            # Generate excerpt (first 200 chars of text)
            lines = [line.strip() for line in text_content.split('\n') if line.strip()]
            # Skip title and date lines
            content_lines = [line for line in lines if line != title and not re.match(r'^\d{4}-\d{2}-\d{2}', line)]
            excerpt = ' '.join(content_lines[:3])[:200]
            if len(' '.join(content_lines[:3])) > 200:
                excerpt += '...'
        else:
            html_content = ""
            excerpt = ""

        return {
            'title': title,
            'html_content': html_content,
            'excerpt': excerpt,
            'created_at': created_at,
            'has_content': len(html_content) > 100
        }
    except Exception as e:
        return {
            'error': str(e),
            'has_content': False
        }

def find_matching_post(cursor, slug: str, title: str) -> Optional[Dict]:
    """Find matching post in database by slug or title"""
    # Try exact slug match
    cursor.execute(
        "SELECT id, title, slug, content_type FROM posts WHERE slug = %s",
        (slug,)
    )
    result = cursor.fetchone()
    if result:
        return {
            'id': result[0],
            'title': result[1],
            'slug': result[2],
            'content_type': result[3]
        }

    # Try slug with variations
    slug_variants = [
        slug.replace('-', ''),
        slug.replace('-', '_'),
        slug.replace('_', '-'),
    ]

    for variant in slug_variants:
        cursor.execute(
            "SELECT id, title, slug, content_type FROM posts WHERE slug LIKE %s",
            (f"%{variant}%",)
        )
        result = cursor.fetchone()
        if result:
            return {
                'id': result[0],
                'title': result[1],
                'slug': result[2],
                'content_type': result[3]
            }

    # Try partial title match
    if title and len(title) > 5:
        title_key = re.sub(r'[^\w\s]', '', title.lower())[:30]
        cursor.execute(
            "SELECT id, title, slug, content_type FROM posts WHERE LOWER(title) LIKE %s",
            (f"%{title_key}%",)
        )
        result = cursor.fetchone()
        if result:
            return {
                'id': result[0],
                'title': result[1],
                'slug': result[2],
                'content_type': result[3]
            }

    return None

def import_and_reclassify():
    """Main function to import and reclassify all blog content as 'post'"""
    print("=" * 80)
    print("Blog Import & Reclassification Tool")
    print("=" * 80)
    print("All content from weykon.com/blog will be classified as 'post'")
    print()

    # Get all blog directories
    blog_dirs = [d for d in BLOG_DIR.iterdir() if d.is_dir()]
    print(f"📁 Found {len(blog_dirs)} blog directories")
    print()

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    stats = {
        'reclassified': 0,
        'already_post': 0,
        'imported': 0,
        'skipped': 0,
        'errors': 0
    }

    print("🔄 Processing blog articles...")
    print()

    for blog_dir in sorted(blog_dirs):
        html_file = blog_dir / "index.html"
        if not html_file.exists():
            print(f"  ⚠️  [{blog_dir.name}] No index.html found")
            stats['skipped'] += 1
            continue

        dirname = blog_dir.name
        slug = extract_slug_from_dirname(dirname)

        print(f"  📄 [{dirname}]")
        print(f"     Slug: {slug}")

        # Extract content from HTML
        data = extract_content_from_html(html_file)

        if 'error' in data or not data['has_content']:
            print(f"     ❌ Error: {data.get('error', 'No content')}")
            stats['errors'] += 1
            print()
            continue

        print(f"     Title: {data['title']}")

        # Find matching post in database
        post = find_matching_post(cursor, slug, data['title'])

        if post:
            # Post exists - reclassify if needed
            print(f"     ✓ Found in DB: #{post['id']}")
            print(f"       Current type: {post['content_type']}")

            if post['content_type'] == 'post':
                print(f"     ✓ Already 'post' type")
                stats['already_post'] += 1
            else:
                # Update to 'post' type
                cursor.execute(
                    "UPDATE posts SET content_type = 'post' WHERE id = %s",
                    (post['id'],)
                )
                conn.commit()
                print(f"     ✅ Reclassified to 'post'")
                stats['reclassified'] += 1
        else:
            # Post doesn't exist - import it
            print(f"     ➕ Not in database - importing...")

            try:
                cursor.execute("""
                    INSERT INTO posts (
                        title, slug, content, excerpt,
                        content_type, is_draft, is_ai_generated,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s,
                        'post', false, false,
                        %s, NOW()
                    )
                    RETURNING id
                """, (
                    data['title'],
                    slug,
                    data['html_content'],
                    data['excerpt'],
                    data['created_at']
                ))

                new_id = cursor.fetchone()[0]
                conn.commit()
                print(f"     ✅ Imported as post #{new_id}")
                stats['imported'] += 1
            except Exception as e:
                print(f"     ❌ Import failed: {e}")
                stats['errors'] += 1
                conn.rollback()

        print()

    # Summary
    print("=" * 80)
    print("📊 Summary")
    print("=" * 80)
    print(f"Total processed: {len(blog_dirs)}")
    print(f"  ✅ Reclassified to 'post': {stats['reclassified']}")
    print(f"  ✓  Already 'post': {stats['already_post']}")
    print(f"  ➕ Imported as new posts: {stats['imported']}")
    print(f"  ⚠️  Skipped (no HTML): {stats['skipped']}")
    print(f"  ❌ Errors: {stats['errors']}")
    print()

    # Show current database state
    cursor.execute("""
        SELECT content_type, COUNT(*)
        FROM posts
        GROUP BY content_type
        ORDER BY content_type
    """)
    results = cursor.fetchall()

    print("Current database state:")
    for content_type, count in results:
        print(f"  {content_type}: {count}")

    cursor.close()
    conn.close()

    print()
    print("=" * 80)
    print("✅ Import & Reclassification Complete!")
    print("=" * 80)

if __name__ == "__main__":
    try:
        import_and_reclassify()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
