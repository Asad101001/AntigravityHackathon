'use strict';

const fs = require('fs');
const path = require('path');
let terminalRenderer = null;
try {
  terminalRenderer = require('./utils/terminalRenderer');
} catch (err) {
  // optional - renderer may not exist in some branches
}

const BACKEND_DIR = __dirname;
const LOGS_ROOT = path.join(BACKEND_DIR, 'logs');
const DOCS_DIR = path.join(BACKEND_DIR, 'docs');
const RUN_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RUN_LOGS_DIR = path.join(LOGS_ROOT, RUN_TIMESTAMP);

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`[TRACE] Could not create directory "${dir}":`, err.message);
  }
}

[LOGS_ROOT, RUN_LOGS_DIR, DOCS_DIR].forEach(ensureDir);

function logAgentTrace(agentName, action, input, output, durationMs) {
  const fileTs = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${fileTs}-${agentName}-trace.json`;
  const filepath = path.join(RUN_LOGS_DIR, filename);
  const payload = {
    run_id: RUN_TIMESTAMP,
    timestamp: new Date().toISOString(),
    agent: agentName,
    action,
    input,
    output,
    durationMs,
  };

  try {
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[TRACE] ${agentName} -> ${path.relative(process.cwd(), filepath)}`);
    // also print a concise human-friendly terminal line when renderer available
    try {
      if (terminalRenderer && typeof terminalRenderer.renderAgentLine === 'function') {
        terminalRenderer.renderAgentLine({ agentName, action, input, output, durationMs, tracePath: filepath });
      }
    } catch (err) {
      // swallow renderer errors to avoid breaking tracing
      console.warn('[TRACE] terminalRenderer failed:', err.message);
    }
    return filepath;
  } catch (err) {
    console.error(`[TRACE] Failed to write trace for "${agentName}":`, err.message);
    return null;
  }
}

function generateApiDocs() {
  const fileTs = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join(DOCS_DIR, `${fileTs}-api-documentation.md`);
  const content = `# Asaaniyat API Documentation
Generated: ${new Date().toISOString()}
Run ID: ${RUN_TIMESTAMP}

## Endpoints

### POST /api/service-request
Runs the service-booking pipeline.
Body: \`{ user_text, user_id?, user_location?, location_source?, city? }\`

### POST /api/chaos/simulate
Simulates provider cancellation and recovery.

### POST /api/chat/message
Runs grounded RAG chat for a booking.

### GET /api/chat/:booking_id
Returns persisted chat history.

### POST /api/rag/ingest
Ingests text into the local RAG store.

### POST /api/rag/query
Queries the local RAG store.

### POST /api/booking/confirm
Confirms or cancels a booking.

### GET /api/booking/:booking_id
Returns booking details and reminders.

### POST /api/booking/:booking_id/feedback
Stores booking feedback.

### GET /api/logs
Returns agent traces from the current backend-local logs directory.

### GET /health
Health check.
`;

  try {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`[DOCS] API docs -> ${path.relative(process.cwd(), filepath)}`);
  } catch (err) {
    console.error('[DOCS] Failed to write API docs:', err.message);
  }
}

module.exports = {
  logAgentTrace,
  generateApiDocs,
  RUN_LOGS_DIR,
  RUN_TIMESTAMP,
  LOGS_ROOT,
};
