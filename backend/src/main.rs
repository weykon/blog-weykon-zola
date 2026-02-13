use axum::{
    routing::{get, post, put},
    Router,
    middleware as axum_middleware,
};
use std::{net::SocketAddr, path::PathBuf};
use tower_http::{
    services::ServeDir,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod handlers;
mod middleware;
mod models;
mod services;

use config::Config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "blog_weykon=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env()?;

    tracing::info!("Starting blog server on {}:{}", config.app_host, config.app_port);

    // Initialize database connection pool
    let db_pool = db::create_pool(&config.database_url).await?;

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await?;

    tracing::info!("Database migrations completed");

    // Initialize Tera template engine
    let tera = services::template::init_tera()?;

    // Build application state
    let app_state = handlers::AppState {
        db: db_pool,
        tera,
        config: config.clone(),
    };

    // Build protected routes first
    let protected_routes = Router::new()
        // Admin routes (protected with dev mode bypass)
        .route("/admin", get(handlers::admin::dashboard))
        .route("/admin/editor", get(handlers::admin::editor))
        .route("/admin/editor/:id", get(handlers::admin::edit_post))
        // Protected routes - Mutters (COMMENTED OUT - Using React SPA instead)
        // .route("/mutters", get(handlers::mutters::list))
        // .route("/mutters/:slug", get(handlers::mutters::detail))
        // Protected routes - Mutters API (all mutters are private, require authentication)
        .route("/api/mutters", get(handlers::api_frontend::list_mutters_frontend))
        .route("/api/mutters/:id", get(handlers::api_frontend::get_mutter_frontend))
        // API routes - Posts (protected with dev mode bypass for write operations)
        .route("/api/posts", post(handlers::api::create_post))
        .route("/api/posts/:id", put(handlers::api::update_post).delete(handlers::api::delete_post))
        // API routes - Mutters write operations (protected)
        .route("/api/mutters", post(handlers::api::create_mutter))
        .route("/api/mutters/:id", put(handlers::api::update_mutter).delete(handlers::api::delete_mutter))
        // API routes - Upload
        .route("/api/upload", post(handlers::api::upload_image))
        .layer(axum_middleware::from_fn(middleware::dev_auth_bypass));

    // Build public routes
    let app = Router::new()
        // Auth routes (must come before SPA catchall)
        .route("/auth/login", get(handlers::auth::login_page).post(handlers::auth::login))
        .route("/auth/logout", get(handlers::auth::logout))
        .route("/auth/google", get(handlers::auth::google_login))
        .route("/auth/google/callback", get(handlers::auth::google_callback))
        .route("/auth/wechat", get(handlers::auth::wechat_login))
        .route("/auth/wechat/callback", get(handlers::auth::wechat_callback))

        // Public API routes (frontend-friendly DTOs)
        .route("/api/posts", get(handlers::api_frontend::list_posts_frontend))
        .route("/api/posts/:id", get(handlers::api_frontend::get_post_frontend))
        .route("/api/user/me", get(handlers::auth::get_current_user))
        .route("/api/tags", get(handlers::api_frontend::list_tags_frontend))

        // Public Tera template routes (COMMENTED OUT - Using React SPA instead)
        // .route("/", get(handlers::index))
        // .route("/posts", get(handlers::posts::list))
        // .route("/posts/:slug", get(handlers::posts::detail))
        // .route("/tags/:tag", get(handlers::posts::by_tag))

        // Merge protected routes
        .merge(protected_routes)

        // React SPA assets (Nginx strips /blog prefix, so backend sees /assets/*)
        .nest_service("/assets", ServeDir::new({
            if let Ok(current_dir) = std::env::current_dir() {
                current_dir.join("static/app/assets")
            } else {
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("static/app/assets")
            }
        }))

        // Old static route for backward compatibility (Tera templates, etc.)
        .nest_service("/static", ServeDir::new({
            if let Ok(current_dir) = std::env::current_dir() {
                current_dir.join("static")
            } else {
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("static")
            }
        }))

        // SPA catchall - MUST be last
        // All routes not matching above will serve the React app
        .fallback(get(handlers::spa::serve_spa))

        // Add state and layers
        .with_state(app_state)
        .layer(axum_middleware::from_fn(middleware::user_context))
        .layer(TraceLayer::new_for_http());

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.app_port));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("Server listening on {}", addr);

    axum::serve(listener, app)
        .await?;

    Ok(())
}
