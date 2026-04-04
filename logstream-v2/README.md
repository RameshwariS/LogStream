# LogStream — Real-Time Log Monitoring Dashboard

> Mini-Project-2 (7VSCS346) · Walchand College of Engineering, Sangli · 2025-26

**Team:** Rameshwari Satpute (23510007) · Pooja Bhosale (23510012) · Aasiya Ankali (23510020)  
**Guide:** Mr. A.A. Urunkar · **HOD:** Dr. A.R. Surve

---

## What It Does

LogStream collects logs from multiple dummy applications, stores them in Grafana Loki,
and streams them live to a React dashboard via Node.js + Socket.io.

```
[json-app] ──┐
[syslog-app] ──┤──► Promtail ──► Loki ──► Node.js backend ──► Socket.io ──► React UI
[text-app]  ──┘                              (Express)
```

## Quick Start

```bash
# 1. Copy backend env file
cp backend/.env.example backend/.env

# 2. Start everything
docker compose up --build

# 3. Open the dashboard
open http://localhost:5173
```

Services started:
| Service     | URL                          | Description             |
|-------------|------------------------------|-------------------------|
| Frontend    | http://localhost:5173        | React dashboard         |
| Backend     | http://localhost:4000        | Node.js + Socket.io API |
| Loki        | http://localhost:3100        | Log storage             |
| json-app    | —                            | Writes JSON logs        |
| syslog-app  | —                            | Writes syslog logs      |
| text-app    | —                            | Writes plain-text logs  |

## Local Dev (without Docker)

```bash
# Terminal 1 — start Loki + Promtail + dummy apps
docker compose up loki promtail json-app syslog-app text-app

# Terminal 2 — backend
cd backend && cp .env.example .env && npm install && node server.js

# Terminal 3 — frontend
cd frontend && npm install && npm run dev
```

## Repo Structure

```
logstream/
├── apps/
│   ├── json-logger/      # Dummy app 1 — JSON format logs
│   ├── syslog-logger/    # Dummy app 2 — RFC 3164 syslog logs
│   └── text-logger/      # Dummy app 3 — Plain text logs
├── config/
│   ├── loki-config.yml   # Grafana Loki config
│   └── promtail-config.yml # Promtail scrape rules
├── backend/
│   ├── server.js         # Express + Socket.io entry point
│   ├── services/
│   │   └── lokiService.js # Loki query + tail WebSocket
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── hooks/useLogSocket.js   # Socket.io client + log buffer
│       ├── components/
│       │   ├── StatsBar.jsx        # Live severity counts
│       │   ├── FilterBar.jsx       # Level pills, app selector, search
│       │   ├── LogViewer.jsx       # Auto-scroll terminal list
│       │   └── LogEntry.jsx        # Single color-coded log line
│       └── utils/api.js            # REST helpers
├── docs/
│   └── infra-notes.md    # LogQL queries + Loki API reference
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/logs` | Query logs (`?app=&level=&keyword=&limit=`) |
| GET | `/api/logs/download` | Download filtered logs as `.log` file |

## Socket.io Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Server → Client | `new-log` | `{id, timestamp, level, message, app, raw}` |
| Client → Server | `set-filter` | `{app, level, keyword}` |
| Server → Client | `filter-applied` | `{app, level, keyword}` |
