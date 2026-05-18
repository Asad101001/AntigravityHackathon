/**
 * adminRoutes.js — Admin Dashboard Analytics Endpoints
 * Provides insights and statistics for the admin dashboard
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

/**
 * Admin middleware to verify user is admin
 * Checks the admin_users collection
 */
const requireAdmin = async (req, res, next) => {
  try {
    const mongoDb = await db.getDb();
    const adminUserDoc = await mongoDb.collection(db.COLLECTIONS.adminUsers).findOne({ emailLower: req.auth.email });
    
    if (!adminUserDoc) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    req.adminUser = adminUserDoc;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ success: false, error: 'Authorization failed', message: error.message });
  }
};

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard-stats
 * Returns key metrics for the dashboard
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    console.log('Fetching dashboard stats...');
    const mongoDb = await db.getDb();
    
    if (!mongoDb) {
      console.error('MongoDB connection failed');
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }
    
    const usersCollection = mongoDb.collection(db.COLLECTIONS.users);
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);
    const chatCollection = mongoDb.collection(db.COLLECTIONS.chatMessages);

    // Get all statistics
    const totalUsers = await usersCollection.countDocuments();
    const totalBookings = await bookingsCollection.countDocuments();
    const totalChats = await chatCollection.countDocuments();

    console.log(`Stats: Users=${totalUsers}, Bookings=${totalBookings}, Chats=${totalChats}`);

    // Bookings by status
    const bookingsByStatus = await bookingsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Recent bookings
    const recentBookings = await bookingsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Active users (users with bookings in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsersCount = await bookingsCollection.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: { _id: '$user_id' }
      },
      {
        $count: 'count'
      }
    ]).toArray();

    // Revenue stats (sum of booking amounts)
    const bookingStats = await bookingsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $toDouble: '$amount_pkr' } },
          avgAmount: { $avg: { $toDouble: '$amount_pkr' } },
          maxAmount: { $max: { $toDouble: '$amount_pkr' } },
          minAmount: { $min: { $toDouble: '$amount_pkr' } }
        }
      }
    ]).toArray();

    const stats = {
      totalUsers,
      totalBookings,
      totalChats,
      activeUsers: activeUsersCount[0]?.count || 0,
      bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      revenue: bookingStats[0] || {
        totalAmount: 0,
        avgAmount: 0,
        maxAmount: 0,
        minAmount: 0
      },
      recentBookings
    };

    console.log('Dashboard stats retrieved successfully');
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/admin/users
 * Returns all users with pagination
 */
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const mongoDb = await db.getDb();
    const usersCollection = mongoDb.collection(db.COLLECTIONS.users);

    const total = await usersCollection.countDocuments();
    const users = await usersCollection
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users', message: error.message });
  }
});

/**
 * GET /api/admin/bookings
 * Returns all bookings with filters and pagination, enriched with user and provider data
 */
router.get('/bookings', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const mongoDb = await db.getDb();
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);
    const usersCollection = mongoDb.collection(db.COLLECTIONS.users);
    const providersCollection = mongoDb.collection(db.COLLECTIONS.providers);

    const filter = status ? { status } : {};
    const total = await bookingsCollection.countDocuments(filter);
    const bookings = await bookingsCollection
      .find(filter)
      .sort({ created_at: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Enrich bookings with user and provider data
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      try {
        // Fetch user data
        if (booking.user_id) {
          const user = await usersCollection.findOne({ _id: booking.user_id });
          if (user) {
            booking.user_name = user.displayName;
            booking.user_email = user.email;
            booking.user_phone = user.phone || 'N/A';
            booking.user_address = user.address || 'N/A';
          }
        }

        // Fetch provider data
        if (booking.provider_id) {
          const provider = await providersCollection.findOne({ id: booking.provider_id });
          if (provider) {
            booking.provider_name = provider.name;
            booking.provider_phone = provider.phone;
            booking.provider_rating = provider.rating;
            booking.provider_service = provider.service;
            booking.provider_area = provider.area;
            booking.provider_verified = provider.verified;
            booking.provider_response_time = provider.response_time_min;
          }
        }
      } catch (err) {
        console.error('Error enriching booking:', err);
      }

      return booking;
    }));

    res.json({
      success: true,
      data: {
        bookings: enrichedBookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings', message: error.message });
  }
});

/**
 * GET /api/admin/analytics/bookings-by-day
 * Returns booking count grouped by day for the last 30 days
 */
router.get('/analytics/bookings-by-day', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const data = await bookingsCollection.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: { $toDouble: '$amount_pkr' } }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json({ success: true, data });
  } catch (error) {
    console.error('Bookings by day error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics', message: error.message });
  }
});

/**
 * GET /api/admin/analytics/service-types
 * Returns booking count by service type
 */
router.get('/analytics/service-types', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);

    const data = await bookingsCollection.aggregate([
      {
        $group: {
          _id: '$service_type',
          count: { $sum: 1 },
          revenue: { $sum: { $toDouble: '$amount_pkr' } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({ success: true, data });
  } catch (error) {
    console.error('Service types error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics', message: error.message });
  }
});

/**
 * GET /api/admin/analytics/top-cities
 * Returns booking activity by city
 */
router.get('/analytics/top-cities', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);

    const data = await bookingsCollection.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          revenue: { $sum: { $toDouble: '$amount_pkr' } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({ success: true, data });
  } catch (error) {
    console.error('Top cities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics', message: error.message });
  }
});

/**
 * POST /api/admin/users/:userId/toggle-admin
 * Toggle admin status for a user
 */
router.post('/users/:userId/toggle-admin', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const usersCollection = mongoDb.collection(db.COLLECTIONS.users);

    const user = await usersCollection.findOne({ _id: req.params.userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updated = await usersCollection.findOneAndUpdate(
      { _id: req.params.userId },
      { $set: { isAdmin: !user.isAdmin } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Admin status updated',
      user: {
        id: updated.value._id,
        email: updated.value.email,
        displayName: updated.value.displayName,
        isAdmin: updated.value.isAdmin
      }
    });
  } catch (error) {
    console.error('Toggle admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to update admin status', message: error.message });
  }
});

/**
 * PUT /api/admin/bookings/:bookingId/status
 * Update booking status (admin only)
 */
router.put('/bookings/:bookingId/status', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updateData = {
      status,
      updatedAt: new Date()
    };

    // If completing, record completion time
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const result = await bookingsCollection.findOneAndUpdate(
      { _id: req.params.bookingId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking status updated', booking: result.value });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking status', message: error.message });
  }
});

/**
 * DELETE /api/admin/bookings/:bookingId
 * Delete a booking (admin only)
 */
router.delete('/bookings/:bookingId', async (req, res) => {
  try {
    const mongoDb = await db.getDb();
    const bookingsCollection = mongoDb.collection(db.COLLECTIONS.bookings);

    const result = await bookingsCollection.deleteOne({ _id: req.params.bookingId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    res.status(200).json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete booking', message: error.message });
  }
});

module.exports = router;
