/**
 * Dummy App 1 — JSON Logger
 * Writes structured JSON log lines to a file and stdout at random intervals.
 * Simulates a real microservice (auth, payment, gateway, etc.)
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/json-app.log';
const APP_ID   = 'json-app';

const SERVICES  = ['auth-service', 'payment-service', 'user-service', 'gateway'];
const LEVELS    = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
const MESSAGES  = {
  DEBUG: ['Cache lookup attempted', 'DB connection pooled', 'Config reloaded', 'Goroutine spawned'],
  INFO:  ['Request received', 'JWT validated', 'Query executed in 12ms', 'Response sent 200',
          'User logged in successfully', 'Payment processed'],
  WARN:  ['Retry attempt 2/3', 'High memory usage: 78%', 'Slow query: 340ms', 'Rate limit approaching'],
  ERROR: ['JWT validation failed — invalid signature', 'Connection pool exhausted',
          'Payment timeout after 30s', 'Database unreachable', 'Unhandled exception in handler'],
};

// Ensure log directory exists
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function writeLog() {
  const level   = randomChoice(LEVELS);
  const service = randomChoice(SERVICES);
  const message = randomChoice(MESSAGES[level]);

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service,
    appId:    APP_ID,
    traceId:  Math.random().toString(36).slice(2, 10),
    metadata: {
      pid:     process.pid,
      host:    require('os').hostname(),
    },
  };

  const line = JSON.stringify(entry);
  stream.write(line + '\n');
  process.stdout.write(line + '\n');

  // Schedule next log at random interval 200-800ms
  setTimeout(writeLog, 200 + Math.random() * 600);
}

console.log(`[json-app] starting — writing to ${LOG_FILE}`);
writeLog();
