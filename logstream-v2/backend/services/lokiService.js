'use strict';
/**
 * lokiService.js
 * Two responsibilities:
 *   1. queryLogs()  — fetch historical logs via Loki range query API
 *   2. setupTail()  — open a persistent WebSocket tail to receive new logs in real time
 */

require('dotenv').config();
const axios = require('axios');
const WebSocket = require('ws');

const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a LogQL label selector from filter options.
 * Always includes {job="logstream"} so only our logs are matched.
 */
function buildQuery(app = '', level = '', keyword = '') {
  let selector = `{job="logstream"`;
  if (app)   selector += `,app="${app}"`;
  if (level) selector += `,level="${level.toUpperCase()}"`;
  selector += '}';

  let pipeline = '';
  if (keyword) pipeline += ` |= "${keyword}"`;

  return selector + pipeline;
}

/**
 * Parse the nested Loki query_range/query response format into a flat array.
 * Loki returns: { data: { result: [ { stream: {labels}, values: [[ns_ts, line], ...] } ] } }
 */
function parseLokiResult(result) {
  const entries = [];
  for (const stream of result) {
    const { app = 'unknown', level = 'INFO' } = stream.stream || {};
    for (const [nsTimestamp, rawLine] of stream.values) {
      // Loki timestamps are nanoseconds; convert to ms for JS Date
      const timestamp = new Date(Math.floor(Number(nsTimestamp) / 1e6)).toISOString();

      let message = rawLine;
      let parsedLevel = level;

      // Try to extract message from JSON logs
      try {
        const parsed = JSON.parse(rawLine);
        message = parsed.message || parsed.msg || rawLine;
        parsedLevel = parsed.level || level;
      } catch {
        // Not JSON — use raw line as message
      }

      entries.push({
        id: `${nsTimestamp}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        level: parsedLevel.toUpperCase(),
        message,
        app,
        raw: rawLine,
      });
    }
  }
  // Sort oldest → newest
  return entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// ── queryLogs ─────────────────────────────────────────────────────────────────

/**
 * Fetch recent logs from Loki using the range query API.
 * @param {string} app     - app label filter (empty = all)
 * @param {string} level   - level label filter (empty = all)
 * @param {string} keyword - substring filter applied via LogQL |= pipeline
 * @param {number} limit   - max log lines to return (default 200)
 * @returns {Promise<Array>} flat array of log entry objects
 */
async function queryLogs({ app = '', level = '', keyword = '', limit = 200 } = {}) {
  const query = buildQuery(app, level, keyword);
  const now   = Date.now();
  const start = now - 60 * 60 * 1000; // last 1 hour

  const params = {
    query,
    limit,
    start: `${start}000000`, // nanoseconds
    end:   `${now}000000`,
    direction: 'backward',
  };

  const response = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, { params });
  const result = response.data?.data?.result || [];
  return parseLokiResult(result).slice(-limit);
}

// ── setupTail ─────────────────────────────────────────────────────────────────

/**
 * Open a persistent WebSocket connection to Loki's tail endpoint.
 * Calls onLog(entry) for every new log that arrives.
 * Auto-reconnects after reconnectDelay ms if the connection drops.
 *
 * @param {function} onLog            - callback(logEntry)
 * @param {number}   reconnectDelay   - ms to wait before reconnecting (default 2000)
 * @returns {{ close: function }}     - object with a close() method to stop the tail
 */
function setupTail(onLog, reconnectDelay = 2000) {
  let ws = null;
  let stopped = false;

  function connect() {
    if (stopped) return;

    const query      = buildQuery(); // tail all logstream logs
    const tailUrl    = `${LOKI_URL.replace('http', 'ws')}/loki/api/v1/tail?query=${encodeURIComponent(query)}`;

    console.log(`[lokiService] opening tail connection: ${tailUrl}`);
    ws = new WebSocket(tailUrl);

    ws.on('open', () => {
      console.log('[lokiService] tail connection established');
    });

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        // Loki tail message: { streams: [ { stream: {labels}, values: [[ts, line]] } ] }
        const streams = payload.streams || [];
        const entries = parseLokiResult(streams);
        for (const entry of entries) {
          onLog(entry);
        }
      } catch (err) {
        console.error('[lokiService] failed to parse tail message:', err.message);
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`[lokiService] tail closed (${code}) — reconnecting in ${reconnectDelay}ms`);
      if (!stopped) setTimeout(connect, reconnectDelay);
    });

    ws.on('error', (err) => {
      console.error('[lokiService] tail error:', err.message);
      ws.terminate();
    });
  }

  connect();

  return {
    close() {
      stopped = true;
      if (ws) ws.terminate();
    }
  };
}

module.exports = { queryLogs, setupTail };
