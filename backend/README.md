# LogStream — Backend

Go HTTP server handling log ingestion, concurrent processing, and SSE streaming.

## Quick Start

```bash
cp .env.example .env
go mod tidy
go run ./cmd/server
```

Server runs on `http://localhost:8080`.

## Key Files

| File | Purpose |
|------|---------|
| `cmd/server/main.go` | Entry point, route wiring |
| `config/config.go` | Env-based config loader |
| `internal/models/log.go` | LogEntry struct + validation |
| `internal/broadcaster/broadcaster.go` | Fan-out goroutine + client registry |
| `internal/handlers/handlers.go` | HTTP handlers (ingest, SSE, query, auth) |
| `internal/middleware/middleware.go` | JWT, API key, CORS middleware |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/logs` | X-API-Key header | Ingest a log entry |
| GET | `/stream` | Bearer JWT | SSE real-time stream |
| GET | `/api/logs` | Bearer JWT | Query recent logs |
| POST | `/api/auth/login` | None | Get JWT token |
| GET | `/health` | None | Health check |

## Example: Send a log

```bash
curl -X POST http://localhost:8080/api/logs \
  -H "X-API-Key: dev-api-key" \
  -H "Content-Type: application/json" \
  -d '{"service":"auth","level":"ERROR","message":"JWT validation failed"}'
```

## TODO (Person 2)

- [ ] Add `go.sum` after `go mod tidy`
- [ ] Replace hardcoded admin/password in Login handler with real user store
- [ ] Add rate limiting middleware (`golang.org/x/time/rate`)
- [ ] Add WebSocket `/ws` endpoint
- [ ] Write unit tests for handlers and broadcaster
- [ ] Add persistent log store (Redis / Postgres)
