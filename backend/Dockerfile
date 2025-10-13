# Multi-stage build for Rust backend
FROM rust:1.75-alpine AS builder

# Install build dependencies
RUN apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig

WORKDIR /app

# Copy manifests
COPY Cargo.toml ./
COPY Cargo.lock ./

# Copy source code
COPY src ./src
COPY migrations ./migrations
COPY templates ./templates
COPY static ./static

# Build for release
RUN cargo build --release

# Runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache libgcc openssl ca-certificates curl

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/blog-weykon /app/blog-weykon

# Copy necessary files
COPY --from=builder /app/templates /app/templates
COPY --from=builder /app/static /app/static
COPY --from=builder /app/migrations /app/migrations

# Create uploads directory
RUN mkdir -p /app/static/uploads && chmod 755 /app/static/uploads

# Expose port
EXPOSE 3000

# Run the binary
CMD ["/app/blog-weykon"]
