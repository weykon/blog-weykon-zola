use axum::{
    extract::Request,
    http::{StatusCode, HeaderMap},
    middleware::Next,
    response::{Response, IntoResponse},
};
use crate::services::jwt::JwtService;
use serde::{Deserialize, Serialize};

/// User information extracted from JWT for template rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    pub user_id: String,
    pub email: String,
    pub username: String,
    pub is_admin: bool,
}

/// Authentication middleware with JWT validation
/// In dev mode, allows access without authentication
pub async fn dev_auth_bypass(
    headers: HeaderMap,
    mut request: Request,
    next: Next,
) -> Response {
    // Check if DEV_MODE is enabled
    let dev_mode = std::env::var("DEV_MODE")
        .unwrap_or_else(|_| "false".to_string())
        .to_lowercase() == "true";

    if dev_mode {
        // In dev mode, always allow access
        tracing::debug!("DEV_MODE enabled - bypassing authentication");
        return next.run(request).await;
    }

    // In production mode, validate JWT token
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_jwt_secret_key_change_in_production".to_string());
    let jwt_service = JwtService::new(&jwt_secret);

    // Try to get token from cookie
    let token = if let Some(cookie) = headers.get("cookie") {
        if let Ok(cookie_str) = cookie.to_str() {
            extract_token_from_cookie(cookie_str)
        } else {
            None
        }
    } else {
        None
    };

    // Validate token
    if let Some(token) = token {
        match jwt_service.validate_token(&token) {
            Ok(claims) => {
                // Store claims in request extensions for handlers to use
                request.extensions_mut().insert(claims);
                return next.run(request).await;
            }
            Err(e) => {
                tracing::warn!("Invalid JWT token: {:?}", e);
            }
        }
    }

    // No valid authentication found
    (
        StatusCode::UNAUTHORIZED,
        "Authentication required. Please login first."
    ).into_response()
}

/// Extract JWT token from cookie string
fn extract_token_from_cookie(cookie_str: &str) -> Option<String> {
    for cookie in cookie_str.split(';') {
        let cookie = cookie.trim();
        if let Some(value) = cookie.strip_prefix("auth_token=") {
            return Some(value.to_string());
        }
    }
    None
}

/// Extract user context from JWT token without blocking access
/// This middleware adds user information to request extensions if authenticated,
/// but allows unauthenticated requests to pass through
pub async fn user_context(
    headers: HeaderMap,
    mut request: Request,
    next: Next,
) -> Response {
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "default_jwt_secret_key_change_in_production".to_string());
    let jwt_service = JwtService::new(&jwt_secret);

    // Try to get token from cookie
    let token = if let Some(cookie) = headers.get("cookie") {
        if let Ok(cookie_str) = cookie.to_str() {
            extract_token_from_cookie(cookie_str)
        } else {
            None
        }
    } else {
        None
    };

    // If token exists and is valid, add user context to extensions
    if let Some(token) = token {
        if let Ok(claims) = jwt_service.validate_token(&token) {
            let user_context = UserContext {
                user_id: claims.sub.clone(),
                email: claims.email.clone(),
                username: claims.username.clone(),
                is_admin: claims.is_admin,
            };
            request.extensions_mut().insert(user_context);
            tracing::debug!("User context added: {}", claims.username);
        }
    }

    // Always continue, even if no valid authentication
    next.run(request).await
}

/// Optional: Simple API key check for development
pub async fn dev_api_key(
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Response {
    let dev_mode = std::env::var("DEV_MODE")
        .unwrap_or_else(|_| "false".to_string())
        .to_lowercase() == "true";

    if dev_mode {
        return next.run(request).await;
    }

    // Check for API key in header
    if let Some(api_key) = headers.get("X-API-Key") {
        let expected_key = std::env::var("API_KEY").unwrap_or_default();
        if !expected_key.is_empty() && api_key.as_bytes() == expected_key.as_bytes() {
            return next.run(request).await;
        }
    }

    (
        StatusCode::UNAUTHORIZED,
        "Valid API key required"
    ).into_response()
}
