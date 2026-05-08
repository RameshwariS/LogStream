/**
 * Order Service - Plain-text Logger
 * Simulates order lifecycle events.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/order-service.log';
const APP_ID   = 'order-service';

const LEVELS    = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
const MESSAGES  = {
  DEBUG: ['Order object validated', 'Tax calculation engine initialized', 'Inventory pre-check passed', 'Cart items verified'],
  INFO:  ['New order created #ORD-9912', 'Order status changed: PENDING -> PAID', 'Order status changed: PAID -> SHIPPED', 'Order status changed: SHIPPED -> DELIVERED', 'Email confirmation sent', 'Order canceled by user'],
  WARN:  ['Order delayed due to high volume', 'Promotion code limit reached', 'Suspected duplicate order', 'Address validation returned minor correction'],
  ERROR: ['Failed to persist order to database', 'Order processing timed out', 'Critical error in tax calculation', 'Payment verification failed for confirmed order'],
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
  const timestamp = new Date().toISOString();

  const line = `${timestamp} [${level}] ${APP_ID}: ${message}`;
  
  stream.write(line + '\n');
  process.stdout.write(line + '\n');

  // Schedule next log
  setTimeout(writeLog, 800 + Math.random() * 2000);
}

console.log(`[order-service] starting — writing to ${LOG_FILE}`);
writeLog();
