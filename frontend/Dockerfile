# =============================================================================
# Agent 40 — Frontend Dockerfile (Multi-stage: Build → Nginx Production)
# =============================================================================

# ── Stage 1: Node Build ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

LABEL maintainer="Agent40-FeeManagement"

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --silent

# Copy source code
COPY . .

# Build the production React bundle
RUN npm run build


# ── Stage 2: Nginx Production Server ─────────────────────────────────────────
FROM nginx:1.27-alpine AS production

LABEL description="Agent 40 — React Frontend (Nginx Static Server)"

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built React app from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://localhost:80 || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
