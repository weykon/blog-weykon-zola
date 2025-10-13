use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Book {
    pub id: i32,
    pub title: String,
    pub slug: String,
    pub description: Option<String>,
    pub workspace_id: Option<i32>,
    pub order_index: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBook {
    pub title: String,
    pub slug: String,
    pub description: Option<String>,
    pub workspace_id: Option<i32>,
    pub order_index: i32,
}
