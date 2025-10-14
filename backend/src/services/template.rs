use anyhow::Result;
use tera::Tera;
use std::path::PathBuf;
use std::env;

pub fn init_tera() -> Result<Tera> {
    // Try multiple paths to find templates (supports both dev and production)
    let templates_path = if let Ok(current_dir) = env::current_dir() {
        // In production: /root/blog.weykon/templates/**/*.html
        current_dir.join("templates").join("**").join("*.html")
    } else {
        // Fallback to compile-time path for local development
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("templates")
            .join("**")
            .join("*.html")
    };

    let mut tera = Tera::new(templates_path.to_str().unwrap())?;

    // Auto-reload templates in development
    #[cfg(debug_assertions)]
    {
        tera.autoescape_on(vec!["html"]);
        tera.full_reload()?;
    }

    // Register custom filters if needed
    // tera.register_filter("markdown", markdown_filter);

    Ok(tera)
}
