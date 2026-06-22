# Raspberry Pi 5 Production Deployment Design

**Date:** 2026-06-22
**Status:** Approved

## Overview

Deploy the personal-care monorepo to a Raspberry Pi 5 on the home LAN. GitHub Actions builds ARM64 Docker images and pushes them to GitHub Container Registry (GHCR). Watchtower on the Pi polls GHCR and automatically redeploys the backend and frontend when new images are available. Postgres and Meilisearch run as stable, Watchtower-excluded containers to protect persisted data.

## Architecture

```
Windows machine
  └── git push origin main
          │
          ▼
    GitHub Actions (.github/workflows/deploy.yml)
      ├── Build backend image (linux/arm64) → ghcr.io/<owner>/personal-care-backend:latest
      └── Build frontend image (linux/arm64) → ghcr.io/<owner>/personal-care-frontend:latest
                                │
                                ▼ (Watchtower polls GHCR every 5 min)
                      Raspberry Pi 5 (LAN, port 80)
                        ├── frontend  (nginx — serves React SPA, proxies /api/ to backend)
                        ├── backend   (Node.js compiled, port 3001 internal only)
                        ├── postgres  (port 5432 internal, volume-persisted, Watchtower-excluded)
                        ├── meilisearch (port 7700 internal, volume-persisted, Watchtower-excluded)
                        └── watchtower (monitors backend + frontend containers only)
```

**Access:** `http://<pi-lan-ip>` from any device on the home network. No SSL, no external exposure.

## Components

### 1. Backend Dockerfile (`packages/backend/Dockerfile`)

Multi-stage build:

- **Stage 1 (builder):** `node:20-alpine` — copies monorepo root manifests + backend source, runs `npm ci` (full install), runs `tsc` to compile `src/` → `dist/`
- **Stage 2 (runtime):** `node:20-alpine` — copies monorepo manifests, runs `npm ci --omit=dev`, copies `dist/` from builder, exposes port 3001, `CMD ["node", "packages/backend/dist/index.js"]`

Requires adding `"build": "tsc"` to `packages/backend/package.json` scripts (the tsconfig already has `outDir: "dist"` and `rootDir: "src"`).

### 2. Frontend Dockerfile (`packages/frontend/Dockerfile`)

Multi-stage build:

- **Stage 1 (builder):** `node:20-alpine` — installs deps, runs `npm run build` (Vite → `dist/`)
- **Stage 2 (runtime):** `nginx:alpine` — copies `dist/` to nginx html root, uses a custom `nginx.conf`

The `nginx.conf` must:
- Serve static files with SPA fallback (`try_files $uri /index.html`)
- Proxy `/api/*` → `http://backend:3001/api/v1/*` (rewriting the path — strips `/api`, prepends `/api/v1`, matching the Vite dev proxy behaviour in `vite.config.ts`)

### 3. Production Compose (`docker-compose.prod.yml`)

Five services on a shared internal Docker network (`personal-care-net`):

| Service | Image | Ports | Watchtower |
|---|---|---|---|
| postgres | postgres:16-alpine | internal only | excluded |
| meilisearch | getmeili/meilisearch:latest | internal only | excluded |
| backend | ghcr.io/<owner>/personal-care-backend:latest | internal only | monitored |
| frontend | ghcr.io/<owner>/personal-care-frontend:latest | 80:80 | monitored |
| watchtower | containrrr/watchtower | — | — |

Watchtower is scoped to `backend` and `frontend` via container labels (`com.centurylinklabs.watchtower.enable=true`). Postgres and Meilisearch have the label set to `false`.

Backend reads environment from `.env.prod` on the Pi (never committed):

```
DATABASE_URL=postgres://postgres:<password>@postgres:5432/personal_care
MEILISEARCH_URL=http://meilisearch:7700
MEILISEARCH_MASTER_KEY=<strong-key>
CORS_ORIGIN=http://<pi-lan-ip>
PORT=3001
NODE_ENV=production
```

Volumes `postgres_data` and `meilisearch_data` are named volumes (survive container restarts and Watchtower redeploys).

### 4. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

Trigger: `push` to `main`.

Steps:
1. Checkout
2. Set up Docker Buildx
3. Login to GHCR — uses `${{ github.actor }}` + `${{ secrets.GITHUB_TOKEN }}` (automatic, no extra secrets needed)
4. Build and push backend image: `--platform linux/arm64`
5. Build and push frontend image: `--platform linux/arm64`

**Build time note:** Cross-compilation via QEMU on GitHub's x86 runners takes ~10–15 min. Acceptable for a personal app with infrequent pushes.

Images are tagged `:latest`. Watchtower detects digest changes, not just tag changes.

### 5. Pi One-Time Setup

Run once over SSH from the Windows machine:

1. Install Docker Engine (official ARM64 Debian install, not `apt install docker.io`)
2. `docker login ghcr.io` with GitHub username + PAT (`read:packages` scope)
3. Copy `docker-compose.prod.yml` to the Pi (via `scp` or create directly)
4. Create `.env.prod` on the Pi with production secrets
5. `docker compose -f docker-compose.prod.yml up -d`
6. Verify: open `http://<pi-lan-ip>` from a browser on the same network

All future deploys are automatic: push to `main` → GitHub Actions builds → Watchtower redeploys.

## Secrets & Security

- `.env.prod` lives only on the Pi, never committed to git
- GHCR auth uses the automatic `GITHUB_TOKEN` — no long-lived PATs in GitHub Actions
- Pi PAT for `docker login` needs only `read:packages` (read-only)
- Postgres and Meilisearch ports are not exposed to the host, only reachable within the Docker network
- `CORS_ORIGIN` is set to the Pi's LAN IP to prevent cross-origin requests from unexpected sources

## Deviations & Constraints

- No SSL — LAN-only, no need for HTTPS
- No external DNS — access by Pi's LAN IP (consider setting a static IP on the Pi or reserving it in your router's DHCP settings)
- ARM64 cross-compilation adds ~10–15 min to CI — accepted tradeoff
- `@rollup/rollup-linux-x64-gnu` is an optional dep in backend `package.json` — must be excluded or replaced with the ARM64 variant in the Docker build context
