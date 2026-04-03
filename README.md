# LogStream

> Real-time log aggregation and streaming system built in Go.

## What it does

LogStream collects logs from multiple services via HTTP, processes them concurrently using goroutines and channels, and streams them to connected clients in real time via SSE.

```
[Service A] ──┐
[Service B] ──┼─► POST /api/logs ──► Go Channel ──► Broadcaster ──► SSE /stream ──► Browser UI
[Service C] ──┘
```

## Repo Structure

```
logstream/
├── backend/          # Go HTTP server (Person 2)
├── frontend/         # React log viewer (Person 1)
├── devops/           # Scripts, monitoring configs (Person 3)
├── .github/
│   └── workflows/    # CI (ci.yml) + CD (cd.yml)
├── docker-compose.yml
└── docker-compose.override.yml
```

## Quick Start

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Then open http://localhost:3000 and send a test log:

```bash
curl -X POST http://localhost:8080/api/logs \
  -H "X-API-Key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"service":"my-service","level":"INFO","message":"Hello LogStream!"}'
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Go 1.22, net/http, goroutines, channels |
| Frontend | React 18, Tailwind CSS, Vite, SSE (EventSource) |
| Auth | JWT (golang-jwt) + API key |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions → GHCR |

## Contributing

- Open a PR against `dev`, not `main`
- CI must be green before merge
- Each engineer works in their own sub-directory

## License

MIT
