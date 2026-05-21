use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// Content type enum
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "content_type", rename_all = "lowercase")]
pub enum ContentType {
    #[serde(rename = "post")]
    Post,
    #[serde(rename = "mutter")]
    Mutter,
}

impl Default for ContentType {
    fn default() -> Self {
        ContentType::Post
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Post {
    pub id: i32,
    pub content_type: ContentType,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub author_id: Option<i32>,
    pub workspace_id: Option<i32>,
    pub book_id: Option<i32>,
    pub is_ai_generated: bool,
    pub is_draft: bool,
    pub is_private: bool,  // Privacy control: only visible to author and admins
    pub view_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePost {
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub workspace_id: Option<i32>,
    pub book_id: Option<i32>,
    pub is_ai_generated: bool,
    pub is_draft: bool,
    pub is_private: Option<bool>,  // Privacy control
    pub tags: Option<Vec<i32>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePost {
    pub title: Option<String>,
    pub slug: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<String>,
    pub workspace_id: Option<i32>,
    pub book_id: Option<i32>,
    pub is_ai_generated: Option<bool>,
    pub is_draft: Option<bool>,
    pub is_private: Option<bool>,  // Privacy control
    pub tags: Option<Vec<i32>>,
}

// Constants
pub const MIN_POST_LENGTH: usize = 100;

// Implementation methods
impl Post {
    /// Validate post
    pub fn validate(&self) -> Result<(), String> {
        if self.title.is_empty() {
            return Err("Post title is required".to_string());
        }
        if self.content.len() < MIN_POST_LENGTH {
            return Err(format!("Post content too short (min {} chars)", MIN_POST_LENGTH));
        }
        Ok(())
    }

    /// Get character count
    pub fn character_count(&self) -> usize {
        self.content.chars().count()
    }

    /// Check if this is a post
    pub fn is_post(&self) -> bool {
        self.content_type == ContentType::Post
    }
}

#[derive(Debug, Serialize, FromRow)]
pub struct PostWithAuthor {
    pub id: i32,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub author_id: Option<i32>,
    pub author_name: Option<String>,
    pub workspace_id: Option<i32>,
    pub book_id: Option<i32>,
    pub is_ai_generated: bool,
    pub is_draft: bool,
    pub view_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
