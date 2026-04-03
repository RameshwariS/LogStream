# LogStream — DevOps

Infrastructure, containerization, and CI/CD for LogStream.

## Quick Start (full stack)

```bash
# Copy env files
cp backend/.env.example backend/.env

# Build and start everything
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Health check: http://localhost:8080/health

## Local Dev (without Docker)

```bash
# Terminal 1 — backend
cd backend && go run ./cmd/server

# Terminal 2 — frontend
cd frontend && npm install && npm run dev

# Terminal 3 — send test logs
bash devops/scripts/send_test_logs.sh
```

## File Overview

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production Compose definition |
| `docker-compose.override.yml` | Local dev overrides (auto-applied) |
| `backend/Dockerfile` | Multi-stage Go build |
| `frontend/Dockerfile` | Node build → nginx runtime |
| `.github/workflows/ci.yml` | Lint, test, Docker build on every PR |
| `.github/workflows/cd.yml` | Publish images to GHCR on version tags |
| `devops/scripts/send_test_logs.sh` | Hammers the ingest endpoint with sample logs |
| `devops/monitoring/prometheus.yml` | Prometheus scrape config |

## Releasing

```bash
git tag v1.0.0
git push origin v1.0.0
# CD workflow builds and pushes images to GHCR automatically
```

## TODO (Person 3)

- [ ] Add resource limits (`mem_limit`, `cpus`) to docker-compose.yml
- [ ] Configure TLS (certbot / Caddy reverse proxy)
- [ ] Add Grafana service to Compose + import dashboard JSON
- [ ] Write k6 load test script in `devops/scripts/load_test.js`
- [ ] Add Dependabot config for Go and npm dependency updates
- [ ] Set up staging environment (separate Compose file or K8s manifests)
