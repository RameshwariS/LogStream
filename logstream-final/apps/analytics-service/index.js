/**
 * Analytics Service — JSON Logger
 * Simulates real-time event ingestion pipeline:
 * clickstream, funnel events, aggregation jobs, and ML model scoring.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/analytics-service.log';
const APP_ID   = 'analytics-service';

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
const stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function rand(arr)         { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function eventId()         { return 'EVT-' + Math.random().toString(36).slice(2, 12).toUpperCase(); }
function sessionId()       { return 'sess_' + Math.random().toString(36).slice(2, 14); }

const EVENT_TYPES = [
  'page_view', 'page_view', 'page_view',
  'button_click', 'button_click',
  'add_to_cart', 'checkout_started', 'purchase_completed',
  'search_performed', 'filter_applied',
  'session_start', 'session_end',
  'feature_flag_evaluated', 'experiment_enrolled',
  'error_encountered', 'performance_metric',
];

const PIPELINES = [
  'clickstream-ingester',
  'funnel-aggregator',
  'session-stitcher',
  'realtime-dashboard-updater',
  'ml-recommendation-scorer',
  'ab-test-evaluator',
  'kpi-rollup-job',
];

const LEVELS = ['DEBUG', 'INFO', 'INFO', 'INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];

const WARN_MESSAGES = [
  'Event schema mismatch — falling back to raw storage',
  'Late-arriving event (>30s skew) — dropped from real-time window',
  'ML model scoring latency exceeded SLA: 1200ms',
  'Funnel aggregation lag: 8s behind real-time',
  'Dedup cache eviction rate high: 42%',
  'Kafka consumer lag spike: 1,240 messages',
];

const ERROR_MESSAGES = [
  'Kafka broker unreachable — pausing ingestion',
  'ClickHouse write batch failed — retrying',
  'ML model endpoint returned 503',
  'Session stitching pipeline crashed — restarting worker',
  'Schema registry unavailable — blocking new event types',
  'Redis pipeline flush error — metrics may be inaccurate',
];

const DEBUG_MESSAGES = [
  'Event deserialized from Kafka partition 3 offset 10921',
  'Batch checkpoint written: offset 10950',
  'Feature flag cache refreshed (TTL 60s)',
  'A/B test cohort assigned for experiment exp_0023',
  'ClickHouse insert batch size: 500 rows',
  'Session window closed after 30min idle',
];

function buildEntry() {
  const level    = rand(LEVELS);
  const pipeline = rand(PIPELINES);
  const evtType  = rand(EVENT_TYPES);
  const eid      = eventId();
  const sess     = sessionId();

  let message;
  if (level === 'ERROR') {
    message = rand(ERROR_MESSAGES);
  } else if (level === 'WARN') {
    message = rand(WARN_MESSAGES);
  } else if (level === 'DEBUG') {
    message = rand(DEBUG_MESSAGES);
  } else {
    // INFO — realistic pipeline messages
    const count = randInt(1, 500);
    const infos = [
      `Ingested event ${evtType} (${eid}) for session ${sess}`,
      `Pipeline ${pipeline} processed ${count} events in ${randInt(5, 200)}ms`,
      `Funnel step "${evtType}" completed — conversion: ${(Math.random() * 60 + 20).toFixed(1)}%`,
      `ML score: ${(Math.random()).toFixed(4)} for session ${sess} — recommendation updated`,
      `A/B test variant assigned: ctrl=${Math.random() > 0.5 ? 'A' : 'B'} for ${sess}`,
      `KPI rollup written: ${evtType} count=${count}, uniq_sessions=${randInt(1, count)}`,
    ];
    message = rand(infos);
  }

  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    service:  APP_ID,
    analytics: {
      eventId:   eid,
      eventType: evtType,
      sessionId: sess,
      pipeline,
      batchSize: randInt(1, 500),
    },
    performance: {
      processingMs: level === 'ERROR' ? randInt(2000, 15000) : randInt(1, 600),
      kafkaLag:     randInt(0, level === 'WARN' ? 2000 : 50),
    },
    metadata: { pid: process.pid, worker: `analytics-worker-${randInt(1, 6)}` },
  };
}

function writeLog() {
  const entry = buildEntry();
  const line  = JSON.stringify(entry);
  stream.write(line + '\n');
  process.stdout.write(`[analytics-service] ${line}\n`);

  // Analytics pipeline: fairly high throughput
  setTimeout(writeLog, randInt(300, 1200));
}

console.log(`[analytics-service] starting — writing to ${LOG_FILE}`);
writeLog();
