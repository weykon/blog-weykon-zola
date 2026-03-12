use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

pub const DEFAULT_AI_PROVIDER: &str = "moonshot";
pub const DEFAULT_AI_MODEL: &str = "moonshot-v1-8k";

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AiSettings {
    pub id: i32,
    pub provider: String,
    pub model: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub updated_by: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
