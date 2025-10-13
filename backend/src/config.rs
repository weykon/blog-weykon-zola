use anyhow::Result;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub app_host: String,
    pub app_port: u16,
    pub base_url: String,

    // OAuth
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,

    pub wechat_app_id: String,
    pub wechat_app_secret: String,
    pub wechat_redirect_uri: String,

    // Session & JWT
    pub session_secret: String,
    pub jwt_secret: String,
    pub jwt_expiration: i64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        Ok(Config {
            database_url: std::env::var("DATABASE_URL")?,
            app_host: std::env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            app_port: std::env::var("APP_PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()?,
            base_url: std::env::var("BASE_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()),

            google_client_id: std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
            google_client_secret: std::env::var("GOOGLE_CLIENT_SECRET").unwrap_or_default(),
            google_redirect_uri: std::env::var("GOOGLE_REDIRECT_URI").unwrap_or_default(),

            wechat_app_id: std::env::var("WECHAT_APP_ID").unwrap_or_default(),
            wechat_app_secret: std::env::var("WECHAT_APP_SECRET").unwrap_or_default(),
            wechat_redirect_uri: std::env::var("WECHAT_REDIRECT_URI").unwrap_or_default(),

            session_secret: std::env::var("SESSION_SECRET")
                .unwrap_or_else(|_| "change_this_secret_in_production".to_string()),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "change_this_jwt_secret".to_string()),
            jwt_expiration: std::env::var("JWT_EXPIRATION")
                .unwrap_or_else(|_| "86400".to_string())
                .parse()?,
        })
    }
}
