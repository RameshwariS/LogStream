'use strict';
/**
 * server.js — LogStream backend
 * Express HTTP server + Socket.io for real-time log broadcasting.
 *
 * Routes:
 *   GET  /health              — liveness probe
 *   GET  /api/logs            — query historical logs (Loki range query)
 *   GET  /api/logs/download   — download filtered logs as a .log file
 *
 * Socket.io events (server → client):
 *   new-log        { id, timestamp, level, message, app, raw }
 *   tail-error     { message }
 *
 * Socket.io events (client → server):
 *   set-filter     { app, level, keyword }  — server stores per-socket filter
 */

require('dotenv').config();

const http       = require('http');
const express    = require('express');
const cors       = require('cors');
const { Server } = require('socket.io');
const { queryLogs, setupTail } = require('./services/lokiService');

const PORT = process.env.PORT || 4000;

// ── App setup ─────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

/**
 * GET /api/logs
 * Query params: app, level, keyword, limit (default 200)
 */
app.get('/api/logs', async (req, res) => {
  try {
    const { app: appFilter = '', level = '', keyword = '', limit = '200' } = req.query;
    const logs = await queryLogs({ app: appFilter, level, keyword, limit: parseInt(limit, 10) });
    res.json({ count: logs.length, logs });
  } catch (err) {
    console.error('[api/logs] error:', err.message);
    res.status(500).json({ error: 'Failed to query logs', detail: err.message });
  }
});

/**
 * GET /api/logs/download
 * Same filters as /api/logs; returns a downloadable .log text file.
 */
app.get('/api/logs/download', async (req, res) => {
  try {
    const { app: appFilter = '', level = '', keyword = '', limit = '1000' } = req.query;
    const logs = await queryLogs({ app: appFilter, level, keyword, limit: parseInt(limit, 10) });

    const content = logs
      .map(l => `${l.timestamp}  ${l.level.padEnd(5)}  [${l.app}]  ${l.message}`)
      .join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="logstream-export.log"');
    res.send(content || '# No logs matched the current filter\n');
  } catch (err) {
    console.error('[api/logs/download] error:', err.message);
    res.status(500).json({ error: 'Failed to export logs', detail: err.message });
  }
});

// ── Socket.io ─────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Default: no filter — receive all logs
  socket.logFilter = { app: '', level: '', keyword: '' };

  // Client sends its current filter state
  socket.on('set-filter', (filter) => {
    socket.logFilter = {
      app:     (filter.app     || '').toLowerCase(),
      level:   (filter.level   || '').toUpperCase(),
      keyword: (filter.keyword || '').toLowerCase(),
    };
    socket.emit('filter-applied', socket.logFilter);
    console.log(`[socket] ${socket.id} set filter:`, socket.logFilter);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

/**
 * Returns true if a log entry passes a given socket's filter.
 */
function matchesFilter(entry, filter) {
  if (filter.app     && entry.app.toLowerCase()   !== filter.app)     return false;
  if (filter.level   && entry.level.toUpperCase() !== filter.level)   return false;
  if (filter.keyword && !entry.message.toLowerCase().includes(filter.keyword)) return false;
  return true;
}

// ── Loki tail ────────────────────────────────────────────────────────────────

function startTail() {
  setupTail((entry) => {
    // Fan out to all connected clients, respecting per-socket filters
    for (const [, socket] of io.sockets.sockets) {
      if (matchesFilter(entry, socket.logFilter)) {
        socket.emit('new-log', entry);
      }
    }
  });
}

// ── Start server ──────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[server] LogStream backend running on http://localhost:${PORT}`);
  console.log(`[server] Loki endpoint: ${process.env.LOKI_URL || 'http://loki:3100'}`);

  // Small delay to let Loki finish starting up in Docker
  setTimeout(startTail, 3000);
});
