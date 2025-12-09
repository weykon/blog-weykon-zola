/// Frontend-specific API endpoints with DTO responses
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};

use crate::models::{Post, PostDto, MutterDto, PostWithTags, Tag};
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

#[derive(Serialize)]
pub struct PostsResponse {
    pub posts: Vec<PostDto>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Serialize)]
pub struct MuttersResponse {
    pub mutters: Vec<MutterDto>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

/// List posts with frontend-friendly format
pub async fn list_posts_frontend(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Json<ApiResponse<PostsResponse>> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    let offset = (page - 1) * limit;

    // Get total count
    let count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM posts
         WHERE content_type = 'post' AND is_draft = false AND is_private = false"
    )
    .fetch_one(&state.db)
    .await;

    let total = count_result.unwrap_or(0);

    // Get posts
    let posts = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts
         WHERE content_type = 'post' AND is_draft = false AND is_private = false
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match posts {
        Ok(posts) => {
            // Convert to DTOs
            let post_dtos: Vec<PostDto> = posts.into_iter().map(|p| p.into()).collect();

            Json(ApiResponse {
                success: true,
                data: Some(PostsResponse {
                    posts: post_dtos,
                    total,
                    page,
                    limit,
                }),
                error: None,
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Get single post with tags
pub async fn get_post_frontend(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Json<ApiResponse<PostDto>> {
    let post = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND content_type = 'post'"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match post {
        Ok(Some(post)) => {
            // Increment view count
            let _ = sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1")
                .bind(id)
                .execute(&state.db)
                .await;

            Json(ApiResponse {
                success: true,
                data: Some(post.into()),
                error: None,
            })
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

/// List mutters with frontend-friendly format
pub async fn list_mutters_frontend(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Json<ApiResponse<MuttersResponse>> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);
    let offset = (page - 1) * limit;

    // Get total count (only non-private mutters for public API)
    let count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM posts
         WHERE content_type = 'mutter' AND is_private = false"
    )
    .fetch_one(&state.db)
    .await;

    let total = count_result.unwrap_or(0);

    // Get mutters
    let mutters = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts
         WHERE content_type = 'mutter' AND is_private = false
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match mutters {
        Ok(mutters) => {
            // Convert to DTOs
            let mutter_dtos: Vec<MutterDto> = mutters.into_iter().map(|m| m.into()).collect();

            Json(ApiResponse {
                success: true,
                data: Some(MuttersResponse {
                    mutters: mutter_dtos,
                    total,
                    page,
                    limit,
                }),
                error: None,
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Get single mutter
pub async fn get_mutter_frontend(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Json<ApiResponse<MutterDto>> {
    let mutter = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND content_type = 'mutter'"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match mutter {
        Ok(Some(mutter)) => {
            // Increment view count
            let _ = sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1")
                .bind(id)
                .execute(&state.db)
                .await;

            Json(ApiResponse {
                success: true,
                data: Some(mutter.into()),
                error: None,
            })
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

#[derive(Serialize)]
pub struct TagResponse {
    pub name: String,
    pub count: i32,
}

/// List all tags with post counts
pub async fn list_tags_frontend(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<TagResponse>>> {
    let tags = sqlx::query_as::<_, (String, i32)>(
        "SELECT t.name, COUNT(pt.post_id) as count
         FROM tags t
         LEFT JOIN post_tags pt ON t.id = pt.tag_id
         LEFT JOIN posts p ON pt.post_id = p.id
         WHERE p.is_draft = false AND p.is_private = false
         GROUP BY t.id, t.name
         ORDER BY count DESC, t.name"
    )
    .fetch_all(&state.db)
    .await;

    match tags {
        Ok(tags) => {
            let tag_responses: Vec<TagResponse> = tags
                .into_iter()
                .map(|(name, count)| TagResponse { name, count })
                .collect();

            Json(ApiResponse {
                success: true,
                data: Some(tag_responses),
                error: None,
            })
        }
        Err(e) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}
