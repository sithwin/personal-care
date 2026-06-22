# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer-cache efficiency
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/mcp/package.json ./packages/mcp/

# Install all deps (npm workspaces hoists to root node_modules)
# @rollup/rollup-linux-x64-gnu is optional and will be skipped on arm64 — expected
RUN npm ci

# Copy backend source
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/tsconfig.json ./packages/backend/

# Compile TypeScript → dist/
RUN npm run build --workspace=packages/backend

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/mcp/package.json ./packages/mcp/

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

EXPOSE 3001
CMD ["node", "packages/backend/dist/index.js"]
