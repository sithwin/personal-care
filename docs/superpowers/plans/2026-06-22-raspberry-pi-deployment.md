# Raspberry Pi 5 Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the personal-care monorepo to a Raspberry Pi 5 via GitHub Actions → GHCR → Watchtower, accessible on the home LAN.

**Architecture:** GitHub Actions builds ARM64 Docker images for the backend (compiled TypeScript) and frontend (nginx serving a Vite static build), pushes them to GHCR, and Watchtower on the Pi auto-redeploys when new images appear. Postgres and Meilisearch run as stable, Watchtower-excluded containers on the Pi.

**Tech Stack:** Docker, Docker Buildx (QEMU ARM64 cross-compilation), GitHub Container Registry (GHCR), Watchtower, nginx, Node.js 20 Alpine, GitHub Actions.

## Global Constraints

- Target platform: `linux/arm64` (Raspberry Pi 5)
- Node.js version: 20 (matches existing backend + frontend)
- Postgres image: `postgres:16-alpine` (matches existing dev compose)
- Meilisearch image: `getmeili/meilisearch:latest` (matches existing dev compose)
- Backend env var for Meilisearch API key is `MEILISEARCH_API_KEY` (not `MEILISEARCH_MASTER_KEY`) — see `packages/backend/src/config/env.ts`
- Meilisearch container env var is `MEILI_MASTER_KEY` — these two must be set to the same value
- Backend reads DB connection from `DATABASE_URL` env var — see `packages/backend/src/db/client.ts`
- nginx proxies `/api/*` → `http://backend:3001/api/v1/*` rewriting the path (matches Vite dev proxy in `vite.config.ts`)
- All files committed; `.env.prod` never committed (add to `.gitignore` if not already present)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `.dockerignore` | Exclude node_modules and dist from Docker build context |
| Modify | `packages/backend/package.json` | Add `"build": "tsc"` script |
| Create | `packages/backend/Dockerfile` | Multi-stage: compile TS → run compiled JS |
| Create | `packages/frontend/nginx.conf` | SPA fallback + `/api/` proxy with path rewrite |
| Create | `packages/frontend/Dockerfile` | Multi-stage: Vite build → nginx static serve |
| Create | `docker-compose.prod.yml` | Wire all five services with Watchtower labels |
| Create | `.env.prod.example` | Template for the Pi's secrets file |
| Create | `.github/workflows/deploy.yml` | Build + push ARM64 images on push to main |

---

### Task 1: `.dockerignore` + backend build script

**Files:**
- Create: `.dockerignore`
- Modify: `packages/backend/package.json`

**Interfaces:**
- Produces: `npm run build --workspace=packages/backend` compiles `packages/backend/src/` → `packages/backend/dist/index.js`

- [ ] **Step 1: Create `.dockerignore` at the repo root**

```
**/node_modules
**/dist
**/.git
**/coverage
**/*.log
.husky
docs
*.md
packages/*/src/**/*.spec.ts
```

- [ ] **Step 2: Add `build` script to `packages/backend/package.json`**

In the `"scripts"` object add one entry (after the existing `"dev"` line):

```json
"build": "tsc",
```

The tsconfig already has `"outDir": "dist"` and `"rootDir": "src"` — no tsconfig changes needed.

- [ ] **Step 3: Verify the build produces `dist/`**

```bash
npm run build --workspace=packages/backend
```

Expected: exits 0, `packages/backend/dist/index.js` exists.

- [ ] **Step 4: Commit**

```bash
git add .dockerignore packages/backend/package.json
git commit -m "chore: add dockerignore and backend build script for production"
```

---

### Task 2: Backend Dockerfile

**Files:**
- Create: `packages/backend/Dockerfile`

**Interfaces:**
- Consumes: `packages/backend/dist/index.js` produced by `npm run build` (Task 1)
- Produces: Docker image that runs `node packages/backend/dist/index.js` on port 3001

- [ ] **Step 1: Create `packages/backend/Dockerfile`**

```dockerfile
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

RUN npm ci --omit=dev

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

EXPOSE 3001
CMD ["node", "packages/backend/dist/index.js"]
```

- [ ] **Step 2: Build the image locally (x86 — sanity check only, not arm64)**

```bash
docker build -f packages/backend/Dockerfile -t personal-care-backend:test .
```

Expected: exits 0. The image will not start correctly without Postgres, but the build must succeed.

- [ ] **Step 3: Confirm the entrypoint file exists inside the image**

```bash
docker run --rm personal-care-backend:test ls packages/backend/dist/index.js
```

Expected: prints `packages/backend/dist/index.js`.

- [ ] **Step 4: Commit**

```bash
git add packages/backend/Dockerfile
git commit -m "feat(deploy): add backend Dockerfile (multi-stage, arm64-compatible)"
```

---

### Task 3: Frontend nginx config + Dockerfile

**Files:**
- Create: `packages/frontend/nginx.conf`
- Create: `packages/frontend/Dockerfile`

**Interfaces:**
- Produces: Docker image serving static files on port 80; proxies `/api/*` → `http://backend:3001/api/v1/*`
- The path rewrite mirrors `vite.config.ts`: `path.replace(/^\/api/, '/api/v1')` — i.e. `/api/tasks` → `/api/v1/tasks`

- [ ] **Step 1: Create `packages/frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        rewrite ^/api/(.*)$ /api/v1/$1 break;
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

- [ ] **Step 2: Create `packages/frontend/Dockerfile`**

```dockerfile
# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
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
```

- [ ] **Step 3: Build the image locally**

```bash
docker build -f packages/frontend/Dockerfile -t personal-care-frontend:test .
```

Expected: exits 0, Vite build output visible in logs.

- [ ] **Step 4: Confirm the nginx config and static files are in the image**

```bash
docker run --rm personal-care-frontend:test ls /usr/share/nginx/html
```

Expected: lists `index.html` and hashed asset files.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/nginx.conf packages/frontend/Dockerfile
git commit -m "feat(deploy): add frontend Dockerfile and nginx config for production"
```

---

### Task 4: Production compose file + env template

**Files:**
- Create: `docker-compose.prod.yml`
- Create: `.env.prod.example`

**Interfaces:**
- Consumes: images `ghcr.io/${GITHUB_OWNER}/personal-care-backend:latest` and `ghcr.io/${GITHUB_OWNER}/personal-care-frontend:latest`
- Produces: running stack of 5 containers; frontend reachable on `http://<pi-ip>:80`

- [ ] **Step 1: Create `docker-compose.prod.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: personal_care
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - personal-care-net
    labels:
      com.centurylinklabs.watchtower.enable: "false"
    restart: unless-stopped

  meilisearch:
    image: getmeili/meilisearch:latest
    environment:
      MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
    volumes:
      - meilisearch_data:/meili_data
    networks:
      - personal-care-net
    labels:
      com.centurylinklabs.watchtower.enable: "false"
    restart: unless-stopped

  backend:
    image: ghcr.io/${GITHUB_OWNER}/personal-care-backend:latest
    env_file: .env.prod
    depends_on:
      - postgres
      - meilisearch
    networks:
      - personal-care-net
    labels:
      com.centurylinklabs.watchtower.enable: "true"
    restart: unless-stopped

  frontend:
    image: ghcr.io/${GITHUB_OWNER}/personal-care-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - personal-care-net
    labels:
      com.centurylinklabs.watchtower.enable: "true"
    restart: unless-stopped

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /root/.docker/config.json:/config.json:ro
    command: --interval 300 --label-enable --cleanup
    networks:
      - personal-care-net
    restart: unless-stopped

networks:
  personal-care-net:

volumes:
  postgres_data:
  meilisearch_data:
```

- [ ] **Step 2: Create `.env.prod.example`**

```bash
# Copy this to .env.prod on the Pi and fill in real values.
# NEVER commit .env.prod to git.

# ── Pi-specific ────────────────────────────────────────────────────────────────
GITHUB_OWNER=your-github-username
CORS_ORIGIN=http://192.168.1.100      # set to your Pi's LAN IP

# ── Secrets (use strong random values in production) ──────────────────────────
POSTGRES_PASSWORD=change_me_strong_password
# MEILISEARCH_MASTER_KEY is used by the Meilisearch container (MEILI_MASTER_KEY)
# MEILISEARCH_API_KEY must be the same value — used by the backend
MEILISEARCH_MASTER_KEY=change_me_strong_key
MEILISEARCH_API_KEY=change_me_strong_key

# ── Backend env vars (read by the backend container via env_file) ──────────────
DATABASE_URL=postgres://postgres:change_me_strong_password@postgres:5432/personal_care
MEILISEARCH_URL=http://meilisearch:7700
PORT=3001
NODE_ENV=production
```

- [ ] **Step 3: Add `.env.prod` to `.gitignore`**

Open `.gitignore` (create it at the root if it doesn't exist) and ensure this line is present:

```
.env.prod
```

- [ ] **Step 4: Validate the compose file syntax**

```bash
docker compose -f docker-compose.prod.yml config
```

Expected: YAML output with all five services and `${GITHUB_OWNER}` shown as-is (unsubstituted, because no `.env.prod` is present locally — that is correct).

- [ ] **Step 5: Commit**

```bash
git add docker-compose.prod.yml .env.prod.example .gitignore
git commit -m "feat(deploy): add production compose file and env template"
```

---

### Task 5: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `packages/backend/Dockerfile` and `packages/frontend/Dockerfile`
- Produces: `ghcr.io/<owner>/personal-care-backend:latest` and `ghcr.io/<owner>/personal-care-frontend:latest` images on every push to `main`

- [ ] **Step 1: Create the directory and workflow file**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/backend/Dockerfile
          platforms: linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/personal-care-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/frontend/Dockerfile
          platforms: linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/personal-care-frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Commit and push to trigger the workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(deploy): add GitHub Actions workflow to build and push ARM64 images to GHCR"
git push origin main
```

- [ ] **Step 3: Verify the workflow succeeds**

Open GitHub → your repo → Actions tab. The `Build and Push Docker Images` workflow should appear. Wait for it to complete (~10–15 min first run due to QEMU ARM64 emulation; subsequent runs are faster via GHA cache).

Expected: both jobs green. Check GitHub → Packages (on your profile) — you should see `personal-care-backend` and `personal-care-frontend` listed.

- [ ] **Step 4: Make GHCR packages public (so Pi can pull without a PAT)**

In GitHub: go to your profile → Packages → `personal-care-backend` → Package settings → Change visibility → Public. Repeat for `personal-care-frontend`.

> **Alternative:** Keep packages private and authenticate on the Pi with a PAT (`read:packages` scope). See Task 6 Step 3.

---

### Task 6: Pi one-time setup

**Files:** None — operational steps run over SSH on the Pi.

**Interfaces:**
- Consumes: GHCR images from Task 5, `docker-compose.prod.yml` from Task 4
- Produces: running app at `http://<pi-ip>` on the home LAN

- [ ] **Step 1: SSH into the Pi and install Docker Engine**

```bash
# On the Pi (not your Windows machine):
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

Expected: Docker version printed (e.g. `Docker version 27.x.x`).

- [ ] **Step 2: (Skip if packages are public) Authenticate to GHCR**

Create a GitHub Personal Access Token with `read:packages` scope at https://github.com/settings/tokens.

```bash
echo "<your-pat>" | docker login ghcr.io -u <your-github-username> --password-stdin
```

Expected: `Login Succeeded`.

- [ ] **Step 3: Copy `docker-compose.prod.yml` to the Pi**

From your Windows machine (Git Bash or PowerShell):

```bash
scp docker-compose.prod.yml pi@<pi-ip>:~/personal-care/
```

Or create the directory and file directly on the Pi:

```bash
mkdir -p ~/personal-care
nano ~/personal-care/docker-compose.prod.yml   # paste the file contents
```

- [ ] **Step 4: Create `.env.prod` on the Pi**

```bash
nano ~/personal-care/.env.prod
```

Fill in all values from `.env.prod.example`. Set `CORS_ORIGIN` to the Pi's actual LAN IP (find it with `hostname -I`). Set `GITHUB_OWNER` to your GitHub username. Use strong random values for `POSTGRES_PASSWORD` and `MEILISEARCH_MASTER_KEY`/`MEILISEARCH_API_KEY` (same value for both Meilisearch vars).

- [ ] **Step 5: Start the stack**

```bash
cd ~/personal-care
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Expected: Docker pulls all five images and starts the containers. `docker ps` should show all five running.

- [ ] **Step 6: Verify the app is reachable**

From any device on the home network open: `http://<pi-ip>`

Expected: the personal-care React app loads. Check the `/health` endpoint: `curl http://<pi-ip>/api/health` → `{"ok":true,...}`.

> **Note:** From now on, push to `main` → GitHub Actions builds new images → Watchtower detects the new image digest within 5 minutes and automatically redeploys `backend` and `frontend`. Postgres and Meilisearch data is preserved.

---

## Self-Review

**Spec coverage:**
- ✅ ARM64 images — `platforms: linux/arm64` in GH Actions
- ✅ Watchtower excludes Postgres + Meilisearch — `watchtower.enable: "false"` labels
- ✅ nginx proxy rewrite — `rewrite ^/api/(.*)$ /api/v1/$1 break`
- ✅ Secrets only on Pi — `.env.prod.example` + `.gitignore` entry
- ✅ GHCR via automatic `GITHUB_TOKEN` — no extra secrets in GH Actions
- ✅ GHA cache — `cache-from/cache-to: type=gha` in both build steps
- ✅ `@rollup/rollup-linux-x64-gnu` — optional dep, skipped by npm on ARM64; noted in Dockerfile comment

**Type/name consistency:**
- `MEILISEARCH_API_KEY` (backend env var) vs `MEILI_MASTER_KEY` (Meilisearch service env var) — both documented in `.env.prod.example` with explicit note that they must be equal
- `${POSTGRES_PASSWORD}`, `${MEILI_MASTER_KEY}`, `${GITHUB_OWNER}` — used consistently in compose and example file
