use ai_api_provider::{provider_by_name, resolve_api_key, ApiClient, ApiConfig, ApiProvider, ChatMessage};
use anyhow::{anyhow, Context, Result};
use serde::Deserialize;

use crate::models::AiSettings;

pub struct AiService {
    client: ApiClient,
}

#[derive(Debug, Clone)]
pub struct TranslationResult {
    pub title: String,
    pub excerpt: String,
    pub content: String,
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Deserialize)]
struct TranslationPayload {
    title: Option<String>,
    excerpt: Option<String>,
    content: Option<String>,
}

impl AiService {
    pub fn new() -> Self {
        Self {
            client: ApiClient::new(),
        }
    }

    pub async fn translate_mutter(
        &self,
        settings: &AiSettings,
        source_title: Option<&str>,
        source_content: &str,
    ) -> Result<TranslationResult> {
        let provider = provider_by_name(&settings.provider)
            .ok_or_else(|| anyhow!("Unsupported AI provider: {}", settings.provider))?;

        let mut config = ApiConfig::new(provider.provider, self.resolve_key(settings, provider.provider)?);
        config.model = settings.model.trim().to_string();

        if let Some(base_url) = settings.base_url.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            config.base_url = Some(base_url.to_string());
        }

        let prompt = build_translation_prompt(source_title, source_content);
        let raw = self.client
            .chat(
                &config,
                &[
                    ChatMessage::system(TRANSLATION_SYSTEM_PROMPT),
                    ChatMessage::user(prompt),
                ],
            )
            .await
            .with_context(|| format!("AI request failed for provider {}", settings.provider))?;

        let mut parsed = parse_translation(&raw, source_title, source_content);
        parsed.provider = settings.provider.clone();
        parsed.model = config.model;
        Ok(parsed)
    }

    fn resolve_key(&self, settings: &AiSettings, provider: ApiProvider) -> Result<String> {
        if let Some(api_key) = settings.api_key.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            return Ok(api_key.to_string());
        }

        resolve_api_key(provider)
            .ok_or_else(|| anyhow!("No API key configured for provider {}", settings.provider))
    }
}

impl Default for AiService {
    fn default() -> Self {
        Self::new()
    }
}

const TRANSLATION_SYSTEM_PROMPT: &str = r#"你是一个博客编辑助手。

任务：
1. 把用户输入的粤语、口语化或零散表达，整理成更正式、自然、克制的简体中文博客文章。
2. 保留原意、情绪和信息，不要杜撰事实。
3. 输出适合博客发布的 Markdown 正文。
4. 如果原文非常短，就合理扩写成一篇简洁但完整的小短文。
5. 输出必须是 JSON，对象格式固定为：
{"title":"...","excerpt":"...","content":"..."}

要求：
- title: 适合博客文章的标题，简体中文。
- excerpt: 1 到 2 句摘要，简体中文。
- content: Markdown 正文，简体中文。
- 不要输出 JSON 以外的任何文字。
- 不要使用代码块包裹 JSON。"#;

fn build_translation_prompt(source_title: Option<&str>, source_content: &str) -> String {
    let title = source_title.unwrap_or("").trim();
    format!(
        "原始标题：{}\n\n原始内容：\n{}",
        if title.is_empty() { "（无）" } else { title },
        source_content.trim()
    )
}

fn parse_translation(raw: &str, source_title: Option<&str>, _source_content: &str) -> TranslationResult {
    let normalized = strip_code_fences(raw.trim());

    if let Ok(payload) = serde_json::from_str::<TranslationPayload>(normalized) {
        let content = payload.content
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| normalized.to_string());

        let title = payload.title
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| default_title(source_title, &content));

        let excerpt = payload.excerpt
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| excerpt_from_content(&content));

        return TranslationResult {
            title,
            excerpt,
            content,
            provider: String::new(),
            model: String::new(),
        };
    }

    TranslationResult {
        title: default_title(source_title, normalized),
        excerpt: excerpt_from_content(normalized),
        content: normalized.to_string(),
        provider: String::new(),
        model: String::new(),
    }
}

fn strip_code_fences(raw: &str) -> &str {
    let trimmed = raw.trim();

    if let Some(inner) = trimmed.strip_prefix("```json").and_then(|value| value.strip_suffix("```")) {
        return inner.trim();
    }

    if let Some(inner) = trimmed.strip_prefix("```").and_then(|value| value.strip_suffix("```")) {
        return inner.trim();
    }

    trimmed
}

fn default_title(source_title: Option<&str>, content: &str) -> String {
    if let Some(title) = source_title.map(str::trim).filter(|value| !value.is_empty()) {
        return title.to_string();
    }

    let headline: String = content
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or("新文章")
        .trim()
        .trim_start_matches('#')
        .trim()
        .chars()
        .take(28)
        .collect();

    if headline.is_empty() {
        "新文章".to_string()
    } else {
        headline
    }
}

fn excerpt_from_content(content: &str) -> String {
    let plain = content
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#') && !line.starts_with("```"))
        .collect::<Vec<_>>()
        .join(" ");

    let excerpt: String = plain.chars().take(140).collect();
    excerpt.trim().to_string()
}
