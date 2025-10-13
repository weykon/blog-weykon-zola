#!/usr/bin/env python3
"""
Fetch posts from old blog website and reclassify them as 'post' type in database.
"""

import os
import re
import psycopg2
from typing import List, Dict
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'user': os.getenv('POSTGRES_USER', 'blog_user'),
    'password': os.getenv('POSTGRES_PASSWORD', 'blog_password'),
    'database': os.getenv('POSTGRES_DB', 'blog_db')
}

# Blog post URLs from weykon.com
BLOG_URLS = [
    "https://weykon.com/blog/blog/051-lora-in-mlx/",
    "https://weykon.com/blog/blog/050-gpu-boid-compute/",
    "https://weykon.com/blog/blog/049-trait-upcasting/",
    "https://weykon.com/blog/blog/048-shadow-mapping/",
    "https://weykon.com/blog/blog/047-ready-paint-wgpu/",
    "https://weykon.com/blog/blog/046-trait-comprehension-new/",
    "https://weykon.com/blog/blog/045-wgpu-zai-ci-chu-fa/",
    "https://weykon.com/blog/blog/044-da-xi-tong-he-xiao-zhu-ti/",
    "https://weykon.com/blog/blog/044-kai-shi-adhd-zhu-yi-li-zhang-ai-de-zi-wo-jiu-shu/",
    "https://weykon.com/blog/blog/043-dui-yu-suan-fa-de-xin-de-hao-de-li-jie/",
    "https://weykon.com/blog/blog/042-ji-shu-shang-de-shan-shi-shan-zhong/",
    "https://weykon.com/blog/blog/041-xiao-zong-jie-yi-dian/",
    "https://weykon.com/blog/blog/039-rebuild-this-blog-with-zola/",
    "https://weykon.com/blog/blog/038-qian-duan-za-huo/",
    "https://weykon.com/blog/blog/037-vim-trip-for-me/",
    "https://weykon.com/blog/blog/036-xin-nao-jin-kuang/",
    "https://weykon.com/blog/blog/035-hen-gao-xing-zai-ci/",
]

def extract_slug_from_url(url: str) -> str:
    """Extract slug from URL"""
    # Extract the last part before the trailing slash
    match = re.search(r'/([^/]+)/?$', url)
    if match:
        slug = match.group(1)
        # Remove number prefix like 051-, 050-
        slug = re.sub(r'^\d+-', '', slug)
        return slug
    return ""

def fetch_post_title(url: str) -> str:
    """Fetch post title from website"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # Try to find title in various ways
        title_tag = soup.find('h1')
        if title_tag:
            return title_tag.get_text().strip()

        # Try meta title
        meta_title = soup.find('meta', property='og:title')
        if meta_title and meta_title.get('content'):
            return meta_title['content'].strip()

        # Fallback to page title
        if soup.title:
            return soup.title.string.strip()

        return ""
    except Exception as e:
        print(f"  ⚠️  Error fetching {url}: {e}")
        return ""

def find_matching_post(cursor, slug: str, title: str) -> Dict:
    """Find matching post in database"""
    # Try exact slug match first
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

    # Try slug with variations (remove hyphens, etc)
    slug_variants = [
        slug.replace('-', ''),
        slug.replace('-', '_'),
        re.sub(r'-+', '-', slug),
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

    # Try partial title match if we have a title
    if title:
        # Extract key parts of title (first few meaningful characters)
        title_key = re.sub(r'[^\w\s]', '', title.lower())[:20]
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

def reclassify_posts():
    """Main function to reclassify posts"""
    print("=" * 70)
    print("Blog Post Reclassification Tool")
    print("=" * 70)
    print(f"Total URLs to process: {len(BLOG_URLS)}")
    print()

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    updated_count = 0
    already_post_count = 0
    not_found_count = 0

    for i, url in enumerate(BLOG_URLS, 1):
        print(f"[{i}/{len(BLOG_URLS)}] Processing: {url}")

        # Extract slug from URL
        slug = extract_slug_from_url(url)
        print(f"  Slug: {slug}")

        # Fetch title
        title = fetch_post_title(url)
        if title:
            print(f"  Title: {title}")

        # Find matching post in database
        post = find_matching_post(cursor, slug, title)

        if not post:
            print(f"  ❌ Not found in database")
            not_found_count += 1
            print()
            continue

        print(f"  ✓ Found in DB: #{post['id']} - {post['title']}")
        print(f"    Current type: {post['content_type']}")

        if post['content_type'] == 'post':
            print(f"  ✓ Already classified as 'post'")
            already_post_count += 1
        else:
            # Update to 'post' type
            cursor.execute(
                "UPDATE posts SET content_type = 'post' WHERE id = %s",
                (post['id'],)
            )
            conn.commit()
            print(f"  ✅ Updated to 'post' type")
            updated_count += 1

        print()

    # Summary
    print("=" * 70)
    print("Reclassification Summary")
    print("=" * 70)
    print(f"Total URLs processed: {len(BLOG_URLS)}")
    print(f"Updated to 'post': {updated_count}")
    print(f"Already 'post': {already_post_count}")
    print(f"Not found: {not_found_count}")
    print()

    # Show updated counts
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
    print("=" * 70)
    print("✅ Reclassification complete!")
    print("=" * 70)

if __name__ == "__main__":
    try:
        reclassify_posts()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
