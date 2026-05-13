/**
 * Service Routes — API endpoints for the AI Service Orchestrator
 * 
 * POST /api/service-request    — Main pipeline endpoint
 * POST /api/booking/confirm    — Confirm a booking
 * GET  /api/booking/:booking_id — Get booking details
 * POST /api/booking/:booking_id/feedback — Submit feedback
 */

const express = require('express');
const router = express.Router();
const AntigravityOrchestrator = require('../orchestrator/AntigravityOrchestrator');
const BookingExecutorAgent = require('../agents/BookingExecutorAgent');
const FollowUpManagerAgent = require('../agents/FollowUpManagerAgent');

// Instantiate orchestrator
const orchestrator = new AntigravityOrchestrator({
  apiKey: process.env.ANTIGRAVITY_KEY || 'demo-key'
});

// ═══════════════════════════════════════════════════════════════
// POST /api/service-request
// Main endpoint — runs the full 7-agent pipeline
// ═══════════════════════════════════════════════════════════════
router.post('/service-request', async (req, res) => {
  try {
    const { user_text, user_id } = req.body;

    if (!user_text || typeof user_text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'user_text is required and must be a string'
      });
    }

    // Run the full Antigravity pipeline
    const result = await orchestrator.run({
      input: {
        user_text,
        user_id: user_id || `user_${Date.now()}`
      },
      options: {
        emit_trace: true,
        timeout_ms: 10000,
        retry_on_failure: true,
        fallback_mode: 'graceful'
      }
    });

    // ── Clarification needed ──
    if (result.needs_clarification) {
      return res.status(200).json({
        success: false,
        error_type: 'low_confidence',
        parsed: result.clarification.parsed,
        prompt: result.clarification.prompt,
        suggestions: result.clarification.suggestions,
        execution_logs: result.execution_logs
      });
    }

    // ── No providers ──
    if (result.status === 'no_providers') {
      return res.status(200).json({
        success: false,
        error_type: 'no_providers',
        parsed_intent: result.output.parsed_intent,
        message: 'No providers found in your area. Try a different location or service.',
        execution_logs: result.execution_logs
      });
    }

    // ── Success ──
    return res.status(200).json({
      success: true,
      booking_id: result.output.booking_id,
      provider: result.output.provider,
      reasoning: result.output.reasoning,
      confirmation_message: result.output.confirmation_message,
      alternatives: result.output.alternatives,
      parsed_intent: result.output.parsed_intent,
      reminders_scheduled: result.output.reminders_scheduled,
      execution_logs: result.execution_logs,
      workflow_id: result.workflow_id,
      duration_ms: result.duration_ms
    });

  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal pipeline error',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/booking/confirm
// Confirm a pending booking
// ═══════════════════════════════════════════════════════════════
router.post('/booking/confirm', async (req, res) => {
  try {
    const { booking_id, user_confirmed } = req.body;

    if (!booking_id) {
      return res.status(400).json({ success: false, error: 'booking_id is required' });
    }

    const booking = BookingExecutorAgent.getBooking(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (user_confirmed) {
      BookingExecutorAgent.updateBooking(booking_id, { status: 'confirmed' });
      const notifications = FollowUpManagerAgent.getNotifications(booking_id);
      return res.json({
        success: true,
        status: 'confirmed',
        reminders_scheduled: notifications.length
      });
    } else {
      BookingExecutorAgent.updateBooking(booking_id, { status: 'cancelled' });
      return res.json({
        success: true,
        status: 'cancelled'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/booking/:booking_id
// Get booking details
// ═══════════════════════════════════════════════════════════════
router.get('/booking/:booking_id', async (req, res) => {
  try {
    const booking = BookingExecutorAgent.getBooking(req.params.booking_id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const notifications = FollowUpManagerAgent.getNotifications(req.params.booking_id);

    return res.json({
      booking_id: booking.booking_id,
      provider_name: booking.provider_name,
      provider_phone: booking.provider_phone,
      service_type: booking.service_type,
      location: booking.location,
      scheduled_time: booking.scheduled_time,
      time_slot: booking.time_slot,
      status: booking.status,
      reasoning: booking.reasoning,
      reminders: notifications.map(n => ({
        time: n.scheduled_time,
        type: n.type,
        status: n.status
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/booking/:booking_id/feedback
// Submit feedback for a completed booking
// ═══════════════════════════════════════════════════════════════
router.post('/booking/:booking_id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.booking_id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const booking = BookingExecutorAgent.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const feedbackId = `FB_${Date.now()}`;
    BookingExecutorAgent.updateBooking(bookingId, {
      feedback: { rating, comment: comment || '', feedback_id: feedbackId, created_at: new Date().toISOString() }
    });

    return res.json({
      success: true,
      feedback_id: feedbackId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
