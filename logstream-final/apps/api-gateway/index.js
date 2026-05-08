/**
 * API Gateway Service — JSON Logger
 * Simulates a real-time HTTP API gateway processing requests,
 * routing to downstream services, and tracking latency/errors.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/api-gateway.log';
const APP_ID   = 'api-gateway';

// Ensure log directory exists
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function rand(arr)          { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max)  { return Math.floor(Math.random() * (max - min + 1)) + min; }
function traceId()          { return Math.random().toString(36).slice(2, 10).toUpperCase(); }
function spanId()           { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

const METHODS   = ['GET', 'GET', 'GET', 'POST', 'POST', 'PUT', 'DELETE', 'PATCH'];
const ROUTES    = [
  { path: '/api/v1/users',            service: 'auth-service' },
  { path: '/api/v1/users/:id',        service: 'auth-service' },
  { path: '/api/v1/orders',           service: 'order-service' },
  { path: '/api/v1/orders/:id',       service: 'order-service' },
  { path: '/api/v1/payments',         service: 'payment-service' },
  { path: '/api/v1/payments/:id',     service: 'payment-service' },
  { path: '/api/v1/inventory',        service: 'inventory-service' },
  { path: '/api/v1/inventory/:id',    service: 'inventory-service' },
  { path: '/api/v1/notifications',    service: 'notification-service' },
  { path: '/api/v1/analytics/events', service: 'analytics-service' },
  { path: '/api/v1/health',           service: 'health-check' },
];

// Weighted status codes — mostly 200s, some 4xx/5xx
const STATUS_WEIGHTS = [
  { code: 200, weight: 55 }, { code: 201, weight: 15 },
  { code: 204, weight: 5  }, { code: 400, weight: 8  },
  { code: 401, weight: 5  }, { code: 403, weight: 3  },
  { code: 404, weight: 5  }, { code: 429, weight: 2  },
  { code: 500, weight: 1  }, { code: 502, weight: 1  },
];

function pickStatus() {
  const total = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of STATUS_WEIGHTS) { r -= w.weight; if (r <= 0) return w.code; }
  return 200;
}

function statusToLevel(code) {
  if (code >= 500) return 'ERROR';
  if (code >= 400) return 'WARN';
  return 'INFO';
}

const ERROR_MESSAGES = {
  400: ['Malformed request body', 'Missing required field: userId', 'Invalid query parameter: limit'],
  401: ['JWT expired or invalid', 'Bearer token missing', 'API key not found'],
  403: ['Insufficient permissions', 'IP blocked by rate-limiter', 'Resource access denied'],
  404: ['Route not found', 'Upstream service returned 404', 'Resource does not exist'],
  429: ['Rate limit exceeded — 100 req/min', 'Throttle limit hit for client IP'],
  500: ['Upstream service crashed', 'Internal routing error', 'Unexpected nil pointer in middleware'],
  502: ['Bad gateway: auth-service unreachable', 'Upstream timeout after 30s', 'Connection refused by downstream'],
};

const REGION_ZONES = ['us-east-1a', 'us-east-1b', 'eu-west-1a', 'ap-south-1a'];

function buildEntry() {
  const route   = rand(ROUTES);
  const method  = rand(METHODS);
  const status  = pickStatus();
  const level   = statusToLevel(status);
  const latency = status >= 500 ? randInt(1200, 8000) : randInt(8, 450);
  const tid     = traceId();

  const entry = {
    timestamp:    new Date().toISOString(),
    level,
    message:      `${method} ${route.path} → ${status} (${latency}ms)`,
    service:      APP_ID,
    http: {
      method,
      path:        route.path,
      status,
      latency_ms:  latency,
      upstream:    route.service,
      request_id:  tid,
    },
    trace: {
      traceId:  tid,
      spanId:   spanId(),
      parentId: Math.random() > 0.3 ? spanId() : null,
    },
    client: {
      ip:     `10.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`,
      region: rand(REGION_ZONES),
    },
    metadata: { pid: process.pid, node: 'api-gw-01' },
  };

  // Append human-readable error detail for non-2xx
  if (ERROR_MESSAGES[status]) {
    entry.error = rand(ERROR_MESSAGES[status]);
    entry.message = `${entry.message} — ${entry.error}`;
  }

  return entry;
}

function writeLog() {
  const entry = buildEntry();
  const line  = JSON.stringify(entry);
  stream.write(line + '\n');
  process.stdout.write(`[api-gateway] ${line}\n`);

  // High-traffic gateway: 200–900ms between log lines
  setTimeout(writeLog, randInt(200, 900));
}

console.log(`[api-gateway] starting — writing to ${LOG_FILE}`);
writeLog();
