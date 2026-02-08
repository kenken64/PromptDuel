# Build stage - compile node-pty native module
FROM node:20-bookworm AS builder

WORKDIR /app

# Install build dependencies for node-pty
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including native modules)
RUN npm ci

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    bash \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Copy node_modules from builder (includes compiled node-pty)
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create workspaces directory
RUN mkdir -p /app/workspaces

# Set environment variables
ENV NODE_ENV=production
ENV WORKSPACES_DIR=/app/workspaces
ENV SHELL=/bin/bash

# Expose WebSocket port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const ws = new (require('ws'))('ws://localhost:3001'); ws.on('open', () => process.exit(0)); ws.on('error', () => process.exit(1)); setTimeout(() => process.exit(1), 5000);"

# Run the server
CMD ["node", "index.js"]
