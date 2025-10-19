use axum::{
    extract::{Path, State},
    response::Html,
};

use super::AppState;

pub async fn dashboard(State(state): State<AppState>) -> Html<String> {
    // TODO: Add authentication middleware check
    let mut context = state.create_context();
    context.insert("title", "Admin Dashboard");

    let html = state.tera
        .render("admin/dashboard.html", &context)
        .unwrap_or_else(|e| format!("Error: {}", e));

    Html(html)
}

pub async fn editor(State(state): State<AppState>) -> Html<String> {
    // New post editor
    let mut context = state.create_context();
    context.insert("title", "New Post");
    context.insert("mode", "create");

    let html = state.tera
        .render("editor.html", &context)
        .unwrap_or_else(|e| format!("Error: {}", e));

    Html(html)
}

pub async fn edit_post(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Html<String> {
    // Edit existing post
    let post = sqlx::query_as::<_, crate::models::Post>(
        "SELECT * FROM posts WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    if let Some(post) = post {
        let mut context = state.create_context();
        context.insert("title", "Edit Post");
        context.insert("mode", "edit");
        context.insert("post", &post);

        let html = state.tera
            .render("editor.html", &context)
            .unwrap_or_else(|e| format!("Error: {}", e));

        Html(html)
    } else {
        Html("<h1>404 - Post Not Found</h1>".to_string())
    }
}
