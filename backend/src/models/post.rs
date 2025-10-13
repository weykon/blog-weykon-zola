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

// Mutter-specific structs
#[derive(Debug, Deserialize)]
pub struct CreateMutter {
    pub content: String,
    pub title: Option<String>,
    pub is_private: Option<bool>,  // Privacy control
}

#[derive(Debug, Deserialize)]
pub struct UpdateMutter {
    pub content: Option<String>,
}

// Constants
pub const MAX_MUTTER_LENGTH: usize = 1000;
pub const MIN_POST_LENGTH: usize = 100;

// Implementation methods
impl Post {
    /// Validate post based on content type
    pub fn validate(&self) -> Result<(), String> {
        match self.content_type {
            ContentType::Post => {
                if self.title.is_empty() {
                    return Err("Post title is required".to_string());
                }
                if self.content.len() < MIN_POST_LENGTH {
                    return Err(format!("Post content too short (min {} chars)", MIN_POST_LENGTH));
                }
            }
            ContentType::Mutter => {
                if self.content.len() > MAX_MUTTER_LENGTH {
                    return Err(format!("Mutter content too long (max {} chars)", MAX_MUTTER_LENGTH));
                }
                if self.content.is_empty() {
                    return Err("Mutter content cannot be empty".to_string());
                }
            }
        }
        Ok(())
    }

    /// Get character count
    pub fn character_count(&self) -> usize {
        self.content.chars().count()
    }

    /// Check if this is a mutter
    pub fn is_mutter(&self) -> bool {
        self.content_type == ContentType::Mutter
    }

    /// Check if this is a post
    pub fn is_post(&self) -> bool {
        self.content_type == ContentType::Post
    }
}

impl CreateMutter {
    /// Generate title from content preview
    pub fn generate_title(&self) -> String {
        if let Some(title) = &self.title {
            title.clone()
        } else {
            let preview: String = self.content.chars().take(50).collect();
            format!("{}...", preview.trim())
        }
    }

    /// Generate slug from timestamp and content
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

        // Remove duplicate dashes and trim
        let cleaned: String = content_preview
            .split('-')
            .filter(|s| !s.is_empty())
            .collect::<Vec<&str>>()
            .join("-");

        format!("{}-{}", timestamp, cleaned)
    }

    /// Validate mutter content
    pub fn validate(&self) -> Result<(), String> {
        if self.content.is_empty() {
            return Err("Content cannot be empty".to_string());
        }
        if self.content.len() > MAX_MUTTER_LENGTH {
            return Err(format!("Content too long (max {} characters)", MAX_MUTTER_LENGTH));
        }
        Ok(())
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
