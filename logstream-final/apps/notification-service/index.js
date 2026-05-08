/**
 * Notification Service — JSON Logger
 * Simulates email, SMS, and push notification delivery events
 * including delivery receipts, bounces, and channel failures.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/notification-service.log';
const APP_ID   = 'notification-service';

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function rand(arr)          { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max)  { return Math.floor(Math.random() * (max - min + 1)) + min; }
function notifId()          { return 'NTFY-' + Math.random().toString(36).slice(2, 10).toUpperCase(); }
function userId()           { return 'usr_' + randInt(1000, 9999); }

const CHANNELS  = ['email', 'email', 'sms', 'push', 'push', 'in-app', 'webhook'];
const TEMPLATES = {
  email: [
    'order_confirmation', 'password_reset', 'welcome_email',
    'payment_receipt', 'shipping_update', 'account_locked',
  ],
  sms: [
    'otp_verification', 'delivery_alert', 'payment_declined_sms',
    'low_stock_alert', 'promo_flash_sale',
  ],
  push: [
    'new_message', 'order_shipped', 'price_drop_alert',
    'daily_digest', 'security_alert',
  ],
  'in-app': [
    'badge_earned', 'friend_joined', 'comment_reply', 'mention_alert',
  ],
  webhook: [
    'payment.completed', 'order.updated', 'user.deleted', 'subscription.renewed',
  ],
};

const PROVIDERS = {
  email:   ['sendgrid', 'ses', 'mailgun'],
  sms:     ['twilio', 'vonage', 'sinch'],
  push:    ['fcm', 'apns', 'onesignal'],
  'in-app': ['internal'],
  webhook: ['internal'],
};

const LEVELS = ['DEBUG', 'INFO', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];

const STATUS_OUTCOMES = {
  INFO:  ['delivered', 'queued', 'sent', 'opened', 'clicked'],
  WARN:  ['soft_bounce', 'delayed', 'provider_degraded', 'retry_1', 'retry_2'],
  ERROR: ['hard_bounce', 'provider_unreachable', 'invalid_recipient', 'quota_exceeded', 'delivery_failed'],
  DEBUG: ['batch_enqueued', 'template_compiled', 'rate_limit_checked', 'dedup_key_verified'],
};

function buildEntry() {
  const level    = rand(LEVELS);
  const channel  = rand(CHANNELS);
  const template = rand(TEMPLATES[channel] || TEMPLATES.email);
  const outcome  = rand(STATUS_OUTCOMES[level] || STATUS_OUTCOMES.INFO);
  const nid      = notifId();
  const uid      = userId();
  const provider = rand(PROVIDERS[channel] || ['internal']);
  const latency  = level === 'ERROR' ? randInt(3000, 12000) : randInt(30, 800);

  const messages = {
    DEBUG: `[${channel}] ${template} — ${outcome} (dedup check)`,
    INFO:  `[${channel}] ${template} ${outcome} for ${uid} via ${provider} (${latency}ms)`,
    WARN:  `[${channel}] ${template} ${outcome} for ${uid} — retrying via ${provider}`,
    ERROR: `[${channel}] ${template} ${outcome} for ${uid} — provider: ${provider}`,
  };

  return {
    timestamp:    new Date().toISOString(),
    level,
    message:      messages[level],
    service:      APP_ID,
    notification: {
      id:       nid,
      channel,
      template,
      outcome,
      provider,
      latency_ms: latency,
    },
    recipient:    { userId: uid },
    metadata:     { pid: process.pid, worker: `notif-worker-${randInt(1, 4)}` },
  };
}

function writeLog() {
  const entry = buildEntry();
  const line  = JSON.stringify(entry);
  stream.write(line + '\n');
  process.stdout.write(`[notification-service] ${line}\n`);

  setTimeout(writeLog, randInt(600, 2500));
}

console.log(`[notification-service] starting — writing to ${LOG_FILE}`);
writeLog();
