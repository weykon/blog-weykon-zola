use axum::{
    extract::{Path, Query, State, Request},
    response::Html,
    http::StatusCode,
};
use serde::Deserialize;

use super::AppState;
use crate::middleware::auth::UserContext;

#[derive(Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

/// List all mutters (paginated) - Only accessible by owner
pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
    request: Request,
) -> Result<Html<String>, (StatusCode, String)> {
    // Check if user is the owner (weykonkong@gmail.com)
    let user_context = request.extensions().get::<UserContext>();
    if let Some(user) = user_context {
        if user.email != "weykonkong@gmail.com" {
            return Err((StatusCode::FORBIDDEN, "Access denied: This content is private".to_string()));
        }
    } else {
        return Err((StatusCode::UNAUTHORIZED, "Authentication required".to_string()));
    }
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50); // More items per page for mutters
    let offset = (page - 1) * limit;

    // Query total count (only mutters)
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM posts WHERE content_type = 'mutter'"
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or((0,));

    let total_count = total.0;
    let total_pages = ((total_count as f64) / (limit as f64)).ceil() as i64;

    // Query mutters from database
    let mutters = sqlx::query_as::<_, crate::models::Post>(
        "SELECT * FROM posts
         WHERE content_type = 'mutter'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let mut context = state.create_context();
    context.insert("mutters", &mutters);
    context.insert("page", &page);
    context.insert("total_pages", &total_pages);
    context.insert("total_count", &total_count);
    context.insert("has_prev", &(page > 1));
    context.insert("has_next", &(page < total_pages));
    context.insert("prev_page", &(page - 1));
    context.insert("next_page", &(page + 1));

    let html = state.tera
        .render("mutters-list.html", &context)
        .unwrap_or_else(|e| format!("Error rendering template: {}", e));

    Ok(Html(html))
}

/// Show a single mutter detail - Only accessible by owner
pub async fn detail(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    request: Request,
) -> Result<Html<String>, (StatusCode, String)> {
    // Check if user is the owner (weykonkong@gmail.com)
    let user_context = request.extensions().get::<UserContext>();
    if let Some(user) = user_context {
        if user.email != "weykonkong@gmail.com" {
            return Err((StatusCode::FORBIDDEN, "Access denied: This content is private".to_string()));
        }
    } else {
        return Err((StatusCode::UNAUTHORIZED, "Authentication required".to_string()));
    }
    // Query mutter by slug
    let mutter = sqlx::query_as::<_, crate::models::Post>(
        "SELECT * FROM posts WHERE slug = $1 AND content_type = 'mutter'"
    )
    .bind(&slug)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    if let Some(mutter) = mutter {
        // Increment view count
        let _ = sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1")
            .bind(mutter.id)
            .execute(&state.db)
            .await;

        let mut context = state.create_context();
        context.insert("mutter", &mutter);

        let html = state.tera
            .render("mutter-detail.html", &context)
            .unwrap_or_else(|e| format!("Error rendering template: {}", e));

        Ok(Html(html))
    } else {
        Err((StatusCode::NOT_FOUND, "Mutter not found".to_string()))
    }
}
