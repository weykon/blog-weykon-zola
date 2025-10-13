use anyhow::Result;
use tera::Tera;
use std::path::PathBuf;

pub fn init_tera() -> Result<Tera> {
    // Get the path to the backend directory
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let templates_path = PathBuf::from(manifest_dir)
        .join("templates")
        .join("**")
        .join("*.html");

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
