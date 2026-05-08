/**
 * Inventory Service - Syslog style Logger
 * Simulates stock and inventory management events.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/inventory-service.log';
const APP_ID   = 'inventory-service';

const LEVELS    = ['DEBUG', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
const MESSAGES  = {
  DEBUG: ['Stock level cache refresh started', 'Warehouse barcode scanner connected', 'Reorder point calculation logic loaded', 'Inventory sync worker sleep'],
  INFO:  ['Stock item added #SKU-1029', 'Stock item removed #SKU-4402', 'Warehouse transfer completed: LOC-A -> LOC-B', 'Inventory audit report generated', 'Low stock alert cleared for SKU-7761', 'New supplier record created'],
  WARN:  ['Low stock detected for SKU-5521', 'Warehouse temperature variance: +2C', 'Inventory sync delay: 5s', 'Damaged goods reported #SKU-1192'],
  ERROR: ['Stock database commit failure', 'Warehouse API connection lost', 'Critical inconsistency in inventory count', 'Automated replenishment system offline'],
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
  const facility = 1; // User-level messages
  const severity = level === 'DEBUG' ? 7 : (level === 'ERROR' ? 3 : 6);

  // <PRI>TIMESTAMP HOSTNAME APP-ID APP-NAME MESSAGE
  const line = `<${(facility * 8) + severity}>1 ${timestamp} logstream-node ${APP_ID} - - ${message}`;
  
  stream.write(line + '\n');
  process.stdout.write(line + '\n');

  // Schedule next log
  setTimeout(writeLog, 1200 + Math.random() * 2500);
}

console.log(`[inventory-service] starting — writing to ${LOG_FILE}`);
writeLog();
