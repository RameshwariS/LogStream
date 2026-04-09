/**
 * Dummy App 2 — Syslog Logger
 * Writes RFC 3164 syslog-format log lines.
 * Format: <PRI>MMM DD HH:MM:SS HOSTNAME APPNAME[PID]: MESSAGE
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const LOG_FILE = process.env.LOG_FILE || './logs/syslog-app.log';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PRIVAL = { DEBUG: 7, INFO: 6, NOTICE: 5, WARN: 4, ERROR: 3, CRIT: 2 };
const LEVELS  = ['INFO', 'INFO', 'INFO', 'NOTICE', 'WARN', 'ERROR'];
const MESSAGES = {
  DEBUG:  ['systemd: starting unit logstream.service', 'kernel: buffer flushed'],
  INFO:   ['sshd: accepted publickey for deploy', 'nginx: access 200 GET /api/health',
           'cron: job completed successfully', 'systemd: service started'],
  NOTICE: ['kernel: eth0 link up at 1Gbps', 'systemd: reached target multi-user'],
  WARN:   ['kernel: out of memory, oom_kill_process', 'sshd: disconnect from unknown host'],
  ERROR:  ['nginx: connect() failed to upstream', 'cron: job exited with code 1', 'sshd: bad packet length'],
};

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function rfc3164Timestamp() {
  const now = new Date();
  const mon = MONTHS[now.getMonth()];
  const day = String(now.getDate()).padStart(2, ' ');
  const time = now.toTimeString().slice(0, 8);
  return `${mon} ${day} ${time}`;
}

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function writeLog() {
  const level   = randomChoice(LEVELS);
  const message = randomChoice(MESSAGES[level]);
  const pri     = PRIVAL[level] + 8; // facility 1 (user) * 8 + severity
  const hostname = os.hostname();
  const pid      = process.pid;

  const line = `<${pri}>${rfc3164Timestamp()} ${hostname} syslog-app[${pid}]: ${level}: ${message}`;
  stream.write(line + '\n');
  process.stdout.write(line + '\n');

  setTimeout(writeLog, 300 + Math.random() * 800);
}

console.log(`[syslog-app] starting — writing to ${LOG_FILE}`);
writeLog();
