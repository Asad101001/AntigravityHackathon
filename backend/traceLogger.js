/**
 * traceLogger.js — Fixed & hardened
 *
 * Log layout (all relative to backend/):
 *   backend/
 *     logs/
 *       2024-06-01T14-30-00/   ← ONE subfolder per server process lifetime
 *         <ts>-parse_intent-trace.json
 *         <ts>-rank_providers-trace.json
 *         ...
 *     docs/
 *       <ts>-api-documentation.md
 *
 * Why __dirname?  It resolves to the directory that contains THIS FILE,
 * no matter what CWD the `node` process started from.  `../../logs` was
 * resolving to the filesystem root in some environments.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Directory roots ───────────────────────────────────────────────────────────
const BACKEND_DIR = __dirname;                          // …/project/backend
const LOGS_ROOT   = path.join(BACKEND_DIR, 'logs');    // …/project/backend/logs
const DOCS_DIR    = path.join(BACKEND_DIR, 'docs');    // …/project/backend/docs

// ── Run-level subfolder ───────────────────────────────────────────────────────
// One subfolder per server process lifetime.
// Colons replaced by dashes so the name is valid on Windows, macOS, and Linux.
// Slice to 19 chars → "2024-06-01T14-30-00" (no fractional seconds clutter).
const RUN_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RUN_LOGS_DIR  = path.join(LOGS_ROOT, RUN_TIMESTAMP);

// ── Bootstrap directories eagerly so every trace write is guaranteed to succeed ─
[LOGS_ROOT, RUN_LOGS_DIR, DOCS_DIR].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // Rare FS error — log to stderr but never crash the server
    console.error(`[TRACE] Could not create directory "${dir}":`, err.message);
  }
});

/**
 * Write a single agent trace JSON into the current run's subfolder.
 *
 * @param {string} agentName  - Agent identifier (e.g. "parse_intent")
 * @param {string} action     - What the agent did (same as agentName typically)
 * @param {*}      input      - Sanitised input snapshot
 * @param {*}      output     - Sanitised output snapshot
 * @param {number} durationMs - Wall-clock duration in milliseconds
 * @returns {string|null}     - Absolute path of the written file, or null on error
 */
function logAgentTrace(agentName, action, input, output, durationMs) {
  const fileTs   = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${fileTs}-${agentName}-trace.json`;
  const filepath = path.join(RUN_LOGS_DIR, filename);

  const payload = {
    run_id:    RUN_TIMESTAMP,
    timestamp: new Date().toISOString(),
    agent:     agentName,
    action,
    input,
    output,
    durationMs,
  };

  try {
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf8');
    // Show a short relative path to keep the console readable
    const rel = path.relative(process.cwd(), filepath);
    console.log(`[TRACE] ${agentName} → ${rel}`);
    return filepath;
  } catch (err) {
    console.error(`[TRACE] Failed to write trace for "${agentName}":`, err.message);
    return null;
  }
}

/**
 * Generate an API documentation Markdown file in backend/docs/.
 * Errors are caught — this should never crash the server on startup.
 */
function generateApiDocs() {
  const fileTs   = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${fileTs}-api-documentation.md`;
  const filepath = path.join(DOCS_DIR, filename);

  const content = `# Asaaniyat API Documentation
Generated: ${new Date().toISOString()}
Run ID: ${RUN_TIMESTAMP}

## Endpoints

### POST /api/service-request
Full 8-agent pipeline.
Body: \`{ user_text, user_id?, user_location?, location_source? }\`

### POST /api/chaos/simulate
Simulate provider cancellation → re-rank → recovery.
Body: \`{ booking_id?, provider_id_to_cancel?, providers?, urgency_level?, price_sensitivity?, service_type?, location? }\`

### POST /api/chat/message
RAG + summarization + provider chat.
Body: \`{ booking_id, message, user_id?, provider? }\`

### GET /api/chat/:booking_id
Persisted chat history.

### POST /api/rag/ingest
Ingest text into local SQLite RAG store.
Body: \`{ source, content, metadata? }\`

### POST /api/rag/query
Query RAG store.
Body: \`{ query, top_k?, token_budget? }\`

### POST /api/booking/confirm
Confirm or cancel a booking.
Body: \`{ booking_id, user_confirmed }\`

### GET /api/booking/:booking_id
Booking details + scheduled reminders.

### POST /api/booking/:booking_id/feedback
Submit 1–5 star rating.
Body: \`{ rating, comment? }\`

### GET /api/logs
Current-run agent trace files (grouped by run subfolder).

### GET /health
Health check.
`;

  try {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`[DOCS] API docs → ${path.relative(process.cwd(), filepath)}`);
  } catch (err) {
    console.error('[DOCS] Failed to write API docs:', err.message);
  }
}

module.exports = {
  logAgentTrace,
  generateApiDocs,
  /** Absolute path of the current-run trace directory */
  RUN_LOGS_DIR,
  /** ISO-safe timestamp string identifying this server process */
  RUN_TIMESTAMP,
  /** Backend/logs root — useful for the GET /api/logs route */
  LOGS_ROOT,
};