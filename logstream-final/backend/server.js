'use strict';
/**
 * LogStream Backend — server.js
 * Express HTTP + Socket.io real-time log broadcasting server.
 *
 * REST Routes:
 *   GET /health                — liveness probe
 *   GET /api/logs              — query history (?app&level&keyword&limit)
 *   GET /api/logs/download     — export filtered logs as .log file
 *   GET /api/services          — list known app names from Loki labels
 *
 * Socket.io Events:
 *   Server→Client:  new-log    { id, timestamp, level, message, app, raw }
 *   Server→Client:  tail-status { connected: bool }
 *   Client→Server:  set-filter  { app, level, keyword }
 *   Server→Client:  filter-ack  { app, level, keyword }
 */

require('dotenv').config();

const http                         = require('http');
const express                      = require('express');
const cors                         = require('cors');
const { Server: SocketIOServer }   = require('socket.io');
const { queryLogs, queryServices, setupTail } = require('./services/lokiService');

const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Express + Socket.io ───────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
});

app.use(cors());
app.use(express.json());

// ── REST: Health ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    uptime:  Math.round(process.uptime()),
    time:    new Date().toISOString(),
    clients: io.sockets.sockets.size,
  });
});

// ── REST: Query logs ──────────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  try {
    const { app: appQ = '', level = '', keyword = '', limit = '200' } = req.query;
    const logs = await queryLogs({ app: appQ, level, keyword, limit: parseInt(limit, 10) });
    res.json({ count: logs.length, logs });
  } catch (err) {
    console.error('[GET /api/logs]', err.message);
    res.status(500).json({ error: 'Failed to query logs', detail: err.message });
  }
});

// ── REST: Download logs ───────────────────────────────────────────────────────
app.get('/api/logs/download', async (req, res) => {
  try {
    const { app: appQ = '', level = '', keyword = '', limit = '1000' } = req.query;
    const logs = await queryLogs({ app: appQ, level, keyword, limit: parseInt(limit, 10) });

    const lines = logs.map(l =>
      `${l.timestamp}  ${l.level.padEnd(5)}  [${l.app}]  ${l.message}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="logstream-export.log"');
    res.send(lines || '# No logs matched the current filter\n');
  } catch (err) {
    console.error('[GET /api/logs/download]', err.message);
    res.status(500).json({ error: 'Export failed', detail: err.message });
  }
});

// ── REST: Services ────────────────────────────────────────────────────────────
app.get('/api/services', async (_req, res) => {
  try {
    const services = await queryServices();
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list services', detail: err.message });
  }
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
function matchesFilter(entry, filter) {
  if (filter.app     && entry.app.toLowerCase()              !== filter.app.toLowerCase())   return false;
  if (filter.level   && filter.level !== 'ALL'
                     && entry.level.toUpperCase()            !== filter.level.toUpperCase()) return false;
  if (filter.keyword && !entry.message.toLowerCase().includes(filter.keyword.toLowerCase())) return false;
  return true;
}

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id} (total: ${io.sockets.sockets.size})`);
  socket.logFilter = { app: '', level: 'ALL', keyword: '' };

  socket.on('set-filter', (filter = {}) => {
    socket.logFilter = {
      app:     String(filter.app     || ''),
      level:   String(filter.level   || 'ALL'),
      keyword: String(filter.keyword || ''),
    };
    socket.emit('filter-ack', socket.logFilter);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

// ── Loki tail — fan-out to all matching clients ───────────────────────────────
let tailHandle = null;

function startLokiTail() {
  if (tailHandle) tailHandle.close();

  tailHandle = setupTail((entry) => {
    io.sockets.sockets.forEach((socket) => {
      if (matchesFilter(entry, socket.logFilter)) {
        socket.emit('new-log', entry);
      }
    });
  });

  io.emit('tail-status', { connected: true });
}

// ── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] LogStream backend on http://localhost:${PORT}`);
  console.log(`[server] Loki: ${process.env.LOKI_URL || 'http://loki:3100'}`);

  // Give Loki 5s to fully start before opening the tail
  setTimeout(startLokiTail, 5000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down...');
  if (tailHandle) tailHandle.close();
  server.close(() => process.exit(0));
});
