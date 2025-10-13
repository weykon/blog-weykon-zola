"""
Playwright script to test blog pages and capture screenshots
"""
import asyncio
from playwright.async_api import async_playwright
import os
from datetime import datetime

async def capture_page(page, url, name, description):
    """Capture a page screenshot and return observation"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print(f"Description: {description}")
    print('='*60)

    try:
        # Navigate to the page
        response = await page.goto(url, wait_until='networkidle', timeout=10000)

        # Wait a bit for any dynamic content
        await page.wait_for_timeout(1000)

        # Get page info
        title = await page.title()
        status = response.status if response else "No response"

        # Check for errors in console
        console_messages = []

        # Take screenshot
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        screenshot_path = f"/Users/weykon/Desktop/p/blog.weykon/dev/screenshots/{timestamp}_{name}.png"
        await page.screenshot(path=screenshot_path, full_page=True)

        # Get page content for analysis
        html_content = await page.content()

        # Check for specific elements
        has_errors = "error" in html_content.lower() or "exception" in html_content.lower()

        observation = {
            "name": name,
            "url": url,
            "status": status,
            "title": title,
            "screenshot": screenshot_path,
            "has_errors": has_errors,
            "content_length": len(html_content)
        }

        print(f"✓ Status: {status}")
        print(f"✓ Title: {title}")
        print(f"✓ Screenshot saved: {screenshot_path}")
        print(f"✓ Content length: {len(html_content)} bytes")

        return observation, None

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return None, str(e)

async def analyze_posts_list(page):
    """Analyze posts list page for specific details"""
    try:
        # Check for pagination
        pagination = await page.query_selector('.pagination, .pager, nav[aria-label="pagination"]')
        has_pagination = pagination is not None

        # Count posts
        posts = await page.query_selector_all('article, .post, .post-item, [class*="post"]')
        post_count = len(posts)

        # Check for post count display
        count_text = await page.evaluate('''() => {
            const body = document.body.innerText;
            const match = body.match(/(\d+)\s*(posts?|articles?|篇文章)/i);
            return match ? match[0] : null;
        }''')

        return {
            "has_pagination": has_pagination,
            "post_elements": post_count,
            "count_display": count_text
        }
    except Exception as e:
        print(f"Analysis error: {e}")
        return {}

async def get_first_post_slug(page):
    """Get the first post's slug from the list"""
    try:
        # Try different selectors for post links
        selectors = [
            'article a[href*="/posts/"]',
            '.post a[href*="/posts/"]',
            'a[href*="/posts/"]'
        ]

        for selector in selectors:
            link = await page.query_selector(selector)
            if link:
                href = await link.get_attribute('href')
                if href and '/posts/' in href:
                    return href

        return None
    except Exception as e:
        print(f"Error getting post slug: {e}")
        return None

async def main():
    # Create screenshots directory
    os.makedirs("/Users/weykon/Desktop/p/blog.weykon/dev/screenshots", exist_ok=True)

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        # Collect all observations
        observations = []
        errors = []

        # Store console messages
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        # 1. Test homepage
        obs, err = await capture_page(
            page,
            "http://localhost:3000/",
            "homepage",
            "Blog homepage"
        )
        if obs:
            observations.append(obs)
        if err:
            errors.append({"page": "homepage", "error": err})

        # 2. Test posts list
        obs, err = await capture_page(
            page,
            "http://localhost:3000/posts",
            "posts_list",
            "Posts listing page"
        )
        if obs:
            # Additional analysis for posts list
            analysis = await analyze_posts_list(page)
            obs.update(analysis)
            observations.append(obs)
        if err:
            errors.append({"page": "posts_list", "error": err})

        # Get first post for detail page test
        post_url = await get_first_post_slug(page)

        # 3. Test single post
        if post_url:
            if not post_url.startswith('http'):
                post_url = f"http://localhost:3000{post_url}"

            obs, err = await capture_page(
                page,
                post_url,
                "post_detail",
                "Single post detail page"
            )
            if obs:
                observations.append(obs)
            if err:
                errors.append({"page": "post_detail", "error": err})
        else:
            print("\n⚠ Warning: Could not find a post URL to test detail page")
            errors.append({"page": "post_detail", "error": "No post URL found"})

        # 4. Test admin page
        obs, err = await capture_page(
            page,
            "http://localhost:3000/admin",
            "admin",
            "Admin dashboard"
        )
        if obs:
            observations.append(obs)
        if err:
            errors.append({"page": "admin", "error": err})

        # 5. Test editor page
        obs, err = await capture_page(
            page,
            "http://localhost:3000/admin/editor",
            "editor",
            "Post editor page"
        )
        if obs:
            observations.append(obs)
        if err:
            errors.append({"page": "editor", "error": err})

        # Close browser
        await browser.close()

        # Generate report
        print("\n" + "="*80)
        print("FINAL REPORT")
        print("="*80)

        print("\n📊 Pages Tested:")
        for obs in observations:
            status_icon = "✓" if obs['status'] == 200 else "✗"
            print(f"  {status_icon} {obs['name']}: {obs['status']} - {obs['title']}")

        if errors:
            print("\n❌ Errors Encountered:")
            for err in errors:
                print(f"  • {err['page']}: {err['error']}")

        print("\n📸 Screenshots saved in:")
        print("  /Users/weykon/Desktop/p/blog.weykon/dev/screenshots/")

        # Detailed observations
        print("\n" + "="*80)
        print("DETAILED OBSERVATIONS")
        print("="*80)

        for obs in observations:
            print(f"\n📄 {obs['name'].upper()}")
            print(f"  URL: {obs['url']}")
            print(f"  Status: {obs['status']}")
            print(f"  Title: {obs['title']}")
            print(f"  Has Errors: {obs['has_errors']}")

            if 'has_pagination' in obs:
                print(f"  Has Pagination: {obs['has_pagination']}")
                print(f"  Post Elements: {obs['post_elements']}")
                print(f"  Count Display: {obs['count_display']}")

        # Console logs
        if console_logs:
            print("\n📝 Console Messages:")
            for log in console_logs[:20]:  # Limit to first 20
                print(f"  {log}")

if __name__ == "__main__":
    asyncio.run(main())
