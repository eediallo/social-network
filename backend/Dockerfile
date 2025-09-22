# Multi-stage build for Go backend
FROM golang:1.23-alpine AS builder

# Set working directory
WORKDIR /app

# Install git, ca-certificates, and build dependencies for CGO
RUN apk add --no-cache git ca-certificates gcc musl-dev

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# Final stage
FROM alpine:latest

# Install ca-certificates and SQLite for HTTPS requests and database
RUN apk --no-cache add ca-certificates sqlite

# Create app directory
WORKDIR /app

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Copy the binary from builder stage
COPY --from=builder /app/server .

# Copy migrations directory
COPY --from=builder /app/internal/db/migrations ./internal/db/migrations

    # Copy any static files if needed (only if directory exists and is not empty)
COPY --from=builder /app/internal/images ./internal/images

# Expose port
EXPOSE 8080

# Set environment variables
ENV DB_PATH=/app/data/app.db
ENV PORT=8080

# Run the application
CMD ["./server"]
