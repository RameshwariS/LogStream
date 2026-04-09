'use strict';
/**
 * lokiService.js
 * Handles all communication with Grafana Loki:
 *   - queryLogs()  : fetch historical logs (range query)
 *   - queryServices(): get distinct app names
 *   - setupTail()  : real-time WebSocket tail
 */

require('dotenv').config();
const axios     = require('axios');
const WebSocket = require('ws');

const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';

// ── Build LogQL query string ──────────────────────────────────────────────────
function buildQuery(app = '', level = '', keyword = '') {
  let selector = `{job="logstream"`;
  if (app)   selector += `,app="${app}"`;
  if (level && level !== 'ALL') selector += `,level="${level.toUpperCase()}"`;
  selector += '}';
  if (keyword) selector += ` |= \`${keyword}\``;
  return selector;
}

// ── Parse Loki stream result → flat LogEntry array ───────────────────────────
function parseLokiResult(streams) {
  const entries = [];
  for (const stream of (streams || [])) {
    const { app = 'unknown', level = 'INFO' } = stream.stream || {};
    for (const [nsTs, rawLine] of (stream.values || [])) {
      const tsMs = Math.floor(Number(nsTs) / 1e6);
      const timestamp = new Date(tsMs).toISOString();

      let message    = rawLine;
      let parsedLevel = level;

      try {
        const parsed = JSON.parse(rawLine);
        message      = parsed.message || parsed.msg || rawLine;
        parsedLevel  = parsed.level   || level;
      } catch { /* not JSON — use raw */ }

      entries.push({
        id:        `${nsTs}-${Math.random().toString(36).slice(2,7)}`,
        timestamp,
        level:     parsedLevel.toUpperCase(),
        message,
        app,
        raw:       rawLine,
      });
    }
  }
  return entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// ── queryLogs ────────────────────────────────────────────────────────────────
async function queryLogs({ app = '', level = '', keyword = '', limit = 200 } = {}) {
  const query  = buildQuery(app, level, keyword);
  const now    = Date.now();
  const start  = now - 60 * 60 * 1000; // last hour

  try {
    const res = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
      params: {
        query,
        limit,
        start:     `${start}000000`,
        end:       `${now}000000`,
        direction: 'backward',
      },
      timeout: 8000,
    });
    const result = res.data?.data?.result || [];
    const entries = parseLokiResult(result);
    return entries.slice(-limit);
  } catch (err) {
    console.error('[lokiService.queryLogs] error:', err.message);
    return [];
  }
}

// ── queryServices ────────────────────────────────────────────────────────────
async function queryServices() {
  try {
    const res = await axios.get(`${LOKI_URL}/loki/api/v1/labels`, { timeout: 5000 });
    if (!res.data?.data?.includes('app')) return [];

    const valRes = await axios.get(`${LOKI_URL}/loki/api/v1/label/app/values`, { timeout: 5000 });
    return valRes.data?.data || [];
  } catch (err) {
    console.error('[lokiService.queryServices] error:', err.message);
    return [];
  }
}

// ── setupTail ────────────────────────────────────────────────────────────────
function setupTail(onLog, reconnectDelay = 3000) {
  let ws      = null;
  let stopped = false;

  function connect() {
    if (stopped) return;

    const query  = buildQuery();
    const wsBase = LOKI_URL.replace(/^http/, 'ws');
    const url    = `${wsBase}/loki/api/v1/tail?query=${encodeURIComponent(query)}`;

    console.log('[lokiService] opening tail:', url);
    ws = new WebSocket(url);

    ws.on('open',  () => console.log('[lokiService] tail connected'));

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        const streams = payload.streams || [];
        for (const entry of parseLokiResult(streams)) {
          onLog(entry);
        }
      } catch (err) {
        console.error('[lokiService] tail parse error:', err.message);
      }
    });

    ws.on('close', (code) => {
      console.log(`[lokiService] tail closed (${code}), reconnecting in ${reconnectDelay}ms`);
      if (!stopped) setTimeout(connect, reconnectDelay);
    });

    ws.on('error', (err) => {
      console.error('[lokiService] tail error:', err.message);
      ws.terminate();
    });
  }

  connect();
  return { close() { stopped = true; if (ws) ws.terminate(); } };
}

module.exports = { queryLogs, queryServices, setupTail };
