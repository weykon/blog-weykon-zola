/// Data Transfer Objects for frontend API compatibility
use serde::Serialize;
use chrono::{DateTime, Utc};

use super::post::Post;

/// Frontend-compatible Post response
#[derive(Debug, Serialize)]
pub struct PostDto {
    pub id: String,
    pub title: String,
    pub excerpt: String,
    pub date: String,  // ISO 8601 format: YYYY-MM-DD
    pub views: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

impl From<Post> for PostDto {
    fn from(post: Post) -> Self {
        PostDto {
            id: post.id.to_string(),
            title: post.title,
            excerpt: post.excerpt.unwrap_or_else(|| {
                // Extract first 200 chars as excerpt if not set
                post.content.chars().take(200).collect::<String>() + "..."
            }),
            date: post.created_at.format("%Y-%m-%d").to_string(),
            views: post.view_count,
            tags: None,  // Will be populated separately if needed
        }
    }
}

/// Frontend-compatible Mutter response
#[derive(Debug, Serialize)]
pub struct MutterDto {
    pub id: String,
    pub content: String,
    pub date: String,  // ISO 8601 format with time: YYYY-MM-DD HH:MM
    #[serde(rename = "charCount")]
    pub char_count: usize,
    pub views: i32,
}

impl From<Post> for MutterDto {
    fn from(post: Post) -> Self {
        MutterDto {
            id: post.id.to_string(),
            content: post.content.clone(),
            date: post.created_at.format("%Y-%m-%d %H:%M").to_string(),
            char_count: post.content.chars().count(),
            views: post.view_count,
        }
    }
}

/// Post with tags populated
#[derive(Debug, Serialize)]
pub struct PostWithTags {
    #[serde(flatten)]
    pub post: PostDto,
    pub tags: Vec<String>,
}

impl PostWithTags {
    pub fn new(post: Post, tags: Vec<String>) -> Self {
        let mut dto = PostDto::from(post);
        dto.tags = Some(tags.clone());
        PostWithTags {
            post: dto,
            tags,
        }
    }
}
