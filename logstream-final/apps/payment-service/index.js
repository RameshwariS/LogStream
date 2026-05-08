/**
 * Payment Service - JSON Logger
 * Simulates payment processing and gateway interactions.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/payment-service.log';
const APP_ID   = 'payment-service';

const LEVELS    = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
const MESSAGES  = {
  DEBUG: ['Stripe API connection pooled', 'Payment intent status polling', 'Webhooks signature verified', 'Idempotency key checked'],
  INFO:  ['Transaction initiated', 'Payment captured', 'Refund processed', 'Subscription created', 'Payout scheduled', 'Card verification succeeded'],
  WARN:  ['Insufficient funds', 'Card expiring soon', 'Soft decline from gateway', 'Late payment reminder sent'],
  ERROR: ['Payment gateway unreachable', 'Invalid bank accounting details', 'Transaction timeout', 'Fraud detection triggered lockout'],
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
    service:   APP_ID,
    amount:    (Math.random() * 500).toFixed(2),
    currency:  'USD',
    traceId:   Math.random().toString(36).slice(2, 10),
    metadata: {
      pid:      process.pid,
      gateway: 'stripe',
    },
  };

  const line = JSON.stringify(entry);
  stream.write(line + '\n');
  process.stdout.write(`[payment-service] ${line}\n`);

  // Schedule next log
  setTimeout(writeLog, 1000 + Math.random() * 3000);
}

console.log(`[payment-service] starting — writing to ${LOG_FILE}`);
writeLog();
