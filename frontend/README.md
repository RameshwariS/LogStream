# LogStream — Frontend

React + Tailwind real-time log viewer. Connects to the backend SSE stream.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Opens on `http://localhost:3000`. The Vite dev server proxies `/api` and `/stream` to `localhost:8080`.

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Root — auth gate, renders LogViewer |
| `src/components/LogViewer.jsx` | Main log display with filter state |
| `src/components/LogRow.jsx` | Single log line with level coloring |
| `src/components/FilterBar.jsx` | Level pills, service selector, keyword search |
| `src/components/StatusBar.jsx` | Connection indicator |
| `src/hooks/useLogStream.js` | SSE connection + log buffer management |
| `src/utils/api.js` | REST helpers (login, fetchLogs, ingestLog) |

## TODO (Person 1)

- [ ] Replace token-paste login gate with a real login form calling `POST /api/auth/login`
- [ ] Add metadata expansion (click a row to see key-value pairs)
- [ ] Add log count badges per level in FilterBar
- [ ] Add dark/light mode toggle
- [ ] Write Vitest tests for FilterBar and LogRow
- [ ] Handle EventSource token — move to cookie or query param based on backend support
