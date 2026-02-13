# Multi-stage build for production deployment
# Stage 1: Builder
FROM rust:1.83-slim as builder

# Install required dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /build

# Copy manifests first (for better caching)
COPY Cargo.toml Cargo.lock ./
COPY .sqlx ./.sqlx

# Create dummy source to build dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs

# Build dependencies only (this layer will be cached)
ENV SQLX_OFFLINE=true
RUN cargo build --release && \
    rm -rf src

# Now copy real source code
COPY src ./src
COPY migrations ./migrations
COPY templates ./templates
COPY static ./static

# Build the actual application (dependencies are already cached)
RUN touch src/main.rs && \
    cargo build --release

# Note: We'll handle migrations at runtime in the application startup
# instead of using sqlx-cli to avoid edition2024 dependency issues

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/target/release/blog-weykon /app/blog-weykon

# Copy application files
COPY --from=builder /build/templates /app/templates
COPY --from=builder /build/static /app/static
COPY --from=builder /build/migrations /app/migrations

# Create uploads directory
RUN mkdir -p /app/static/uploads && chown -R appuser:appuser /app

# Switch to app user
USER appuser

# Expose port
EXPOSE 3000

# Set environment variables (can be overridden by docker-compose)
ENV RUST_LOG=info
ENV APP_HOST=0.0.0.0
ENV APP_PORT=3000

# Start the application (migrations are run in main.rs)
CMD ["./blog-weykon"]
