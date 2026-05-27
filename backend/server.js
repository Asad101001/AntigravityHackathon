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
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const speechRoutes = require('./routes/speechRoutes');
const db = require('./db');
const { generateApiDocs } = require('./traceLogger');

const app = express();
const PORT = process.env.PORT || 3001;

const getLanUrls = (port) => {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter((details) => details && details.family === 'IPv4' && !details.internal)
    .map((details) => `http://${details.address}:${port}`);
};

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '6mb' }));

// Rate limiting: 100 requests per 15 minutes per IP (global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // 15 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Input sanitization
app.use(sanitizeInput);

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', serviceRoutes);
app.use('/api', speechRoutes);
app.use('/api/admin', adminRoutes);


// Friendly root page/status for people opening http://localhost:3001 in a browser.
app.get('/', (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Asaaniyat Backend</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5fbf7; color: #10251a; margin: 0; padding: 32px; }
      main { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #ddebe3; border-radius: 24px; padding: 28px; box-shadow: 0 18px 50px rgba(14, 143, 70, 0.12); }
      h1 { margin-top: 0; color: #0e8f46; }
      code, pre { background: #e9f8ef; border-radius: 10px; padding: 2px 6px; }
      a { color: #0e8f46; font-weight: 700; }
      li { margin: 8px 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>Asaaniyat Backend is running ✅</h1>
      <p>This is the API server, not the mobile frontend. Open the Expo frontend from the <code>mobile</code> terminal.</p>
      <ul>
        <li>Health check: <a href="http://${host}/health">http://${host}/health</a></li>
        <li>API base: <code>http://${host}/api</code></li>
        <li>Frontend dev server: run <code>cd mobile</code> then <code>npx expo start</code></li>
      </ul>
      <p><strong>Do not browse to <code>0.0.0.0:${PORT}</code>.</strong> Browsers need <code>localhost:${PORT}</code> or your LAN IP.</p>
    </main>
  </body>
</html>`);
});

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
  if (process.env.GENERATE_API_DOCS_ON_START === 'true') generateApiDocs();
  const lanUrls = getLanUrls(PORT);

  // Security check: warn if JWT_SECRET is using the insecure default
  const jwtSecret = process.env.JWT_SECRET || process.env.ANTIGRAVITY_KEY;
  if (!jwtSecret || jwtSecret === 'demo-secret') {
    console.warn('\n⚠️  WARNING: JWT_SECRET is not set or is using the insecure default.');
    console.warn('   Set a strong JWT_SECRET environment variable before deploying to production.\n');
  }

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
