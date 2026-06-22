# Raspberry Pi 5 Production Deployment

Automated deployment to a Raspberry Pi 5 on the home LAN via GitHub Actions + Watchtower.

## How It Works

```
git push origin master
        │
        ▼
GitHub Actions builds ARM64 Docker images → pushes to GHCR
        │
        ▼ (Watchtower polls every 5 min)
Raspberry Pi auto-redeploys backend + frontend
```

Access the app at `http://<pi-lan-ip>` from any device on the home network.

---

## One-Time Pi Setup

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in so group membership takes effect
```

### 2. Authenticate with GHCR (skip if packages are public)

Create a GitHub PAT with `read:packages` scope, then:

```bash
docker login ghcr.io -u <your-github-username>
# Paste PAT when prompted
```

### 3. Create the app directory

```bash
mkdir ~/personal-care && cd ~/personal-care
```

### 4. Create `docker-compose.prod.yml`

```bash
cat > ~/personal-care/docker-compose.prod.yml << 'EOF'
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d personal_care"]
      interval: 5s
      timeout: 5s
      retries: 10

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
      postgres:
        condition: service_healthy
      meilisearch:
        condition: service_started
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
EOF
```

### 5. Create `.env` (Compose-level secrets)

```bash
nano ~/personal-care/.env
```

```
GITHUB_OWNER=your-github-username
POSTGRES_PASSWORD=choose-a-strong-password
MEILISEARCH_MASTER_KEY=choose-a-strong-key
```

> **Note:** This file is auto-loaded by Docker Compose. Never commit it to git.

### 6. Create `.env.prod` (backend runtime config)

```bash
nano ~/personal-care/.env.prod
```

```
DATABASE_URL=postgres://postgres:<POSTGRES_PASSWORD>@postgres:5432/personal_care
MEILISEARCH_URL=http://meilisearch:7700
MEILISEARCH_API_KEY=<MEILISEARCH_MASTER_KEY>
CORS_ORIGIN=http://<pi-lan-ip>
PORT=3001
NODE_ENV=production
```

Replace `<POSTGRES_PASSWORD>` and `<MEILISEARCH_MASTER_KEY>` with the exact values from `.env`.  
Replace `<pi-lan-ip>` with your Pi's LAN IP (`hostname -I` to find it).

> **Warning:** `POSTGRES_PASSWORD` in `.env` and the password in `DATABASE_URL` in `.env.prod` **must match exactly**. If they differ the backend will fail to start.  
> **Warning:** Never commit `.env.prod` to git.

### 7. Start the stack

Wait for the GitHub Actions build to finish (green checkmark at `github.com/<owner>/personal-care/actions`), then:

```bash
cd ~/personal-care
docker compose -f docker-compose.prod.yml up -d
```

### 8. Verify

```bash
docker compose -f docker-compose.prod.yml ps
```

All 5 services should show `running`. Open `http://<pi-lan-ip>` in a browser.

---

## Day-to-Day Operations

### Deploy a new version

Just push to `master` — GitHub Actions builds the images and Watchtower redeploys automatically within 5 minutes.

### View logs

```bash
cd ~/personal-care
docker compose -f docker-compose.prod.yml logs backend --tail=50
docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

### Restart a service manually

```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Stop everything

```bash
docker compose -f docker-compose.prod.yml down
```

### Stop and wipe all data (destructive)

```bash
docker compose -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

### 502 Bad Gateway
The frontend is up but the backend isn't responding. Check backend logs:
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50
```

### Password authentication failed for user "postgres"
The password in `DATABASE_URL` (`.env.prod`) doesn't match `POSTGRES_PASSWORD` (`.env`).

Fix both files so the passwords match, then wipe the Postgres volume and restart:
```bash
docker compose -f docker-compose.prod.yml down
docker volume rm personal-care_postgres_data
docker compose -f docker-compose.prod.yml up -d
```

> If you change `POSTGRES_PASSWORD` after first run you **must** wipe the volume — Postgres only reads `POSTGRES_PASSWORD` on first initialisation.

### Backend crashes on startup (env file issue)
`restart` does not re-read `env_file`. Use `--force-recreate` instead:
```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

### Watchtower not pulling new images
Check Watchtower logs:
```bash
docker compose -f docker-compose.prod.yml logs watchtower --tail=30
```
If GHCR packages are private, ensure `/root/.docker/config.json` exists on the Pi (created by `docker login ghcr.io`).

---

## Files Reference

| File | Location | Purpose |
|---|---|---|
| `docker-compose.prod.yml` | Pi: `~/personal-care/` | Defines all 5 services |
| `.env` | Pi: `~/personal-care/` | Compose-level secrets (never committed) |
| `.env.prod` | Pi: `~/personal-care/` | Backend runtime config (never committed) |
| `.env.example` | Repo root | Template for `.env` |
| `.env.prod.example` | Repo root | Template for `.env.prod` |
| `.github/workflows/deploy.yml` | Repo | Builds ARM64 images on push to `master` |
