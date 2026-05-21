use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    Extension,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{
    models::{AiSettings, Post, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER},
    services::{ai::AiService, jwt::Claims},
};

use super::{api::ApiResponse, AppState};

#[derive(Debug, Serialize)]
pub struct AiSettingsResponse {
    pub provider: String,
    pub model: String,
    pub base_url: Option<String>,
    pub has_api_key: bool,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAiSettingsRequest {
    pub provider: String,
    pub model: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TranslateMutterRequest {
    pub title: Option<String>,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct TranslateMutterResponse {
    pub title: String,
    pub excerpt: String,
    pub content: String,
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Deserialize)]
pub struct PublishPostRequest {
    pub title: Option<String>,
    pub content: String,
    pub translated_title: Option<String>,
    pub translated_excerpt: Option<String>,
    pub translated_content: Option<String>,
    pub is_draft: Option<bool>,
}

pub async fn get_ai_settings(
    State(state): State<AppState>,
) -> Json<ApiResponse<AiSettingsResponse>> {
    match load_ai_settings(&state.db).await {
        Ok(settings) => Json(ApiResponse {
            success: true,
            data: Some(to_settings_response(&settings)),
            error: None,
        }),
        Err(error) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(error.to_string()),
        }),
    }
}

pub async fn update_ai_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UpdateAiSettingsRequest>,
) -> Json<ApiResponse<AiSettingsResponse>> {
    let provider = payload.provider.trim().to_lowercase();
    if provider.is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Provider is required".to_string()),
        });
    }

    if ai_api_provider::provider_by_name(&provider).is_none() {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("Unsupported AI provider: {}", provider)),
        });
    }

    let default_model = ai_api_provider::provider_by_name(&provider)
        .map(|meta| meta.default_model)
        .unwrap_or(DEFAULT_AI_MODEL);

    let author_id = match claims.sub.parse::<i32>() {
        Ok(value) => value,
        Err(_) => {
            return Json(ApiResponse {
                success: false,
                data: None,
                error: Some("Invalid user ID".to_string()),
            });
        }
    };

    let current = match load_ai_settings(&state.db).await {
        Ok(settings) => settings,
        Err(error) => {
            return Json(ApiResponse {
                success: false,
                data: None,
                error: Some(error.to_string()),
            });
        }
    };

    let model = payload.model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(default_model)
        .to_string();

    let base_url = payload.base_url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned);

    let api_key = match payload.api_key {
        Some(api_key) => {
            let trimmed = api_key.trim().to_string();
            if trimmed.is_empty() {
                current.api_key
            } else {
                Some(trimmed)
            }
        }
        None => current.api_key,
    };

    let updated = sqlx::query_as::<_, AiSettings>(
        r#"
        INSERT INTO ai_settings (id, provider, model, base_url, api_key, updated_by)
        VALUES (1, $1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET provider = EXCLUDED.provider,
            model = EXCLUDED.model,
            base_url = EXCLUDED.base_url,
            api_key = EXCLUDED.api_key,
            updated_by = EXCLUDED.updated_by
        RETURNING id, provider, model, base_url, api_key, updated_by, created_at, updated_at
        "#
    )
    .bind(provider)
    .bind(model)
    .bind(base_url)
    .bind(api_key)
    .bind(author_id)
    .fetch_one(&state.db)
    .await;

    match updated {
        Ok(settings) => Json(ApiResponse {
            success: true,
            data: Some(to_settings_response(&settings)),
            error: None,
        }),
        Err(error) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(error.to_string()),
        }),
    }
}

pub async fn translate_mutter(
    State(state): State<AppState>,
    Json(payload): Json<TranslateMutterRequest>,
) -> Json<ApiResponse<TranslateMutterResponse>> {
    if payload.content.trim().is_empty() {
        return Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Content cannot be empty".to_string()),
        });
    }

    let settings = match load_ai_settings(&state.db).await {
        Ok(settings) => settings,
        Err(error) => {
            return Json(ApiResponse {
                success: false,
                data: None,
                error: Some(error.to_string()),
            });
        }
    };

    match AiService::new().translate_mutter(&settings, payload.title.as_deref(), &payload.content).await {
        Ok(result) => Json(ApiResponse {
            success: true,
            data: Some(TranslateMutterResponse {
                title: result.title,
                excerpt: result.excerpt,
                content: result.content,
                provider: result.provider,
                model: result.model,
            }),
            error: None,
        }),
        Err(error) => Json(ApiResponse {
            success: false,
            data: None,
            error: Some(error.to_string()),
        }),
    }
}

pub async fn publish_mutter_to_post(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<PublishPostRequest>,
) -> (StatusCode, Json<ApiResponse<Post>>) {
    if payload.content.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some("Content cannot be empty".to_string()),
            }),
        );
    }

    let author_id = match claims.sub.parse::<i32>() {
        Ok(value) => value,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some("Invalid user ID".to_string()),
                }),
            );
        }
    };

    let translated = if let Some(content) = payload.translated_content.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
        TranslateMutterResponse {
            title: payload.translated_title
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .or_else(|| payload.title.as_deref().map(str::trim).filter(|value| !value.is_empty()))
                .unwrap_or("新文章")
                .to_string(),
            excerpt: payload.translated_excerpt
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .unwrap_or_default()
                .to_string(),
            content: content.to_string(),
            provider: String::new(),
            model: String::new(),
        }
    } else {
        let settings = match load_ai_settings(&state.db).await {
            Ok(settings) => settings,
            Err(error) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(error.to_string()),
                    }),
                );
            }
        };

        match AiService::new().translate_mutter(&settings, payload.title.as_deref(), &payload.content).await {
            Ok(result) => TranslateMutterResponse {
                title: result.title,
                excerpt: result.excerpt,
                content: result.content,
                provider: result.provider,
                model: result.model,
            },
            Err(error) => {
                return (
                    StatusCode::BAD_GATEWAY,
                    Json(ApiResponse {
                        success: false,
                        data: None,
                        error: Some(error.to_string()),
                    }),
                );
            }
        }
    };

    let title = translated.title.trim().to_string();
    let excerpt = if translated.excerpt.trim().is_empty() {
        build_excerpt(&translated.content)
    } else {
        translated.excerpt.trim().to_string()
    };

    let slug = match unique_slug(&state.db, &slugify(&title)).await {
        Ok(slug) => slug,
        Err(error) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    success: false,
                    data: None,
                    error: Some(error.to_string()),
                }),
            );
        }
    };

    let result = sqlx::query_as::<_, Post>(
        r#"
        INSERT INTO posts (content_type, title, slug, content, excerpt, author_id, is_ai_generated, is_draft)
        VALUES ('post', $1, $2, $3, $4, $5, true, $6)
        RETURNING *
        "#
    )
    .bind(&title)
    .bind(slug)
    .bind(translated.content.trim())
    .bind(excerpt)
    .bind(author_id)
    .bind(payload.is_draft.unwrap_or(true))
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
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(error.to_string()),
            }),
        ),
    }
}

async fn load_ai_settings(db: &PgPool) -> Result<AiSettings, sqlx::Error> {
    if let Some(settings) = sqlx::query_as::<_, AiSettings>(
        "SELECT id, provider, model, base_url, api_key, updated_by, created_at, updated_at FROM ai_settings WHERE id = 1"
    )
        .fetch_optional(db)
        .await?
    {
        return Ok(settings);
    }

    let _ = sqlx::query(
        "INSERT INTO ai_settings (id, provider, model) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING"
    )
    .bind(DEFAULT_AI_PROVIDER)
    .bind(DEFAULT_AI_MODEL)
    .execute(db)
    .await?;

    sqlx::query_as::<_, AiSettings>(
        "SELECT id, provider, model, base_url, api_key, updated_by, created_at, updated_at FROM ai_settings WHERE id = 1"
    )
        .fetch_one(db)
        .await
}

fn to_settings_response(settings: &AiSettings) -> AiSettingsResponse {
    AiSettingsResponse {
        provider: settings.provider.clone(),
        model: settings.model.clone(),
        base_url: settings.base_url.clone(),
        has_api_key: settings.api_key.as_deref().map(str::trim).filter(|value| !value.is_empty()).is_some(),
        updated_at: settings.updated_at.to_rfc3339(),
    }
}

fn slugify(title: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;

    for ch in title.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            previous_dash = false;
        } else if ch.is_whitespace() || "-_./".contains(ch) {
            if !previous_dash && !slug.is_empty() {
                slug.push('-');
                previous_dash = true;
            }
        }
    }

    slug.trim_matches('-').to_string()
}

async fn unique_slug(db: &PgPool, base: &str) -> Result<String, sqlx::Error> {
    let fallback = if base.trim().is_empty() {
        format!("post-{}", chrono::Utc::now().format("%Y%m%d%H%M%S"))
    } else {
        base.to_string()
    };

    let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM posts WHERE slug = $1")
        .bind(&fallback)
        .fetch_one(db)
        .await?;

    if count == 0 {
        return Ok(fallback);
    }

    Ok(format!("{}-{}", fallback, chrono::Utc::now().timestamp()))
}

fn build_excerpt(content: &str) -> String {
    content
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(140)
        .collect::<String>()
        .trim()
        .to_string()
}
