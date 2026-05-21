use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Mutter {
    pub id: i32,
    pub title: Option<String>,
    pub slug: String,
    pub content: String,
    pub author_id: Option<i32>,
    pub is_private: bool,
    pub view_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMutter {
    pub content: String,
    pub title: Option<String>,
    pub is_private: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMutter {
    pub content: Option<String>,
}

impl Mutter {
    pub fn character_count(&self) -> usize {
        self.content.chars().count()
    }
}

pub const MAX_MUTTER_LENGTH: usize = 10000;

impl CreateMutter {
    pub fn generate_title(&self) -> String {
        if let Some(title) = &self.title {
            if !title.trim().is_empty() {
                return title.clone();
            }
        }
        let preview: String = self.content.chars().take(50).collect();
        format!("{}...", preview.trim())
    }

    pub fn generate_slug(&self) -> String {
        let timestamp = chrono::Utc::now().timestamp();
        let content_preview: String = self.content
            .chars()
            .take(20)
            .collect::<String>()
            .to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else if c.is_whitespace() { '-' } else { '-' })
            .collect();

        let cleaned: String = content_preview
            .split('-')
            .filter(|s| !s.is_empty())
            .collect::<Vec<&str>>()
            .join("-");

        format!("{}-{}", timestamp, cleaned)
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.content.trim().is_empty() {
            return Err("Content cannot be empty".to_string());
        }
        if self.content.chars().count() > MAX_MUTTER_LENGTH {
            return Err(format!("Content too long (max {} characters)", MAX_MUTTER_LENGTH));
        }
        Ok(())
    }
}
