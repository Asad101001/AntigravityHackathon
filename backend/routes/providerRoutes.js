const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

function generateEmailFromName(name) {
  if (!name) return null;
  const normalized = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${normalized}@gmail.com`;
}

function generatePasswordFromService(service) {
  if (!service) return 'service123';
  const raw = String(service).toLowerCase();
  const compact = raw.replace(/[^a-z]/g, '');

  // If explicit AC mention, use ac123
  if (/\bac\b/.test(raw) || raw.includes('ac') ) return 'ac123';

  // Short services -> use compact + 123
  if (compact.length <= 3) return `${compact}123`;

  // Remove vowels but preserve trailing "er" if present (to match examples like plumber -> plmber)
  let noVowels = compact.replace(/[aeiou]/g, '');
  if (compact.endsWith('er') && !noVowels.endsWith('er')) {
    // attempt to keep terminal 'er'
    const prefix = noVowels.slice(0, -1);
    noVowels = `${prefix}er`;
  }

  return `${noVowels}123`;
}

// POST /api/provider/seed-providers
// Creates user accounts from providers collection if users don't already exist.
router.post('/seed-providers', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const providers = await mongoDb.collection(db.COLLECTIONS.providers).find({}).toArray();

    const created = [];
    const skipped = [];

    for (const provider of providers) {
      const name = provider.name || provider.provider_name || provider.displayName || provider.provider || '';
      const service = provider.service || provider.service_type || '';
      const city = provider.city || '';

      const email = generateEmailFromName(name);
      const passwordPlain = generatePasswordFromService(service);

      // If user already exists, skip
      const existing = await mongoDb.collection(db.COLLECTIONS.users).findOne({ emailLower: String(email).toLowerCase() });
      if (existing) {
        skipped.push({ provider_id: provider._id || provider.id || null, provider_name: name, email, reason: 'user_exists' });
        continue;
      }

      // Hash and create user
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(passwordPlain, salt);

      const newUser = {
        email,
        emailLower: String(email).toLowerCase(),
        displayName: name || email.split('@')[0],
        city: city || null,
        passwordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
        loginCount: 0,
      };

      // Generate _id in same format as createUser
      newUser._id = `USR_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await mongoDb.collection(db.COLLECTIONS.users).insertOne(newUser);
      created.push({ provider_id: provider._id || provider.id || null, provider_name: name, email, password: passwordPlain });
    }

    return res.json({ success: true, created_count: created.length, skipped_count: skipped.length, created, skipped });
  } catch (error) {
    console.error('[ProviderRoutes] Seed providers failed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/provider/login
// Provider login using generated email/password stored in users collection
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

    const mongoDb = await db.getDb();
    const user = await mongoDb.collection(db.COLLECTIONS.users).findOne({ emailLower: email });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    const passwordOk = await bcrypt.compare(password, user.passwordHash || '');
    if (!passwordOk) return res.status(401).json({ success: false, error: 'Invalid email or password' });

    // Create JWT
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.ANTIGRAVITY_KEY || 'demo-secret';
    const token = jwt.sign({ sub: user._id, email: user.emailLower, displayName: user.displayName }, secret, { expiresIn: '30d' });

    // Update login metadata
    await mongoDb.collection(db.COLLECTIONS.users).updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, $inc: { loginCount: 1 } });

    return res.json({ success: true, token, user: { id: user._id, email: user.email, displayName: user.displayName, city: user.city || null } });
  } catch (error) {
    console.error('[ProviderRoutes] login failed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

