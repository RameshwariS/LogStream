# LogStream — Real-Time Log Monitoring Dashboard

> **Mini-Project-2 (7VSCS346)** · Department of Computer Science & Engineering  
> Walchand College of Engineering, Sangli · 2025-26

**Team:**
| Name | Roll No | Role |
|------|---------|------|
| Rameshwari Satpute | 23510007 | DevOps & Log Pipeline Engineer |
| Pooja Bhosale | 23510012 | Backend & Real-Time Systems Engineer |
| Aasiya Ankali | 23510020 | Frontend & UI Engineer |

**Guide:** Mr. A.A. Urunkar · **HOD:** Dr. A.R. Surve

---

## Architecture

```
[json-app] ──┐
[syslog-app] ┼──► Promtail ──► Grafana Loki ──► Node.js + Socket.io ──► React Dashboard
[text-app]  ──┘       (scrape)     (store)          (tail + broadcast)   (live UI)
```

Five layers, all containerized via Docker Compose:

| Layer | Technology | Port |
|-------|-----------|------|
| Log generators | Node.js (3 dummy apps) | — |
| Log scraping | Grafana Promtail 2.9 | — |
| Log storage | Grafana Loki 2.9 | 3100 |
| Backend | Node.js + Express + Socket.io | 4000 |
| Frontend | React 18 + Tailwind CSS (nginx) | 5173 |
| Dashboards | Grafana 10 (optional) | 3000 |

---

## Quick Start

```bash
# 1. Start the full stack
docker compose up --build

# 2. Open the dashboard
open http://localhost:5173

# 3. Verify everything is healthy
bash scripts/check-pipeline.sh
```

That's it. The three dummy apps start writing logs immediately, Promtail scrapes them, Loki stores them, the backend tails Loki and broadcasts via Socket.io, and the React dashboard shows them live.

---

## Local Dev (without Docker)

Run Loki + Promtail + apps in Docker, everything else natively:

```bash
# Start infrastructure only
docker compose up loki promtail json-app syslog-app text-app -d

# Terminal 1 — backend
cd backend
cp .env.example .env          # LOKI_URL=http://localhost:3100
npm install
node server.js

# Terminal 2 — frontend
cd frontend
cp .env.example .env          # VITE_BACKEND_URL=http://localhost:4000
npm install
npm run dev
```

---

## Services & Ports

| URL | Description |
|-----|-------------|
| http://localhost:5173 | React dashboard (main UI) |
| http://localhost:4000/health | Backend health check |
| http://localhost:4000/api/logs | Query logs REST API |
| http://localhost:3100/ready | Loki health check |
| http://localhost:3000 | Grafana (bonus dashboard) |

---

## REST API

| Method | Endpoint | Params | Description |
|--------|----------|--------|-------------|
| GET | `/health` | — | Server status, uptime, client count |
| GET | `/api/logs` | `app`, `level`, `keyword`, `limit` | Query log history |
| GET | `/api/logs/download` | same as above | Download as `.log` file |
| GET | `/api/services` | — | List app names from Loki labels |

## Socket.io Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Server → Client | `new-log` | `{id, timestamp, level, message, app, raw}` |
| Server → Client | `tail-status` | `{connected: bool}` |
| Client → Server | `set-filter` | `{app, level, keyword}` |
| Server → Client | `filter-ack` | `{app, level, keyword}` |

---

## Project Structure

```
logstream/
├── apps/
│   ├── json-logger/          # Dummy app 1 — JSON format logs
│   ├── syslog-logger/        # Dummy app 2 — RFC 3164 syslog logs
│   └── text-logger/          # Dummy app 3 — plain-text logs
├── config/
│   ├── loki-config.yml       # Grafana Loki configuration
│   ├── promtail-config.yml   # Promtail scrape rules + pipeline stages
│   └── grafana/
│       └── provisioning/     # Auto-provisioned Loki datasource + dashboard
├── backend/
│   ├── server.js             # Express + Socket.io entry point
│   └── services/
│       └── lokiService.js    # Loki query + WebSocket tail
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── hooks/
│       │   └── useLogSocket.js   # Socket.io client + 1000-entry buffer
│       ├── components/
│       │   ├── StatsBar.jsx      # Live severity counts + connection status
│       │   ├── FilterBar.jsx     # Level pills, app selector, search, export
│       │   ├── LogViewer.jsx     # Auto-scroll terminal list
│       │   └── LogEntry.jsx      # Color-coded log row with metadata expand
│       └── utils/
│           └── api.js            # REST helpers (fetchLogs, downloadLogs)
├── scripts/
│   ├── check-pipeline.sh     # Full stack health checker
│   └── send-test-logs.sh     # Demo log burst sender
├── docs/
│   └── infra-notes.md        # LogQL query reference for the backend dev
└── docker-compose.yml
```

---

## Useful Commands

```bash
# View logs from a specific service
docker compose logs -f backend
docker compose logs -f loki
docker compose logs -f promtail

# Check Loki directly
curl 'http://localhost:3100/loki/api/v1/query?query={job="logstream"}'
curl 'http://localhost:3100/loki/api/v1/query?query={job="logstream",level="ERROR"}'

# Query backend API
curl 'http://localhost:4000/api/logs?level=ERROR&limit=20'
curl 'http://localhost:4000/api/logs?app=json-app&keyword=timeout'

# Stop everything
docker compose down

# Stop and wipe all data volumes
docker compose down -v
```
