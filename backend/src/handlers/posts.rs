use axum::{
    extract::{Path, Query, State},
    response::Html,
};
use serde::Deserialize;

use super::AppState;

#[derive(Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Html<String> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);  // 每页显示10篇
    let offset = (page - 1) * limit;

    // Query total count (only public posts, not mutters or drafts)
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM posts WHERE content_type = 'post' AND is_draft = false AND is_private = false"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or((0,));

    let total_count = total.0;
    let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i64;

    // Query posts from database (only public posts, not mutters or drafts)
    let posts = sqlx::query_as::<_, crate::models::Post>(
        "SELECT * FROM posts
         WHERE content_type = 'post' AND is_draft = false AND is_private = false
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let mut context = state.create_context();
    context.insert("posts", &posts);
    context.insert("page", &page);
    context.insert("total_pages", &total_pages);
    context.insert("total_count", &total_count);
    context.insert("has_prev", &(page > 1));
    context.insert("has_next", &(page < total_pages));
    context.insert("prev_page", &(page - 1));
    context.insert("next_page", &(page + 1));

    let html = state.tera
        .render("blog.html", &context)
        .unwrap_or_else(|e| format!("Error rendering template: {}", e));

    Html(html)
}

pub async fn detail(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Html<String> {
    // Query post by slug (only public posts, not mutters or drafts)
    let post = sqlx::query_as::<_, crate::models::Post>(
        "SELECT * FROM posts WHERE slug = $1 AND content_type = 'post' AND is_draft = false AND is_private = false"
    )
    .bind(&slug)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    if let Some(post) = post {
        // Increment view count
        let _ = sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1")
            .bind(post.id)
            .execute(&state.db)
            .await;

        // Render markdown content
        let rendered_content = crate::services::markdown::render_markdown(&post.content);

        // Get tags for this post
        let tags = sqlx::query_as::<_, crate::models::Tag>(
            "SELECT t.* FROM tags t
             JOIN post_tags pt ON t.id = pt.tag_id
             WHERE pt.post_id = $1"
        )
        .bind(post.id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        let mut context = state.create_context();
        context.insert("post", &post);
        context.insert("content", &rendered_content);
        context.insert("tags", &tags);

        let html = state.tera
            .render("blog-page.html", &context)
            .unwrap_or_else(|e| format!("Error rendering template: {}", e));

        Html(html)
    } else {
        Html("<h1>404 - Post Not Found</h1>".to_string())
    }
}

pub async fn by_tag(
    State(state): State<AppState>,
    Path(tag_slug): Path<String>,
) -> Html<String> {
    // Get posts by tag (only public posts, not mutters or drafts)
    let posts = sqlx::query_as::<_, crate::models::Post>(
        "SELECT p.* FROM posts p
         JOIN post_tags pt ON p.id = pt.post_id
         JOIN tags t ON pt.tag_id = t.id
         WHERE t.slug = $1 AND p.content_type = 'post' AND p.is_draft = false AND p.is_private = false
         ORDER BY p.created_at DESC"
    )
    .bind(&tag_slug)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let tag = sqlx::query_as::<_, crate::models::Tag>(
        "SELECT * FROM tags WHERE slug = $1"
    )
    .bind(&tag_slug)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    let mut context = state.create_context();
    context.insert("posts", &posts);
    context.insert("tag", &tag);
    // Add pagination variables (no pagination for tag view, all posts on one page)
    context.insert("page", &1);
    context.insert("total_pages", &1);
    context.insert("total_count", &posts.len());
    context.insert("has_prev", &false);
    context.insert("has_next", &false);
    context.insert("prev_page", &0);
    context.insert("next_page", &2);

    let html = state.tera
        .render("blog.html", &context)
        .unwrap_or_else(|e| format!("Error rendering template: {}", e));

    Html(html)
}
