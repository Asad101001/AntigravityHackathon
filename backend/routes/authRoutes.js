const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET || process.env.ANTIGRAVITY_KEY || 'demo-secret';
  return jwt.sign(
    {
      sub: user._id,
      email: user.emailLower,
      displayName: user.displayName,
    },
    secret,
    { expiresIn: '30d' }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    city: user.city || null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount || 0,
  };
}

router.post('/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim();
    const city = String(req.body.city || '').trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    if (!city) {
      return res.status(400).json({ success: false, error: 'City is required' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.createUser({ email, passwordHash, displayName: displayName || email.split('@')[0], city });
    await db.recordUserLogin(user._id);

    const freshUser = await db.findUserById(user._id);
    const token = signToken(freshUser);

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(freshUser),
    });
  } catch (error) {
    console.error('[Auth] Register failed:', error);
    return res.status(500).json({ success: false, error: 'Registration failed', message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash || '');
    if (!passwordOk) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    await db.recordUserLogin(user._id);
    const freshUser = await db.findUserById(user._id);
    const token = signToken(freshUser);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(freshUser),
    });
  } catch (error) {
    console.error('[Auth] Login failed:', error);
    return res.status(500).json({ success: false, error: 'Login failed', message: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.findUserById(req.auth.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Session expired' });
    }
    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/auth/admin-login
// Admin login endpoint
// ═══════════════════════════════════════════════════════════════
router.post('/admin-login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const mongoDb = await db.getDb();
    const adminUser = await mongoDb.collection(db.COLLECTIONS.adminUsers).findOne({ emailLower: email });
    
    if (!adminUser) {
      return res.status(401).json({ success: false, error: 'Admin account not found' });
    }

    const passwordMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    // Record login
    await mongoDb.collection(db.COLLECTIONS.adminUsers).updateOne(
      { _id: adminUser._id },
      {
        $set: { lastLoginAt: new Date().toISOString() },
        $inc: { loginCount: 1 }
      }
    );

    const token = signToken(adminUser);
    return res.json({
      success: true,
      token,
      user: {
        id: adminUser._id,
        email: adminUser.email,
        displayName: adminUser.displayName,
        isAdmin: true
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
