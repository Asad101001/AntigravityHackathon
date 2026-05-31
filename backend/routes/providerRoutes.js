const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Helper: look up a provider from providers_users by their JWT subject (_id)
async function getProviderById(mongoDb, id) {
  return mongoDb.collection('providers_users').findOne({ _id: id });
}

// Helper: resolve the SHORT booking ID (e.g. 'PL002') for a providers_users record.
// providers_users.provider_id  →  providers._id  (hex)
// providers.id                 →  the short ID stored in bookings.provider_id
async function getBookingProviderId(mongoDb, provUser) {
  if (!provUser?.provider_id) return null;
  const provDoc = await mongoDb.collection(db.COLLECTIONS.providers).findOne({ _id: provUser.provider_id });
  return provDoc?.id || null;
}

// POST /api/provider/login
// Authenticate strictly against providers_users (plain-text password, no bcrypt)
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    console.log(`[ProviderRoutes] Login attempt for: "${email}" (password length: ${password.length})`);

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const mongoDb = await db.getDb();

    // Case-insensitive email lookup in providers_users
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await mongoDb.collection('providers_users').findOne({
      email: { $regex: new RegExp(`^${escaped}$`, 'i') },
    });

    if (!user) {
      console.log(`[ProviderRoutes] Login failed: "${email}" not found in providers_users.`);
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.password !== password) {
      console.log(`[ProviderRoutes] Login failed: password mismatch for "${email}".`);
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    console.log(`[ProviderRoutes] Login successful for: "${email}"`);

    // Issue JWT — sub is the providers_users _id
    const secret = process.env.JWT_SECRET || 'demo-secret';
    const token = jwt.sign(
      { sub: user._id, email: user.email.toLowerCase(), displayName: user.name },
      secret,
      { expiresIn: '30d' }
    );

    // Update last login time
    await mongoDb.collection('providers_users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date().toISOString() }, $inc: { loginCount: 1 } }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.name,
        city: user.city || null,
        provider_id: user.provider_id || null,
      },
    });
  } catch (error) {
    console.error('[ProviderRoutes] login error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/provider/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await getProviderById(mongoDb, req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    return res.json({
      success: true,
      provider: {
        id: user._id,
        name: user.name,
        email: user.email,
        city: user.city || null,
        provider_id: user.provider_id || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/provider/bookings
router.get('/bookings', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await getProviderById(mongoDb, req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    // Resolve the short booking ID (e.g. 'PL002') used in the bookings collection
    const shortId = await getBookingProviderId(mongoDb, user);
    if (!shortId) return res.json({ success: true, bookings: [] });

    const bookings = await mongoDb
      .collection(db.COLLECTIONS.bookings)
      .find({ provider_id: shortId })
      .sort({ booking_start_time: -1 })
      .toArray();

    return res.json({ success: true, bookings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/provider/bookings/:id/accept
router.post('/bookings/:id/accept', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await getProviderById(mongoDb, req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    const shortId = await getBookingProviderId(mongoDb, user);
    if (booking.provider_id !== shortId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await db.updateBookingStatus(req.params.id, 'confirmed');
    return res.json({ success: true, booking: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/provider/bookings/:id/reject
router.post('/bookings/:id/reject', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await getProviderById(mongoDb, req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    const shortId = await getBookingProviderId(mongoDb, user);
    if (booking.provider_id !== shortId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await db.updateBookingStatus(req.params.id, 'rejected');
    return res.json({ success: true, booking: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/provider/bookings/:id/complete
router.post('/bookings/:id/complete', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await getProviderById(mongoDb, req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    const shortId = await getBookingProviderId(mongoDb, user);
    if (booking.provider_id !== shortId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await db.updateBookingStatus(req.params.id, 'completed');
    return res.json({ success: true, booking: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/provider/bookings/:id (cancel)
router.delete('/bookings/:id', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await getProviderById(mongoDb, req.auth.sub);
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    const shortId = await getBookingProviderId(mongoDb, user);
    if (booking.provider_id !== shortId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await db.updateBookingStatus(req.params.id, 'canceled');
    return res.json({ success: true, booking: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/provider/messages?booking_id=X
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const bookingId = req.query.booking_id;
    if (!bookingId) return res.status(400).json({ success: false, error: 'booking_id is required' });

    const messages = await db.getChatMessages(bookingId, 100);
    return res.json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/provider/messages
router.post('/messages', requireAuth, async (req, res) => {
  try {
    const { booking_id, text } = req.body;
    if (!booking_id || !text) return res.status(400).json({ success: false, error: 'booking_id and text are required' });

    const message = await db.saveChatMessage({
      booking_id,
      user_id: req.auth.sub,
      role: 'provider',
      content: text,
    });

    return res.json({ success: true, message });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
