/**
 * Auth Service - JSON Logger
 * Simulates authentication and authorization events.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/auth-service.log';
const APP_ID   = 'auth-service';

const LEVELS    = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
const MESSAGES  = {
  DEBUG: ['Password hash validation started', 'JWT check skip for public route', 'Refresh token rotated', 'Session cache hit'],
  INFO:  ['User login successful', 'Logout processed', 'MFA challenge issued', 'Password reset email sent', 'Role granted to user', 'New user registered'],
  WARN:  ['Failed login attempt - invalid password', 'Account locked (temporary)', 'Expired JWT used', 'Multiple login attempts from new IP'],
  ERROR: ['Database connection failed during auth', 'Bcrypt salt generation error', 'Key rotation failed', 'Authorization service timed out'],
};

// Ensure log directory exists
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function writeLog() {
  const level   = randomChoice(LEVELS);
  const message = randomChoice(MESSAGES[level]);

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service:  APP_ID,
    userId:   `user_${Math.floor(Math.random() * 1000)}`,
    traceId:  Math.random().toString(36).slice(2, 10),
    metadata: {
      pid:     process.pid,
      region:  'us-east-1',
    },
  };

  const line = JSON.stringify(entry);
  stream.write(line + '\n');
  process.stdout.write(`[auth-service] ${line}\n`);

  // Schedule next log
  setTimeout(writeLog, 500 + Math.random() * 1500);
}

console.log(`[auth-service] starting — writing to ${LOG_FILE}`);
writeLog();
