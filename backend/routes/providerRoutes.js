const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// POST /api/provider/login
// Provider login using email/password stored strictly in providers_users collection (no encryption)
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    console.log(`[ProviderRoutes] Login attempt for: "${email}" (password length: ${password.length})`);

    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

    const mongoDb = await db.getDb();
    
    // Find provider strictly in providers_users collection
    const escapedEmailForRegex = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await mongoDb.collection('providers_users').findOne({ 
      email: { $regex: new RegExp(`^${escapedEmailForRegex}$`, 'i') } 
    });

    if (!user) {
      console.log(`[ProviderRoutes] Login failed: Provider "${email}" not found in database.`);
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.password !== password) {
      console.log(`[ProviderRoutes] Login failed: Password mismatch for provider "${email}".`);
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    console.log(`[ProviderRoutes] Login successful for: "${email}"`);

    // Create JWT
    const secret = process.env.JWT_SECRET || process.env.ANTIGRAVITY_KEY || 'demo-secret';
    const token = jwt.sign({ sub: user._id, email: user.email.toLowerCase(), displayName: user.name }, secret, { expiresIn: '30d' });

    // Update login metadata directly on providers_users
    await mongoDb.collection('providers_users').updateOne(
      { _id: user._id }, 
      { 
        $set: { lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, 
        $inc: { loginCount: 1 } 
      }
    );

    return res.json({ 
      success: true, 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        displayName: user.name, 
        city: user.city || null 
      } 
    });
  } catch (error) {
    console.error('[ProviderRoutes] login failed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
  } catch (error) {
    console.error('[ProviderRoutes] login failed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/provider/profile
// Get authenticated provider profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await mongoDb.collection('providers_users').findOne({ _id: req.auth.sub });
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    return res.json({
      success: true,
      provider: {
        id: user._id,
        name: user.name,
        email: user.email,
        city: user.city || null,
        provider_id: user.provider_id,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/provider/bookings
// Get all bookings for this provider
router.get('/bookings', requireAuth, async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const user = await mongoDb.collection('providers_users').findOne({ _id: req.auth.sub });
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const bookings = await mongoDb.collection(db.COLLECTIONS.bookings)
      .find({ provider_id: user.provider_id || user._id })
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
    const user = await mongoDb.collection('providers_users').findOne({ _id: req.auth.sub });
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.provider_id !== (user.provider_id || user._id)) return res.status(403).json({ success: false, error: 'Unauthorized' });

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
    const user = await mongoDb.collection('providers_users').findOne({ _id: req.auth.sub });
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.provider_id !== (user.provider_id || user._id)) return res.status(403).json({ success: false, error: 'Unauthorized' });

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
    const user = await mongoDb.collection('providers_users').findOne({ _id: req.auth.sub });
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.provider_id !== (user.provider_id || user._id)) return res.status(403).json({ success: false, error: 'Unauthorized' });

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
    const user = await mongoDb.collection('providers_users').findOne({ _id: req.auth.sub });
    if (!user) return res.status(404).json({ success: false, error: 'Provider not found' });

    const booking = await db.getBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.provider_id !== (user.provider_id || user._id)) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const updated = await db.updateBookingStatus(req.params.id, 'canceled');
    return res.json({ success: true, booking: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/provider/messages?booking_id=X
// Get messages for a booking
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
// Save a message
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

