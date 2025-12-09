use axum::extract::{State, Request};
use axum::response::Html;
use sqlx::PgPool;
use tera::Tera;

use crate::config::Config;
use crate::middleware::auth::UserContext;

pub mod posts;
pub mod mutters;
pub mod auth;
pub mod admin;
pub mod api;
pub mod api_frontend;
pub mod spa;

// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub tera: Tera,
    pub config: Config,
}

// Helper function to extract base_path from config
impl AppState {
    pub fn get_base_path(&self) -> String {
        self.config.base_url
            .trim_end_matches('/')
            .rsplit_once('/')
            .map(|(_, path)| format!("/{}", path))
            .unwrap_or_else(|| "".to_string())
    }

    pub fn create_context(&self) -> tera::Context {
        let mut context = tera::Context::new();
        context.insert("base_path", &self.get_base_path());
        context
    }
}

// Home page handler
pub async fn index(
    State(state): State<AppState>,
    request: Request,
) -> Html<String> {
    let mut context = state.create_context();
    context.insert("title", "Weykon's Blog");

    // Try to get user context from request extensions
    if let Some(user) = request.extensions().get::<UserContext>() {
        context.insert("current_user", &user);
    }

    let html = state.tera
        .render("index.html", &context)
        .unwrap_or_else(|e| format!("Error rendering template: {}", e));

    Html(html)
}
