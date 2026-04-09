/**
 * Dummy App 3 — Plain-Text Logger
 * Writes human-readable plain-text log lines.
 * Format: YYYY-MM-DD HH:MM:SS.mmm [LEVEL] (appname) message
 */

const fs   = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/text-app.log';

const LEVELS   = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
const MESSAGES = {
  DEBUG: ['Loading configuration from /etc/app/config.json', 'GC cycle completed in 4ms',
          'Worker thread idle, waiting for task'],
  INFO:  ['Server started on port 8080', 'Connected to database at db:5432',
          'Processed 42 items from queue', 'Health check passed',
          'User session created: sess_a3f2', 'Cache warmed: 1200 entries loaded'],
  WARN:  ['Disk usage at 81%, consider cleanup', 'Connection pool at 90% capacity',
          'Response time degraded: 890ms', 'Deprecated API endpoint called: /v1/users'],
  ERROR: ['Failed to connect to Redis after 3 retries', 'Uncaught exception: NullPointerException',
          'File not found: /var/data/config.json', 'Out of memory: heap allocation failed'],
};

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function timestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').slice(0, 23);
}

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function writeLog() {
  const level   = randomChoice(LEVELS);
  const message = randomChoice(MESSAGES[level]);
  const line    = `${timestamp()} [${level.padEnd(5)}] (text-app) ${message}`;

  stream.write(line + '\n');
  process.stdout.write(line + '\n');

  setTimeout(writeLog, 400 + Math.random() * 700);
}

console.log(`[text-app] starting — writing to ${LOG_FILE}`);
writeLog();
