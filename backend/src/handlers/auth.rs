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
    let context = state.create_context();
    let html = state.tera
        .render("login.html", &context)
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
pub async fn logout(State(state): State<AppState>) -> impl IntoResponse {
    // Clear the auth token cookie
    let cookie = "auth_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax";

    // Redirect to base path (e.g., /blog or /)
    let redirect_path = state.get_base_path();
    let redirect_url = if redirect_path.is_empty() {
        "/"
    } else {
        redirect_path.as_str()
    };

    (
        StatusCode::OK,
        [(header::SET_COOKIE, cookie)],
        Redirect::to(redirect_url)
    )
}

/// Get current user info from JWT token
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub user_id: String,
    pub email: String,
    pub username: String,
    pub is_admin: bool,
    pub picture: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub authenticated: bool,
    pub user: Option<UserInfo>,
}

pub async fn get_current_user(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    use crate::services::jwt::JwtService;

    // Try to get token from cookie
    let token = headers
        .get(axum::http::header::COOKIE)
        .and_then(|cookie| cookie.to_str().ok())
        .and_then(|cookie_str| {
            cookie_str
                .split(';')
                .find(|c| c.trim().starts_with("auth_token="))
                .map(|c| c.trim().trim_start_matches("auth_token=").to_string())
        });

    if let Some(token) = token {
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "default_jwt_secret_key_change_in_production".to_string());
        let jwt_service = JwtService::new(&jwt_secret);

        if let Ok(claims) = jwt_service.validate_token(&token) {
            // Get user from database to get additional info like picture
            // Parse user_id from JWT (stored as string)
            if let Ok(user_id) = claims.sub.parse::<i32>() {
                if let Ok(user) = sqlx::query!(
                    r#"
                    SELECT id, email, username, is_admin, picture
                    FROM users
                    WHERE id = $1
                    "#,
                    user_id
                )
                .fetch_one(&state.db)
                .await
                {
                    return Json(UserResponse {
                        authenticated: true,
                        user: Some(UserInfo {
                            user_id: claims.sub,
                            email: claims.email,
                            username: claims.username,
                            is_admin: claims.is_admin,
                            picture: user.picture,
                        }),
                    });
                }
            }
        }
    }

    Json(UserResponse {
        authenticated: false,
        user: None,
    })
}

// OAuth handlers

use axum::extract::Query;
use serde::Deserialize as SerdeDeserialize;

#[derive(Debug, SerdeDeserialize)]
pub struct GoogleCallback {
    code: String,
    state: Option<String>,
}

#[derive(Debug, SerdeDeserialize)]
struct GoogleTokenResponse {
    access_token: String,
    expires_in: i64,
    token_type: String,
    scope: Option<String>,
    id_token: Option<String>,
}

#[derive(Debug, SerdeDeserialize)]
struct GoogleUserInfo {
    id: String,
    email: String,
    verified_email: bool,
    name: String,
    given_name: Option<String>,
    family_name: Option<String>,
    picture: Option<String>,
}

pub async fn google_login(State(state): State<AppState>) -> Redirect {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .unwrap_or_default();
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI")
        .unwrap_or_else(|_| format!("{}/auth/google/callback", state.config.base_url));

    if client_id.is_empty() || client_id == "your_google_client_id" {
        tracing::error!("GOOGLE_CLIENT_ID not configured");
        return Redirect::to("/?error=google_not_configured");
    }

    // Build Google OAuth URL
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
        client_id={}&\
        redirect_uri={}&\
        response_type=code&\
        scope=openid%20email%20profile&\
        access_type=offline&\
        prompt=select_account",
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
    );

    Redirect::to(&auth_url)
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<GoogleCallback>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "GOOGLE_CLIENT_ID not set".to_string()))?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "GOOGLE_CLIENT_SECRET not set".to_string()))?;
    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI")
        .unwrap_or_else(|_| format!("{}/auth/google/callback", state.config.base_url));

    // Exchange authorization code for access token
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", params.code.as_str()),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
            ("redirect_uri", &redirect_uri),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to exchange code for token: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to communicate with Google".to_string())
        })?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        tracing::error!("Google token exchange failed: {}", error_text);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, "Failed to get access token from Google".to_string()));
    }

    let token_data: GoogleTokenResponse = token_response
        .json()
        .await
        .map_err(|e| {
            tracing::error!("Failed to parse token response: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Invalid token response".to_string())
        })?;

    // Get user info from Google
    let user_info_response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&token_data.access_token)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to get user info: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get user info".to_string())
        })?;

    let user_info: GoogleUserInfo = user_info_response
        .json()
        .await
        .map_err(|e| {
            tracing::error!("Failed to parse user info: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Invalid user info response".to_string())
        })?;

    // Check if user exists in database
    let existing_user = sqlx::query!(
        r#"
        SELECT id, email, username, is_admin
        FROM users
        WHERE google_id = $1 OR email = $2
        "#,
        user_info.id,
        user_info.email
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {:?}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
    })?;

    // Get or create user
    let (user_id, user_email, username, is_admin) = if let Some(user) = existing_user {
        // Update existing user with Google ID if not set
        sqlx::query!(
            r#"
            UPDATE users
            SET google_id = $1, updated_at = NOW()
            WHERE id = $2
            "#,
            user_info.id,
            user.id
        )
        .execute(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update user: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to update user".to_string())
        })?;

        (user.id, user.email, user.username, user.is_admin)
    } else {
        // Create new user
        let username = user_info.name.split_whitespace().next()
            .unwrap_or("user")
            .to_lowercase();

        let new_user = sqlx::query!(
            r#"
            INSERT INTO users (email, username, google_id, is_admin)
            VALUES ($1, $2, $3, false)
            RETURNING id, email, username, is_admin
            "#,
            user_info.email,
            username,
            user_info.id
        )
        .fetch_one(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create user: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to create user".to_string())
        })?;

        (new_user.id, new_user.email, new_user.username, new_user.is_admin)
    };

    // Generate JWT token
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_jwt_secret_key_change_in_production".to_string());
    let jwt_service = JwtService::new(&jwt_secret);

    let token = jwt_service.generate_token(
        &user_id.to_string(),
        &user_email.unwrap_or_default(),
        &username,
        is_admin.unwrap_or(false),
    ).map_err(|e| {
        tracing::error!("Failed to generate JWT: {:?}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to generate token".to_string())
    })?;

    // Set cookie and redirect
    let cookie = format!(
        "auth_token={}; Path=/; HttpOnly; Max-Age={}; SameSite=Lax",
        token,
        7 * 24 * 60 * 60 // 7 days
    );

    // Redirect to base path (e.g., /blog or /)
    let redirect_path = state.get_base_path();
    let redirect_url = if redirect_path.is_empty() {
        "/".to_string()
    } else {
        redirect_path
    };

    Ok((
        StatusCode::SEE_OTHER,
        [(header::SET_COOKIE, cookie), (header::LOCATION, redirect_url)],
        "Redirecting...".to_string()
    ))
}

pub async fn wechat_login(State(_state): State<AppState>) -> Redirect {
    // TODO: Implement WeChat OAuth flow
    Redirect::to("https://open.weixin.qq.com/connect/qrconnect")
}

pub async fn wechat_callback(State(_state): State<AppState>) -> Redirect {
    // TODO: Handle WeChat OAuth callback
    Redirect::to("/")
}
