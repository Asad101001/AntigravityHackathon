const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', '..', 'logs');
const docsDir = path.join(__dirname, '..', '..', 'docs');

// Ensure directories exist
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

function logAgentTrace(agentName, action, input, output, durationMs) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilename = `${timestamp}-${agentName}-trace.json`;
  const filepath = path.join(logsDir, logFilename);
  
  const logData = {
    timestamp: new Date().toISOString(),
    agent: agentName,
    action,
    input,
    output,
    durationMs,
  };
  
  fs.writeFileSync(filepath, JSON.stringify(logData, null, 2));
  console.log(`[TRACE] ${agentName} logged to ${logFilename}`);
  return filepath;
}

function generateApiDocs() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const docFilename = `${timestamp}-api-documentation.md`;
  const filepath = path.join(docsDir, docFilename);
  
  const content = `# Asaaniyat API Documentation
Generated at: ${new Date().toISOString()}

## Endpoints

### POST /api/service-request
Runs the Antigravity booking pipeline. Body: \`user_text\`, optional \`user_id\`, optional \`user_location\`, optional \`location_source\`.

### POST /api/chat/message
Runs the RAG retrieval, summarization, and provider conversation agents. Body: \`booking_id\`, \`message\`, optional \`provider\`.

### GET /api/chat/:booking_id
Returns persisted chat history for a booking.

### POST /api/rag/ingest
Adds local chunks to the SQLite RAG store. Body: \`source\`, \`content\`, optional \`metadata\`.

### POST /api/rag/query
Retrieves token-budgeted local RAG chunks. Body: \`query\`, optional \`top_k\`, optional \`token_budget\`.

### POST /api/booking/confirm
Confirms or cancels an existing booking. Body: \`booking_id\`, \`user_confirmed\`.

### GET /api/booking/:booking_id
Gets booking details.

### POST /api/booking/:booking_id/feedback
Submits a 1-5 rating and optional comment.

### GET /api/logs
Returns persisted agent trace files.
`;

  fs.writeFileSync(filepath, content);
  console.log('[DOCS] API docs generated to ' + docFilename);
}

module.exports = {
  logAgentTrace,
  generateApiDocs
};


