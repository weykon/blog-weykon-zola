use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::{Html, IntoResponse},
    Json,
};
use sqlx::PgPool;

use crate::models::Post;
use serde::Serialize;

use super::{api::ApiResponse, AppState};

#[derive(Debug, Serialize)]
pub struct AuthorInfo {
    pub id: i32,
    pub username: String,
    pub email: Option<String>,
    pub picture: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthorPageData {
    pub author: AuthorInfo,
    pub posts: Vec<Post>,
}

pub async fn author_page(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> impl IntoResponse {
    // Get user by username
    let user_result = sqlx::query_as::<_, (i32, Option<String>, String, Option<String>)>(
        "SELECT id, email, username, picture FROM users WHERE username = $1"
    )
    .bind(&username)
    .fetch_optional(&state.db)
    .await;

    let (user_id, email, _, picture) = match user_result {
        Ok(Some(user)) => user,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                "Author not found".to_string()
            ).into_response();
        }
        Err(e) => {
            tracing::error!("Database error fetching author: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to fetch author".to_string()
            ).into_response();
        }
    };

    // Get author's public posts
    let posts = sqlx::query_as::<_, Post>(
        r#"
        SELECT id, title, slug, excerpt, content, author_id, workspace_id, book_id,
               is_ai_generated, is_draft, view_count, created_at, updated_at, content_type, is_private
        FROM posts
        WHERE author_id = $1 AND is_private = false AND content_type = 'post'
        ORDER BY updated_at DESC
        LIMIT 50
        "#
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await;

    let author = AuthorInfo {
        id: user_id,
        username: username.clone(),
        email,
        picture,
    };

    let posts: Vec<Post> = match posts {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("Database error fetching author posts: {:?}", e);
            Vec::new()
        }
    };

    // Render author page template
    let mut context = state.create_context();
    context.insert("author", &author);
    context.insert("posts", &posts);
    context.insert("author_username", &username);

    match state.tera.render("author.html", &context) {
        Ok(html) => Html(html).into_response(),
        Err(e) => {
            tracing::error!("Failed to render author template: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Template error: {}", e)
            ).into_response()
        }
    }
}

// API endpoint to get author info and posts (for frontend)
pub async fn get_author_api(
    State(state): State<AppState>,
    Path(username): Path<String>,
) -> impl IntoResponse {
    let user_result = sqlx::query_as::<_, (i32, Option<String>, String, Option<String>)>(
        "SELECT id, email, username, picture FROM users WHERE username = $1"
    )
    .bind(&username)
    .fetch_optional(&state.db)
    .await;

    let (user_id, email, _, picture) = match user_result {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Json(ApiResponse::<AuthorPageData> {
                success: false,
                data: None,
                error: Some("Author not found".to_string()),
            }).into_response();
        }
        Err(e) => {
            tracing::error!("Database error: {:?}", e);
            return Json(ApiResponse::<AuthorPageData> {
                success: false,
                data: None,
                error: Some("Database error".to_string()),
            }).into_response();
        }
    };

    let posts = sqlx::query_as::<_, Post>(
        r#"
        SELECT id, title, slug, excerpt, content, author_id, workspace_id, book_id,
               is_ai_generated, is_draft, view_count, created_at, updated_at, content_type, is_private
        FROM posts
        WHERE author_id = $1 AND is_private = false AND content_type = 'post'
        ORDER BY updated_at DESC
        LIMIT 50
        "#
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await;

    let author = AuthorInfo {
        id: user_id,
        username: username.clone(),
        email,
        picture,
    };

    Json(ApiResponse {
        success: true,
        data: Some(AuthorPageData { author, posts: posts.unwrap_or_default() }),
        error: None,
    }).into_response()
}
