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
  
  const content = "# Asaaniyat API Documentation\\n" +
"Generated at: " + new Date().toISOString() + "\\n\\n" +
"## Endpoints\\n\\n" +
"### 1. POST /api/service-request\\n" +
"- **Description**: Orchestrates the AI flow for booking a service.\\n" +
"- **Request Body**:\\n" +
"  - `query` (string) - Natural language query from the user.\\n" +
"  - `location` (object) - Optional. Contains `latitude` and `longitude`.\\n" +
"  - `userPhone` (string) - Optional.\\n\\n" +
"### 2. POST /api/confirm-booking\\n" +
"- **Description**: Confirms the booking with a specific provider.\\n" +
"- **Request Body**:\\n" +
"  - `providerId` (string)\\n" +
"  - `bookingTime` (string)\\n\\n" +
"### 3. GET /api/logs\\n" +
"- **Description**: Retrieves recent agent traces.\\n";

  fs.writeFileSync(filepath, content);
  console.log("[DOCS] API docs generated to " + docFilename);
}

module.exports = {
  logAgentTrace,
  generateApiDocs
};


