use axum::{
    extract::State,
    response::{Redirect, Html, IntoResponse},
    http::{StatusCode, header},
    Json,
};
use serde::{Deserialize, Serialize};

use super::AppState;
use crate::services::jwt::JwtService;

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub message: String,
    pub token: Option<String>,
}

/// Show login page
pub async fn login_page(State(state): State<AppState>) -> Result<Html<String>, (StatusCode, String)> {
    let html = state.tera
        .render("login.html", &tera::Context::new())
        .map_err(|e| {
            tracing::error!("Failed to render login template: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, format!("Template error: {}", e))
        })?;

    Ok(Html(html))
}

/// Simple email-based login
/// For now, we only allow Weykon's email
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let email = payload.email.trim().to_lowercase();

    // Query user from database
    let user = sqlx::query!(
        r#"
        SELECT id, email, username, is_admin, google_id, wechat_unionid
        FROM users
        WHERE email = $1
        "#,
        email
    )
    .fetch_optional(&state.db)
    .await;

    match user {
        Ok(Some(user)) => {
            // Generate JWT token
            let jwt_secret = std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "default_jwt_secret_key_change_in_production".to_string());
            let jwt_service = JwtService::new(&jwt_secret);

            match jwt_service.generate_token(
                &user.id.to_string(),
                &user.email.unwrap_or_default(),
                &user.username,
                user.is_admin.unwrap_or(false),
            ) {
                Ok(token) => {
                    // Set cookie with token
                    let cookie = format!(
                        "auth_token={}; Path=/; HttpOnly; Max-Age={}; SameSite=Lax",
                        token,
                        7 * 24 * 60 * 60 // 7 days
                    );

                    (
                        StatusCode::OK,
                        [(header::SET_COOKIE, cookie)],
                        Json(LoginResponse {
                            success: true,
                            message: format!("Welcome back, {}!", user.username),
                            token: Some(token),
                        })
                    )
                }
                Err(e) => {
                    tracing::error!("Failed to generate JWT token: {:?}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        [(header::SET_COOKIE, String::new())],
                        Json(LoginResponse {
                            success: false,
                            message: "Failed to generate authentication token".to_string(),
                            token: None,
                        })
                    )
                }
            }
        }
        Ok(None) => {
            // User not found
            (
                StatusCode::UNAUTHORIZED,
                [(header::SET_COOKIE, String::new())],
                Json(LoginResponse {
                    success: false,
                    message: "User not found. Please contact the administrator.".to_string(),
                    token: None,
                })
            )
        }
        Err(e) => {
            tracing::error!("Database error during login: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(header::SET_COOKIE, String::new())],
                Json(LoginResponse {
                    success: false,
                    message: "An error occurred. Please try again.".to_string(),
                    token: None,
                })
            )
        }
    }
}

/// Logout handler
pub async fn logout() -> impl IntoResponse {
    // Clear the auth token cookie
    let cookie = "auth_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax";

    (
        StatusCode::OK,
        [(header::SET_COOKIE, cookie)],
        Redirect::to("/")
    )
}

// OAuth handlers (TODO: implement later)

pub async fn google_login(State(_state): State<AppState>) -> Redirect {
    // TODO: Implement Google OAuth flow
    // Generate OAuth URL and redirect
    Redirect::to("https://accounts.google.com/o/oauth2/v2/auth")
}

pub async fn google_callback(State(_state): State<AppState>) -> Redirect {
    // TODO: Handle Google OAuth callback
    // Exchange code for token, get user info, create/update user
    Redirect::to("/")
}

pub async fn wechat_login(State(_state): State<AppState>) -> Redirect {
    // TODO: Implement WeChat OAuth flow
    Redirect::to("https://open.weixin.qq.com/connect/qrconnect")
}

pub async fn wechat_callback(State(_state): State<AppState>) -> Redirect {
    // TODO: Handle WeChat OAuth callback
    Redirect::to("/")
}
