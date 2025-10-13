use axum::extract::State;
use axum::response::Html;
use sqlx::PgPool;
use tera::Tera;

use crate::config::Config;

pub mod posts;
pub mod mutters;
pub mod auth;
pub mod admin;
pub mod api;

// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub tera: Tera,
    pub config: Config,
}

// Home page handler
pub async fn index(State(state): State<AppState>) -> Html<String> {
    let mut context = tera::Context::new();
    context.insert("title", "Weykon's Blog");

    let html = state.tera
        .render("index.html", &context)
        .unwrap_or_else(|e| format!("Error rendering template: {}", e));

    Html(html)
}
