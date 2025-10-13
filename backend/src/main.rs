use axum::{
    routing::{get, post},
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

    // Build router
    let app = Router::new()
        // Public routes - Home
        .route("/", get(handlers::index))

        // Public routes - Posts
        .route("/posts", get(handlers::posts::list))
        .route("/posts/:slug", get(handlers::posts::detail))

        // Public routes - Mutters
        .route("/mutters", get(handlers::mutters::list))
        .route("/mutters/:slug", get(handlers::mutters::detail))

        // Public routes - Tags
        .route("/tags/:tag", get(handlers::posts::by_tag))

        // Auth routes
        .route("/auth/login", get(handlers::auth::login_page).post(handlers::auth::login))
        .route("/auth/logout", get(handlers::auth::logout))
        .route("/auth/google", get(handlers::auth::google_login))
        .route("/auth/google/callback", get(handlers::auth::google_callback))
        .route("/auth/wechat", get(handlers::auth::wechat_login))
        .route("/auth/wechat/callback", get(handlers::auth::wechat_callback))

        // Admin routes (protected with dev mode bypass)
        .route("/admin", get(handlers::admin::dashboard))
        .route("/admin/editor", get(handlers::admin::editor))
        .route("/admin/editor/:id", get(handlers::admin::edit_post))
        .layer(axum_middleware::from_fn(middleware::dev_auth_bypass))

        // API routes - Posts (protected with dev mode bypass for write operations)
        .route("/api/posts", get(handlers::api::list_posts).post(handlers::api::create_post))
        .route("/api/posts/:id", get(handlers::api::get_post).put(handlers::api::update_post).delete(handlers::api::delete_post))
        .layer(axum_middleware::from_fn(middleware::dev_auth_bypass))

        // API routes - Mutters (protected with dev mode bypass for write operations)
        .route("/api/mutters", get(handlers::api::list_mutters).post(handlers::api::create_mutter))
        .route("/api/mutters/:id", get(handlers::api::get_mutter).put(handlers::api::update_mutter).delete(handlers::api::delete_mutter))
        .layer(axum_middleware::from_fn(middleware::dev_auth_bypass))

        .route("/api/tags", get(handlers::api::list_tags))
        .route("/api/upload", post(handlers::api::upload_image))
        .layer(axum_middleware::from_fn(middleware::dev_auth_bypass))

        // Static files
        .nest_service("/static", ServeDir::new(
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("static")
        ))

        // Add state and layers
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.app_port));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("Server listening on {}", addr);

    axum::serve(listener, app)
        .await?;

    Ok(())
}
