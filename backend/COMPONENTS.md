# UI Components Usage Guide
# UI 组件使用指南

This document describes the reusable UI components available in the project.

本文档介绍项目中可用的可复用 UI 组件。

## Components / 组件

### Card / 卡片

Cards are used to group related content.

```html
<div class="card">
    <div class="card-header">
        <h3 class="card-title">Card Title</h3>
        <p class="card-description">Card description goes here</p>
    </div>
    <div class="card-content">
        <p>Card content goes here</p>
    </div>
    <div class="card-footer">
        <button class="btn btn-primary">Action</button>
    </div>
</div>
```

### Button / 按钮

Buttons come in different variants and sizes.

```html
<!-- Variants -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-destructive">Destructive</button>

<!-- Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- Disabled -->
<button class="btn btn-primary" disabled>Disabled</button>
```

### Badge / 徽章

Badges are used for labels and status indicators.

```html
<span class="badge badge-default">Default</span>
<span class="badge badge-secondary">Secondary</span>
<span class="badge badge-outline">Outline</span>
<span class="badge badge-destructive">Error</span>
```

### Input / 输入框

Form input fields with consistent styling.

```html
<div>
    <label class="label" for="email">Email</label>
    <input type="email" id="email" class="input" placeholder="Enter your email">
</div>

<!-- Disabled state -->
<input type="text" class="input" placeholder="Disabled" disabled>
```

### Textarea / 文本域

Multi-line text input.

```html
<div>
    <label class="label" for="message">Message</label>
    <textarea id="message" class="textarea" placeholder="Enter your message"></textarea>
</div>
```

### Alert / 警告框

Alerts for displaying important messages.

```html
<!-- Default -->
<div class="alert alert-default">
    <div>
        <div class="alert-title">Heads up!</div>
        <div class="alert-description">This is a default alert message.</div>
    </div>
</div>

<!-- Success -->
<div class="alert alert-success">
    <div>
        <div class="alert-title">Success!</div>
        <div class="alert-description">Your operation was successful.</div>
    </div>
</div>

<!-- Warning -->
<div class="alert alert-warning">
    <div>
        <div class="alert-title">Warning!</div>
        <div class="alert-description">Please be careful with this action.</div>
    </div>
</div>

<!-- Error -->
<div class="alert alert-destructive">
    <div>
        <div class="alert-title">Error!</div>
        <div class="alert-description">Something went wrong.</div>
    </div>
</div>
```

### Separator / 分隔线

Visual separators for content.

```html
<!-- Horizontal -->
<div class="separator"></div>

<!-- Vertical (use in flex containers) -->
<div style="display: flex;">
    <div>Content 1</div>
    <div class="separator-vertical"></div>
    <div>Content 2</div>
</div>
```

### Skeleton / 骨架屏

Loading placeholders for content.

```html
<div class="skeleton" style="height: 20px; width: 200px;"></div>
<div class="skeleton" style="height: 100px; width: 100%; margin-top: 1rem;"></div>
```

## Matrix Rain Effect / 矩阵雨效果

The Matrix Rain effect is available via the `MatrixRain` JavaScript class.

### HTML Structure

```html
<div id="matrix-rain-container" class="matrix-container"></div>
```

### JavaScript Initialization

```javascript
new MatrixRain('matrix-rain-container', {
    lineCount: 15,           // Number of lines
    refreshRate: 37,         // Refresh rate in ms
    keywords: [              // Keywords to highlight
        "Hello", "World", "Rust", "Axum"
    ],
    lineLength: 60,          // Length of each line
    minSpeed: 70,            // Minimum animation speed
    maxSpeed: 130            // Maximum animation speed
});
```

## Tailwind CSS Integration

All components work seamlessly with Tailwind CSS utility classes. You can combine them:

```html
<div class="card mt-4 p-6">
    <h3 class="text-2xl font-bold mb-4">Title</h3>
    <p class="text-gray-600 mb-4">Content</p>
    <button class="btn btn-primary">Action</button>
</div>
```

## Color Customization

Custom colors are defined in `components.css` and can be modified:

```css
:root {
    --primary: #667eea;
    --secondary: #764ba2;
    --destructive: #ef4444;
    /* ... more colors */
}
```

## Utility Classes

- `.text-muted` - Muted text color
- `.text-primary` - Primary color text
- `.text-destructive` - Error/destructive color text

## Best Practices / 最佳实践

1. **Consistency**: Use the same component variants across your application for a consistent look.
2. **Accessibility**: Always use proper labels and ARIA attributes with form inputs.
3. **Responsive**: Components are mobile-friendly by default.
4. **Performance**: The Matrix Rain effect is optimized but use it sparingly to avoid performance issues.

## Examples in the Project

Check `backend/templates/index.html` for real-world usage examples of these components.
