/// Frontend-specific API endpoints with DTO responses
use axum::{
    extract::{Path, Query, State},
    http::{StatusCode, Request},
    response::Json,
    Extension,
};
use serde::{Deserialize, Serialize};

use crate::models::Post;
use crate::middleware::UserContext;
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
    pub posts: Vec<Post>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Serialize)]
pub struct MuttersResponse {
    pub mutters: Vec<Post>,
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
    let search = query.search.clone();
    let tag = query.tag.clone();

    // Get total count
    let count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(DISTINCT p.id)
         FROM posts p
         LEFT JOIN post_tags pt ON p.id = pt.post_id
         LEFT JOIN tags t ON pt.tag_id = t.id
         WHERE p.content_type = 'post'
           AND p.is_draft = false
           AND p.is_private = false
           AND ($1::text IS NULL
                OR p.title ILIKE '%' || $1 || '%'
                OR COALESCE(p.excerpt, '') ILIKE '%' || $1 || '%')
           AND ($2::text IS NULL OR t.slug = $2)"
    )
    .bind(search.as_deref())
    .bind(tag.as_deref())
    .fetch_one(&state.db)
    .await;

    let total = count_result.unwrap_or(0);

    // Get posts
    let posts = sqlx::query_as::<_, Post>(
        "SELECT DISTINCT p.*
         FROM posts p
         LEFT JOIN post_tags pt ON p.id = pt.post_id
         LEFT JOIN tags t ON pt.tag_id = t.id
         WHERE p.content_type = 'post'
           AND p.is_draft = false
           AND p.is_private = false
           AND ($1::text IS NULL
                OR p.title ILIKE '%' || $1 || '%'
                OR COALESCE(p.excerpt, '') ILIKE '%' || $1 || '%')
           AND ($2::text IS NULL OR t.slug = $2)
         ORDER BY p.created_at DESC
         LIMIT $3 OFFSET $4"
    )
    .bind(search.as_deref())
    .bind(tag.as_deref())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match posts {
        Ok(posts) => {
            Json(ApiResponse {
                success: true,
                data: Some(PostsResponse {
                    posts,
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
) -> Json<ApiResponse<Post>> {
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
                data: Some(post),
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
    user_context: Option<Extension<UserContext>>,
) -> Json<ApiResponse<MuttersResponse>> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(50);
    let offset = (page - 1) * limit;

    // Check if user is authenticated
    let (query_str, total, mutters) = if let Some(Extension(user_ctx)) = user_context {
        // User is authenticated - return their private mutters
        let user_id = user_ctx.user_id.parse::<i32>().unwrap_or(0);

        // Get total count of user's mutters (private + public by this user)
        let count_result = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM posts
             WHERE content_type = 'mutter'
             AND (is_private = false OR (is_private = true AND author_id = $1))"
        )
        .bind(user_id)
        .fetch_one(&state.db)
        .await;

        let total = count_result.unwrap_or(0);

        // Get user's mutters
        let mutters = sqlx::query_as::<_, Post>(
            "SELECT * FROM posts
             WHERE content_type = 'mutter'
             AND (is_private = false OR (is_private = true AND author_id = $1))
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3"
        )
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

        ("authenticated query", total, mutters)
    } else {
        // Not authenticated - only return public mutters
        let count_result = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM posts
             WHERE content_type = 'mutter' AND is_private = false"
        )
        .fetch_one(&state.db)
        .await;

        let total = count_result.unwrap_or(0);

        // Get public mutters only
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

        ("public query", total, mutters)
    };

    match mutters {
        Ok(mutters) => {
            Json(ApiResponse {
                success: true,
                data: Some(MuttersResponse {
                    mutters,
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
    user_context: Option<Extension<UserContext>>,
) -> Json<ApiResponse<Post>> {
    // First fetch the mutter
    let mutter = sqlx::query_as::<_, Post>(
        "SELECT * FROM posts WHERE id = $1 AND content_type = 'mutter'"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match mutter {
        Ok(Some(mutter)) => {
            // Check if the mutter is private
            if mutter.is_private {
                // If private, check if user is authenticated and owns it
                if let Some(Extension(user_ctx)) = user_context {
                    let user_id = user_ctx.user_id.parse::<i32>().unwrap_or(0);
                    if mutter.author_id.unwrap_or(0) != user_id {
                        // User doesn't own this private mutter
                        return Json(ApiResponse {
                            success: false,
                            data: None,
                            error: Some("Access denied: This mutter is private".to_string()),
                        });
                    }
                } else {
                    // Not authenticated, can't access private mutter
                    return Json(ApiResponse {
                        success: false,
                        data: None,
                        error: Some("Authentication required to view this mutter".to_string()),
                    });
                }
            }

            // Increment view count
            let _ = sqlx::query("UPDATE posts SET view_count = view_count + 1 WHERE id = $1")
                .bind(id)
                .execute(&state.db)
                .await;

            Json(ApiResponse {
                success: true,
                data: Some(mutter),
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
