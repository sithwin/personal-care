# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/mcp/package.json ./packages/mcp/

RUN npm ci

# Copy full frontend package (src, index.html, config files)
COPY packages/frontend ./packages/frontend

RUN npm run build --workspace=packages/frontend

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
