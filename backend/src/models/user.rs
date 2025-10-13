use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i32,
    pub google_id: Option<String>,
    pub wechat_unionid: Option<String>,
    pub username: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub is_admin: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUser {
    pub google_id: Option<String>,
    pub wechat_unionid: Option<String>,
    pub username: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}
