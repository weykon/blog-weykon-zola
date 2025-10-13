#!/usr/bin/env python3
"""
Phase 1: Analyze blog HTML files and compare with database
分析博客 HTML 文件并与数据库对比
"""

import os
import re
import psycopg2
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Dict, List, Tuple
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
    # Remove leading numbers like 001-, 051-, etc
    slug = re.sub(r'^\d+-', '', dirname)
    return slug

def parse_html_file(html_path: Path) -> Dict:
    """Parse HTML file and extract metadata"""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        # Extract title
        title_tag = soup.find('h2', class_='title')
        title = title_tag.get_text().strip() if title_tag else "No title"

        # Extract date
        date_tag = soup.find('p', class_='subtitle')
        date_str = None
        created_at = None
        if date_tag:
            strong = date_tag.find('strong')
            if strong:
                date_str = strong.get_text().strip()
                try:
                    # Parse ISO format: 2025-04-20T09:55:09.04Z
                    created_at = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except:
                    pass

        # Extract content (get all text from container div)
        container = soup.find('div', class_='container')
        if container:
            # Get text content, excluding scripts
            for script in container(['script', 'style']):
                script.decompose()
            content = container.get_text(separator='\n', strip=True)
            content_length = len(content)
        else:
            content = ""
            content_length = 0

        # Count code blocks
        code_blocks = len(soup.find_all('pre'))

        # Count headings
        headings = len(soup.find_all(['h1', 'h2', 'h3', 'h4']))

        # Check for images
        images = soup.find_all('img')
        image_urls = [img.get('src') for img in images if img.get('src')]

        return {
            'title': title,
            'date_str': date_str,
            'created_at': created_at,
            'content_length': content_length,
            'code_blocks': code_blocks,
            'headings': headings,
            'images': image_urls,
            'has_content': content_length > 100
        }
    except Exception as e:
        return {
            'error': str(e),
            'has_content': False
        }

def get_db_posts():
    """Get all posts from database"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, slug, content_type,
               LENGTH(content) as content_len,
               created_at, is_draft
        FROM posts
        ORDER BY created_at DESC
    """)

    posts = []
    for row in cursor.fetchall():
        posts.append({
            'id': row[0],
            'title': row[1],
            'slug': row[2],
            'content_type': row[3],
            'content_len': row[4],
            'created_at': row[5],
            'is_draft': row[6]
        })

    cursor.close()
    conn.close()

    return posts

def find_matching_db_post(slug: str, title: str, db_posts: List[Dict]) -> Dict:
    """Find matching post in database"""
    # Exact slug match
    for post in db_posts:
        if post['slug'] == slug:
            return post

    # Partial slug match
    for post in db_posts:
        if slug in post['slug'] or post['slug'] in slug:
            return post

    # Title match (case insensitive, partial)
    title_lower = title.lower()
    for post in db_posts:
        if title_lower in post['title'].lower() or post['title'].lower() in title_lower:
            return post

    return None

def classify_content_type(metadata: Dict) -> str:
    """Determine if content should be post or mutter"""
    length = metadata.get('content_length', 0)
    code_blocks = metadata.get('code_blocks', 0)
    headings = metadata.get('headings', 0)

    # Post criteria
    if length > 1000:
        return 'post'
    if code_blocks >= 2:
        return 'post'
    if headings >= 3:
        return 'post'

    return 'mutter'

def analyze_blog_content():
    """Main analysis function"""
    print("=" * 80)
    print("Blog Content Analysis Tool")
    print("=" * 80)
    print()

    # Get all blog directories
    blog_dirs = [d for d in BLOG_DIR.iterdir() if d.is_dir()]
    print(f"📁 Found {len(blog_dirs)} blog directories in content/blog/")

    # Get database posts
    db_posts = get_db_posts()
    print(f"💾 Found {len(db_posts)} posts in database")
    print(f"   - {sum(1 for p in db_posts if p['content_type'] == 'post')} posts")
    print(f"   - {sum(1 for p in db_posts if p['content_type'] == 'mutter')} mutters")
    print()

    # Analyze each HTML file
    results = {
        'matched': [],
        'not_in_db': [],
        'error': [],
        'misclassified': []
    }

    print("🔍 Analyzing HTML files...")
    print()

    for blog_dir in sorted(blog_dirs):
        html_file = blog_dir / "index.html"
        if not html_file.exists():
            continue

        dirname = blog_dir.name
        slug = extract_slug_from_dirname(dirname)

        print(f"  [{dirname}]")

        # Parse HTML
        metadata = parse_html_file(html_file)

        if 'error' in metadata:
            print(f"    ❌ Error: {metadata['error']}")
            results['error'].append({
                'dirname': dirname,
                'slug': slug,
                'error': metadata['error']
            })
            continue

        if not metadata['has_content']:
            print(f"    ⚠️  No content found")
            results['error'].append({
                'dirname': dirname,
                'slug': slug,
                'error': 'No content'
            })
            continue

        print(f"    Title: {metadata['title']}")
        print(f"    Date: {metadata['date_str'] or 'N/A'}")
        print(f"    Length: {metadata['content_length']} chars")
        print(f"    Code blocks: {metadata['code_blocks']}")
        print(f"    Headings: {metadata['headings']}")
        print(f"    Images: {len(metadata['images'])}")

        # Classify content
        suggested_type = classify_content_type(metadata)
        print(f"    Suggested type: {suggested_type}")

        # Find in database
        db_post = find_matching_db_post(slug, metadata['title'], db_posts)

        if db_post:
            print(f"    ✓ Found in DB: #{db_post['id']} ({db_post['content_type']})")

            # Check if misclassified
            if db_post['content_type'] != suggested_type:
                print(f"    ⚠️  Type mismatch: DB has '{db_post['content_type']}', should be '{suggested_type}'")
                results['misclassified'].append({
                    'dirname': dirname,
                    'slug': slug,
                    'title': metadata['title'],
                    'db_id': db_post['id'],
                    'db_type': db_post['content_type'],
                    'suggested_type': suggested_type,
                    'content_length': metadata['content_length']
                })

            results['matched'].append({
                'dirname': dirname,
                'slug': slug,
                'db_id': db_post['id'],
                'db_type': db_post['content_type'],
                'metadata': metadata
            })
        else:
            print(f"    ❌ Not found in database")
            results['not_in_db'].append({
                'dirname': dirname,
                'slug': slug,
                'title': metadata['title'],
                'metadata': metadata,
                'suggested_type': suggested_type
            })

        print()

    # Generate report
    print("\n" + "=" * 80)
    print("📊 Analysis Summary")
    print("=" * 80)
    print()
    print(f"Total HTML files analyzed: {len(blog_dirs)}")
    print(f"  ✓ Matched with database: {len(results['matched'])}")
    print(f"  ❌ Not in database: {len(results['not_in_db'])}")
    print(f"  ⚠️  Misclassified: {len(results['misclassified'])}")
    print(f"  ❌ Errors: {len(results['error'])}")
    print()

    # Detailed lists
    if results['not_in_db']:
        print("\n📝 Articles NOT in database (need to import):")
        print("-" * 80)
        for item in results['not_in_db']:
            print(f"  - {item['dirname']}")
            print(f"    Title: {item['title']}")
            print(f"    Suggested type: {item['suggested_type']}")
            print(f"    Length: {item['metadata']['content_length']} chars")
            print()

    if results['misclassified']:
        print("\n⚠️  Misclassified articles (need reclassification):")
        print("-" * 80)
        for item in results['misclassified']:
            print(f"  - {item['dirname']} (DB ID: {item['db_id']})")
            print(f"    Current: {item['db_type']} → Should be: {item['suggested_type']}")
            print(f"    Length: {item['content_length']} chars")
            print()

    if results['error']:
        print("\n❌ Errors:")
        print("-" * 80)
        for item in results['error']:
            print(f"  - {item['dirname']}: {item.get('error', 'Unknown error')}")

    # Save report to file
    report_path = Path("content_analysis_report.md")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Blog Content Analysis Report\n\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        f.write("## Summary\n\n")
        f.write(f"- Total HTML files: {len(blog_dirs)}\n")
        f.write(f"- Matched with DB: {len(results['matched'])}\n")
        f.write(f"- Not in DB: {len(results['not_in_db'])}\n")
        f.write(f"- Misclassified: {len(results['misclassified'])}\n")
        f.write(f"- Errors: {len(results['error'])}\n\n")

        if results['not_in_db']:
            f.write("## Articles to Import\n\n")
            for item in results['not_in_db']:
                f.write(f"### {item['dirname']}\n")
                f.write(f"- **Title**: {item['title']}\n")
                f.write(f"- **Suggested Type**: {item['suggested_type']}\n")
                f.write(f"- **Length**: {item['metadata']['content_length']} chars\n")
                f.write(f"- **Code Blocks**: {item['metadata']['code_blocks']}\n")
                f.write(f"- **Images**: {len(item['metadata']['images'])}\n\n")

        if results['misclassified']:
            f.write("## Misclassified Articles\n\n")
            for item in results['misclassified']:
                f.write(f"### {item['dirname']} (DB ID: {item['db_id']})\n")
                f.write(f"- **Current**: {item['db_type']}\n")
                f.write(f"- **Should be**: {item['suggested_type']}\n")
                f.write(f"- **Length**: {item['content_length']} chars\n\n")

    print()
    print(f"📄 Full report saved to: {report_path}")
    print()
    print("=" * 80)
    print("✅ Analysis complete!")
    print("=" * 80)

    return results

if __name__ == "__main__":
    try:
        analyze_blog_content()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
