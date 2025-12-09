/// SPA (Single Page Application) handler
/// Serves the React frontend for all non-API routes
use axum::{
    response::{Html, IntoResponse},
    http::StatusCode,
};
use std::path::PathBuf;

pub async fn serve_spa() -> impl IntoResponse {
    // Determine the path to index.html
    let index_path = if let Ok(current_dir) = std::env::current_dir() {
        current_dir.join("static/app/index.html")
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("static/app/index.html")
    };

    // Read and serve index.html
    match tokio::fs::read_to_string(&index_path).await {
        Ok(content) => (StatusCode::OK, Html(content)).into_response(),
        Err(e) => {
            tracing::error!("Failed to read index.html: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Html("<h1>Error loading application</h1>".to_string())
            ).into_response()
        }
    }
}
