/**
 * Asaaniyat Backend Server
 * AI Service Orchestrator for Pakistan's Informal Economy
 * Google Antigravity Hackathon — Challenge 2
 */

require('dotenv').config();
const os = require('os');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { sanitizeInput } = require('./middleware/sanitize');
const serviceRoutes = require('./routes/serviceRoutes');
const db = require('./db');
const { generateApiDocs } = require('./traceLogger');

const app = express();
const PORT = process.env.PORT || 3000;

const getLanUrls = (port) => {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter((details) => details && details.family === 'IPv4' && !details.internal)
    .map((details) => `http://${details.address}:${port}`);
};

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Input sanitization
app.use(sanitizeInput);

// ─── Routes ──────────────────────────────────────────────────
app.use('/api', serviceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Asaaniyat AI Service Orchestrator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ─── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  await db.setupDatabase();
  generateApiDocs();
  const lanUrls = getLanUrls(PORT);

  console.log(`\n🚀 Asaaniyat Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  if (lanUrls.length > 0) {
    console.log('📱 Phone/LAN access:');
    lanUrls.forEach((url) => console.log(`   - ${url}`));
  } else {
    console.log('📱 Phone/LAN access: no non-internal IPv4 address detected');
  }
  console.log(`🔌 API endpoint: http://localhost:${PORT}/api/service-request\n`);
});

module.exports = app;
