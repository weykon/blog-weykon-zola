use axum::{
    extract::{Path, Query, State, Multipart, Request},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

use crate::models::{post::CreatePost, post::UpdatePost, Post, Tag, CreateMutter, UpdateMutter};
use crate::services::jwt::Claims;
use super::AppState;

#[derive(Deserialize)]
pub struct ListQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub search: Option<String>,
    pub tag: Option<String>,
}

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

pub async fn list_posts(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Json<ApiResponse<Vec<Post>>> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    let posts = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts
         WHERE content_type = 'post' AND is_draft = false
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match posts {
        Ok(posts) => Json(ApiResponse {
            success: true,
            data: Some(posts),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn get_post(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Json<ApiResponse<Post>> {
    let post = sqlx::query_as::<_, Post>("SELECT * FROM posts WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    match post {
        Ok(Some(post)) => Json(ApiResponse {
            success: true,
            data: Some(post),
            error: None,
        }),
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Post not found".to_string()),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn create_post(
    State(state): State<AppState>,
    Json(payload): Json<CreatePost>,
) -> (StatusCode, Json<ApiResponse<Post>>) {
    // TODO: Add authentication check

    let result = sqlx::query_as::<_, Post>(
        "INSERT INTO posts (content_type, title, slug, content, excerpt, workspace_id, book_id, is_ai_generated, is_draft, author_id)
         VALUES ('post', $1, $2, $3, $4, $5, $6, $7, $8, 1)
         RETURNING *"
    )
    .bind(&payload.title)
    .bind(&payload.slug)
    .bind(&payload.content)
    .bind(&payload.excerpt)
    .bind(payload.workspace_id)
    .bind(payload.book_id)
    .bind(payload.is_ai_generated)
    .bind(payload.is_draft)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(post) => (
            StatusCode::CREATED,
            Json(ApiResponse {
                success: true,
                data: Some(post),
                error: None,
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(e.to_string()),
            }),
        ),
    }
}

pub async fn update_post(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdatePost>,
) -> Json<ApiResponse<Post>> {
    // TODO: Add authentication check

    let post = sqlx::query_as::<_, Post>("SELECT * FROM posts WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await;

    match post {
        Ok(Some(mut post)) => {
            if let Some(title) = payload.title {
                post.title = title;
            }
            if let Some(slug) = payload.slug {
                post.slug = slug;
            }
            if let Some(content) = payload.content {
                post.content = content;
            }

            let updated = sqlx::query_as::<_, Post>(
                "UPDATE posts SET title = $1, slug = $2, content = $3 WHERE id = $4 RETURNING *"
            )
            .bind(&post.title)
            .bind(&post.slug)
            .bind(&post.content)
            .bind(id)
            .fetch_one(&state.db)
            .await;

            match updated {
                Ok(post) => Json(ApiResponse {
                    success: true,
                    data: Some(post),
                    error: None,
                }),
                Err(e) => Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Post not found".to_string()),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn delete_post(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Json<ApiResponse<()>> {
    // TODO: Add authentication check

    let result = sqlx::query("DELETE FROM posts WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn list_tags(State(state): State<AppState>) -> Json<ApiResponse<Vec<Tag>>> {
    let tags = sqlx::query_as::<_, Tag>("SELECT * FROM tags ORDER BY name")
        .fetch_all(&state.db)
        .await;

    match tags {
        Ok(tags) => Json(ApiResponse {
            success: true,
            data: Some(tags),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn upload_image(
    State(_state): State<AppState>,
    mut multipart: Multipart,
) -> (StatusCode, Json<ApiResponse<String>>) {
    // Process multipart data
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();

        if name == "image" {
            // Get file name and extension
            let file_name = field.file_name().unwrap_or("unknown").to_string();
            let content_type = field.content_type().unwrap_or("").to_string();

            // Validate file type
            if !is_valid_image_type(&content_type) {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(format!("Invalid file type: {}. Allowed: jpg, jpeg, png, gif, webp", content_type)),
                    }),
                );
            }

            // Get file extension
            let ext = get_file_extension(&file_name, &content_type);

            // Generate unique filename
            let uuid = uuid::Uuid::new_v4();
            let new_filename = format!("{}.{}", uuid, ext);

            // Create directory structure: static/uploads/images/posts/YYYY-MM/
            let now = chrono::Utc::now();
            let dir_path = format!("static/uploads/images/posts/{}", now.format("%Y-%m"));

            // Create directory if it doesn't exist
            if let Err(e) = fs::create_dir_all(&dir_path).await {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(format!("Failed to create directory: {}", e)),
                    }),
                );
            }

            // Full file path
            let file_path = PathBuf::from(&dir_path).join(&new_filename);

            // Read file data
            let data = match field.bytes().await {
                Ok(bytes) => bytes,
                Err(e) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse {
                            success: false,
                            data: None,
                            error: Some(format!("Failed to read file data: {}", e)),
                        }),
                    );
                }
            };

            // Write file to disk
            match fs::File::create(&file_path).await {
                Ok(mut file) => {
                    if let Err(e) = file.write_all(&data).await {
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(ApiResponse {
                                success: false,
                                data: None,
                                error: Some(format!("Failed to write file: {}", e)),
                            }),
                        );
                    }
                }
                Err(e) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse {
                            success: false,
                            data: None,
                            error: Some(format!("Failed to create file: {}", e)),
                        }),
                    );
                }
            }

            // Return URL path (relative to static root)
            let url = format!("/{}/{}", dir_path, new_filename);

            return (
                StatusCode::OK,
                Json(ApiResponse {
                    success: true,
                    data: Some(url),
                    error: None,
                }),
            );
        }
    }

    // No file uploaded
    (
        StatusCode::BAD_REQUEST,
        Json(ApiResponse {
            success: false,
            data: None,
            error: Some("No image file provided".to_string()),
        }),
    )
}

// Helper functions
fn is_valid_image_type(content_type: &str) -> bool {
    matches!(
        content_type,
        "image/jpeg" | "image/jpg" | "image/png" | "image/gif" | "image/webp"
    )
}

fn get_file_extension(filename: &str, content_type: &str) -> String {
    // Try to get extension from filename
    if let Some(ext) = filename.rsplit('.').next() {
        if !ext.is_empty() && ext.len() <= 5 {
            return ext.to_lowercase();
        }
    }

    // Fall back to content type
    match content_type {
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "jpg",
    }.to_string()
}

// ========== Mutters API ==========

pub async fn list_mutters(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Json<ApiResponse<Vec<Post>>> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);
    let offset = (page - 1) * limit;

    let mutters = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts
         WHERE content_type = 'mutter'
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match mutters {
        Ok(mutters) => Json(ApiResponse {
            success: true,
            data: Some(mutters),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn create_mutter(
    State(state): State<AppState>,
    Json(payload): Json<CreateMutter>,
) -> (StatusCode, Json<ApiResponse<Post>>) {
    // Validate
    if let Err(e) = payload.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(e),
            }),
        );
    }

    // Generate title and slug
    let title = payload.generate_title();
    let slug = payload.generate_slug();

    let result = sqlx::query_as::<_, Post>(
        "INSERT INTO posts (content_type, title, slug, content, is_draft, author_id)
         VALUES ('mutter', $1, $2, $3, false, 1)
         RETURNING *"
    )
    .bind(&title)
    .bind(&slug)
    .bind(&payload.content)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(mutter) => (
            StatusCode::CREATED,
            Json(ApiResponse {
                success: true,
                data: Some(mutter),
                error: None,
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(e.to_string()),
            }),
        ),
    }
}

pub async fn get_mutter(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Json<ApiResponse<Post>> {
    let mutter = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND content_type = 'mutter'"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match mutter {
        Ok(Some(mutter)) => Json(ApiResponse {
            success: true,
            data: Some(mutter),
            error: None,
        }),
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Mutter not found".to_string()),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn update_mutter(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateMutter>,
) -> Json<ApiResponse<Post>> {
    let mutter = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND content_type = 'mutter'"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match mutter {
        Ok(Some(mut mutter)) => {
            if let Some(content) = payload.content {
                // Validate length
                if content.len() > 1000 {
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        error: Some("Content too long (max 1000 characters)".to_string()),
                    });
                }
                mutter.content = content;
            }

            let updated = sqlx::query_as::<_, Post>(
                "UPDATE posts SET content = $1 WHERE id = $2 RETURNING *"
            )
            .bind(&mutter.content)
            .bind(id)
            .fetch_one(&state.db)
            .await;

            match updated {
                Ok(mutter) => Json(ApiResponse {
                    success: true,
                    data: Some(mutter),
                    error: None,
                }),
                Err(e) => Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                }),
            }
        }
        Ok(None) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Mutter not found".to_string()),
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn delete_mutter(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM posts WHERE id = $1 AND content_type = 'mutter'")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => Json(ApiResponse {
            success: true,
            data: Some(()),
            error: None,
        }),
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

// ========== Helper Functions ==========

/// Extract user claims from request extensions (set by auth middleware)
fn get_user_claims(req: &Request) -> Option<Claims> {
    req.extensions().get::<Claims>().cloned()
}

/// Get user ID from request, or default to user ID 1 in dev mode
async fn get_user_id_or_default(req: &Request) -> Result<Uuid, String> {
    // Try to get claims from request extensions
    if let Some(claims) = get_user_claims(req) {
        Uuid::parse_str(&claims.sub)
            .map_err(|e| format!("Invalid user ID: {}", e))
    } else {
        // In dev mode, default to first user (for backward compatibility)
        // In production, this should fail
        let dev_mode = std::env::var("DEV_MODE")
            .unwrap_or_else(|_| "false".to_string())
            .to_lowercase() == "true";

        if dev_mode {
            tracing::warn!("DEV_MODE: Using default user ID");
            // Return a placeholder UUID - this should be replaced with actual user lookup
            Ok(Uuid::nil())
        } else {
            Err("Authentication required".to_string())
        }
    }
}

/// Check if user can edit/delete a post
async fn can_modify_post(
    user_id: &Uuid,
    post_author_id: &Uuid,
    is_admin: bool,
) -> bool {
    // Admin can modify anything
    if is_admin {
        return true;
    }

    // User can only modify their own posts
    user_id == post_author_id
}

/// Filter private posts based on user permissions
/// Returns SQL WHERE clause conditions
fn build_privacy_filter(user_claims: Option<&Claims>) -> String {
    match user_claims {
        Some(claims) if claims.is_admin => {
            // Admin can see everything
            "".to_string()
        }
        Some(claims) => {
            // Regular user: see public posts + their own private posts
            let user_id = &claims.sub;
            format!("AND (is_private = false OR author_id = '{}')", user_id)
        }
        None => {
            // Not logged in: only see public posts
            "AND is_private = false".to_string()
        }
    }
}
