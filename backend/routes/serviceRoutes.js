/**
 * serviceRoutes.js — Updated for Agentic Upgrade
 * New: POST /api/chaos/simulate
 * Updated: service-request response includes reasoning_log, quote_pkr, quote_breakdown
 */

const express = require('express');
const router = express.Router();
const AntigravityOrchestrator = require('../orchestrator/AntigravityOrchestrator');
const BookingExecutorAgent = require('../agents/BookingExecutorAgent');
const FollowUpManagerAgent = require('../agents/FollowUpManagerAgent');
const requireAuth = require('../middleware/requireAuth');
const { sendPushNotification } = require('../utils/pushNotification');
const { broadcastBookingUpdated } = require('../realtime/bookingRealtime');

const orchestrator = new AntigravityOrchestrator({
  apiKey: process.env.ANTIGRAVITY_KEY || 'demo-key'
});

router.use(requireAuth);

// ═══════════════════════════════════════════════════════════════
// POST /api/service-request
// Runs the full 8-agent agentic pipeline (now includes LLM ranker + pricing)
// ═══════════════════════════════════════════════════════════════
router.post('/service-request', async (req, res) => {
  try {
    const { user_text, user_id, user_location, location_source, city } = req.body;

    if (!user_text || typeof user_text !== 'string') {
      return res.status(400).json({ success: false, error: 'user_text is required and must be a string' });
    }

    const result = await orchestrator.run({
      input: {
        user_text,
        user_id: user_id || `user_${Date.now()}`,
        city: city || null,
        user_location: user_location || null,
        location_source: location_source || null
      },
      options: { emit_trace: true, timeout_ms: 15000, retry_on_failure: true, fallback_mode: 'graceful' }
    });

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

    if (result.status === 'no_providers') {
      return res.status(200).json({
        success: false,
        error_type: 'no_providers',
        parsed_intent: result.output.parsed_intent,
        message: 'No providers found in your area. Try a different location or service.',
        execution_logs: result.execution_logs
      });
    }

    return res.status(200).json({
      success: true,
      booking_id: result.output.booking_id,
      provider: result.output.provider,
      reasoning: result.output.reasoning,
      reasoning_log: result.output.reasoning_log,
      confirmation_message: result.output.confirmation_message,
      alternatives: result.output.alternatives,
      parsed_intent: result.output.parsed_intent,
      scheduled_time: result.output.scheduled_time || result.output.booking_start_time || null,
      booking_start_time: result.output.scheduled_time || result.output.booking_start_time || null,
      reminders_scheduled: result.output.reminders_scheduled,
      quote_pkr: result.output.quote_pkr,
      quote_breakdown: result.output.quote_breakdown,
      execution_logs: result.execution_logs,
      workflow_id: result.workflow_id,
      duration_ms: result.duration_ms
    });

  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({ success: false, error: 'Internal pipeline error', message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/chaos/simulate
// Stress-test: simulate provider cancellation → re-rank → re-book
// Body: { booking_id?, provider_id_to_cancel?, providers?, urgency_level?, price_sensitivity? }
// ═══════════════════════════════════════════════════════════════
router.post('/chaos/simulate', async (req, res) => {
  try {
    const {
      booking_id,
      provider_id_to_cancel,
      provider_id,
      providers,
      urgency_level,
      price_sensitivity,
      service_type,
      location
    } = req.body;

    // If booking_id provided, try to reconstruct providers from booking store
    let providerList = providers || [];
    let cancelId = provider_id_to_cancel || provider_id;

    if (booking_id && providerList.length === 0) {
      const booking = BookingExecutorAgent.getBooking(booking_id);
      if (!booking) {
        return res.status(404).json({ success: false, error: `Booking ${booking_id} not found. Pass providers[] directly for demo mode.` });
      }
      cancelId = cancelId || booking.provider_id;
    }

    if (providerList.length < 2) {
      // Load demo providers from DB as fallback
      const db = require('../db');
      const dbProviders = await db.findProvidersByService(service_type || 'Electrician');
      providerList = dbProviders.slice(0, 5);
    }

    if (providerList.length < 2) {
      return res.status(400).json({ success: false, error: 'Need at least 2 providers to simulate chaos. Pass providers[] in request body.' });
    }

    const result = await orchestrator.runChaosSimulation({
      input: {
        providers: providerList,
        chaos_cancel_provider_id: cancelId || providerList[0]?.id,
        urgency_level: urgency_level || 'normal',
        price_sensitivity: price_sensitivity || 'neutral',
        service_type: service_type || providerList[0]?.service || 'service',
        location: location || providerList[0]?.area || 'requested area'
      },
      options: { emit_trace: true }
    });

    return res.status(200).json({
      success: true,
      chaos_event: 'provider_cancellation',
      cancelled_provider: result.cancelled_provider,
      new_provider: result.new_provider,
      reasoning_log: result.reasoning_log,
      new_quote_pkr: result.new_quote_pkr,
      new_quote_breakdown: result.new_quote_breakdown,
      // Backward-compatible aliases for older mobile builds.
      quote_pkr: result.new_quote_pkr,
      quote_breakdown: result.new_quote_breakdown,
      recovery_time_ms: result.duration_ms,
      workflow_id: result.workflow_id,
      execution_logs: result.execution_logs
    });

  } catch (error) {
    console.error('Chaos simulation error:', error);
    res.status(500).json({ success: false, error: 'Chaos simulation failed', message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/chat/message
// ═══════════════════════════════════════════════════════════════
router.post('/chat/message', async (req, res) => {
  try {
    const { booking_id, message, user_id, provider } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const db = require('../db');
    const isGeneralChat = !booking_id || booking_id === 'general' || booking_id === 'general_assistant';
    let bookingInfo = null;

    if (!isGeneralChat && booking_id) {
      const mongoBooking = await db.getBookingById(booking_id);
      const booking = mongoBooking || BookingExecutorAgent.getBooking(booking_id);
      
      if (booking && String(booking.status || '').toLowerCase() === 'canceled') {
        return res.json({
          success: true,
          reply: 'The order is cancelled by you so I cant help further more! Sorry',
          booking_status: 'canceled',
          execution_logs: [],
        });
      }
      
      bookingInfo = booking;
    }

    const formatBookingDetail = (booking) => {
      const orderId = booking?._id || booking?.booking_id || booking?.id || 'N/A';
      let appointmentTime = 'Pending';
      const rawTime = booking?.booking_start_time || booking?.scheduled_time || booking?.time_slot;
      if (rawTime) {
        const date = new Date(rawTime);
        if (!isNaN(date.getTime())) {
          appointmentTime = date.toLocaleString('en-PK');
        } else {
          appointmentTime = rawTime;
        }
      }

      return {
        orderId,
        providerName: booking?.provider_name || 'N/A',
        serviceType: booking?.service_type || 'N/A',
        location: [booking?.area, booking?.city, booking?.location].filter(Boolean).join(', ') || 'N/A',
        appointmentTime,
        quoteText: booking?.quote_pkr ? `PKR ${Math.round(booking.quote_pkr).toLocaleString('en-PK')}` : 'Pending',
        status: (booking?.status || 'unknown').toUpperCase(),
      };
    };

    const buildProviderReply = async (booking, text) => {
      const info = formatBookingDetail(booking);
      const llm = new (require('../llm/LLMClient'))();
      
      // Build a contextual system prompt that makes the LLM act as the provider
      const systemPrompt = [
        `You are ${info.providerName}, a professional service provider responding to a customer message.`,
        `You have a booking with the following details:`,
        `- Service: ${info.serviceType}`,
        `- Location: ${info.location}`,
        `- Appointment Time: ${info.appointmentTime}`,
        `- Quote: ${info.quoteText}`,
        `- Order ID: ${info.orderId}`,
        ``,
        `Respond naturally as the provider would, answering their question directly.`,
        `Keep your response concise (2-3 sentences max).`,
        `If they ask about the booking details, reference them confidently.`,
        `Be professional, friendly, and helpful.`
      ].join('\n');
      
      try {
        const reply = await llm.complete({
          system: systemPrompt,
          user: text,
          temperature: 0.7,
          maxTokens: 150,
        });
        return reply.trim();
      } catch (err) {
        console.warn('[Provider Reply] LLM unavailable, using fallback:', err.message);
        // Fallback: simple contextual response
        return `Hi, I'm ${info.providerName}. I received your message about the ${info.serviceType} booking scheduled for ${info.appointmentTime} in ${info.location}. I'll help you with any questions you have.`;
      }
    };

    // ═══════════════════════════════════════════════════════════════
    // GENERAL ASAANIYAT AI CHAT HANDLER
    // ═══════════════════════════════════════════════════════════════
    if (isGeneralChat) {
      const lowerMessage = message.toLowerCase();
      
      // Detect if user is asking about their order
      const isAskingAboutOrder = 
        lowerMessage.includes('order') || 
        lowerMessage.includes('booking') || 
        lowerMessage.includes('my booking') ||
        lowerMessage.includes('my order') ||
        lowerMessage.includes('services') ||
        lowerMessage.includes('service') ||
        lowerMessage.includes('appointment') ||
        lowerMessage.includes('status');

      // Detect if asking about how the app works
      const isAskingHowWorks = 
        lowerMessage.includes('how do we work') ||
        lowerMessage.includes('how does this work') ||
        lowerMessage.includes('how does this application work') ||
        lowerMessage.includes('how it works') ||
        lowerMessage.includes('flow') ||
        lowerMessage.includes('what is asaaniyat') ||
        lowerMessage.includes('who are you');

      // Detect if asking to cancel
      const isAskingCancel =
        lowerMessage.includes('cancel') ||
        lowerMessage.includes('want to cancel');

      // Save user message
      await db.saveChatMessage({
        booking_id: 'general',
        user_id: user_id || req.auth.sub,
        role: 'user',
        content: message,
        token_count: message.split(/\s+/).filter(Boolean).length,
        metadata: { source: 'general_chat' },
      });

      let reply = '';
      let requiresBookingSelection = false;

      if (isAskingAboutOrder && !isAskingHowWorks) {
        // User is asking about their order/booking
        reply = '📦 To help you with your order, please select which booking you\'d like to know about:';
        requiresBookingSelection = true;
      } else if (isAskingCancel) {
        // User wants to cancel
        reply = '❌ To cancel a booking, please:\n\n1. Go to the "Bookings" tab\n2. Find the booking you want to cancel\n3. Tap "Cancel" button to proceed with cancellation\n\nWould you like help with anything else?';
      } else if (isAskingHowWorks) {
        // Explain how Asaaniyat works
        reply = `🚀 **How Asaaniyat Works:**\n\n1. **Request Service**: Describe what you need (plumbing, electrician, etc.)\n2. **Get Providers**: We match you with verified providers in your area\n3. **Book Appointment**: Confirm date, time, and payment\n4. **Service Delivery**: Provider arrives and completes the service\n5. **Rate & Review**: Share your experience\n\n💬 You can also chat with your provider directly before or after booking!\n\nWhat service do you need help with?`;
      } else {
        // General chat
        reply = `👋 I'm Asaaniyat, your personal home service assistant. I can help you:\n\n✅ Find service providers\n✅ Track your bookings\n✅ Chat with your providers\n✅ Answer questions about your orders\n\nWhat can I help you with today?`;
      }

      // Save assistant message
      await db.saveChatMessage({
        booking_id: 'general',
        user_id: user_id || req.auth.sub,
        role: 'assistant',
        content: reply,
        token_count: reply.split(/\s+/).filter(Boolean).length,
        metadata: { source: 'general_chat', requires_booking_selection: requiresBookingSelection },
      });

      return res.json({
        success: true,
        reply,
        requires_booking_selection: requiresBookingSelection,
        chat_mode: 'general',
        execution_logs: [],
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // BOOKING-SPECIFIC CHAT HANDLER
    // ═══════════════════════════════════════════════════════════════
    if (bookingInfo) {
      const reply = String(bookingInfo.status || '').toLowerCase() === 'canceled'
        ? 'The order is cancelled by you so I cant help further more! Sorry'
        : await buildProviderReply(bookingInfo, message);

      await db.saveChatMessage({
        booking_id: booking_id || bookingInfo._id || 'general',
        user_id: user_id || req.auth.sub,
        role: 'user',
        content: message,
        token_count: message.split(/\s+/).filter(Boolean).length,
        metadata: { source: 'provider_chat' },
      });

      // Notify the provider about the new user message
      try {
        const mongoDb = await db.getDb();
        if (bookingInfo.provider_id) {
          // Resolve provider ID to provider_users ID
          const provDoc = await mongoDb.collection(db.COLLECTIONS.providers).findOne({ 
            $or: [{ id: bookingInfo.provider_id }, { _id: bookingInfo.provider_id }] 
          });
          if (provDoc) {
            const provUser = await mongoDb.collection('providers_users').findOne({
              $or: [{ provider_id: provDoc._id }, { provider_id: String(provDoc._id) }]
            });
            if (provUser) {
              await sendPushNotification(
                provUser._id,
                'New Message from Customer',
                message,
                { booking_id: booking_id || bookingInfo._id, type: 'chat' }
              );
            }
          }
        }
      } catch (err) {
        console.warn('[ServiceRoutes] Failed to notify provider:', err.message);
      }

      await db.saveChatMessage({
        booking_id: booking_id || bookingInfo._id || 'general',
        user_id: user_id || req.auth.sub,
        role: 'assistant',
        content: reply,
        token_count: reply.split(/\s+/).filter(Boolean).length,
        metadata: { source: 'provider_chat', provider_mode: true },
      });

      return res.json({
        success: true,
        reply,
        booking_status: bookingInfo.status,
        chat_mode: 'provider',
        execution_logs: [],
      });
    }

    // Check if message is asking about status or order info
    const lowerMessage = message.toLowerCase();
    const isAskingStatus = lowerMessage.includes('status') || lowerMessage.includes('where') || lowerMessage.includes('progress') || lowerMessage.includes('update');
    const isAskingInfo = lowerMessage.includes('info') || lowerMessage.includes('details') || lowerMessage.includes('booking');

    if ((isAskingStatus || isAskingInfo) && bookingInfo) {
      const details = formatBookingDetail(bookingInfo);
      const statusText = `Here are the details of your order:\n\n📦 Order ID: ${details.orderId}\n👨‍🔧 Provider: ${details.providerName}\n🔧 Service: ${details.serviceType}\n📍 Location: ${details.location}\n🗓️ Appointment: ${details.appointmentTime}\n💰 Quote: ${details.quoteText}\n📊 Status: ${details.status}\n\nHow can I help you further?`;

      await db.saveChatMessage({
        booking_id: booking_id || bookingInfo._id || 'general',
        user_id: user_id || req.auth.sub,
        role: 'user',
        content: message,
        token_count: message.split(/\s+/).filter(Boolean).length,
        metadata: { source: 'status_lookup' },
      });

      await db.saveChatMessage({
        booking_id: booking_id || bookingInfo._id || 'general',
        user_id: user_id || req.auth.sub,
        role: 'assistant',
        content: statusText,
        token_count: statusText.split(/\s+/).filter(Boolean).length,
        metadata: { source: 'status_lookup' },
      });

      return res.json({
        success: true,
        reply: statusText,
        booking_status: bookingInfo.status,
        execution_logs: [],
      });
    }

    // For other messages, run the full conversation pipeline
    const resolvedUserId = user_id || req.auth.sub;
    const userBookings = await db.getUserBookings(resolvedUserId);
    const result = await orchestrator.runConversation({
      input: { 
        booking_id, 
        message, 
        user_id: resolvedUserId, 
        provider: provider || bookingInfo || {},
        user_bookings: userBookings
      },
      options: { emit_trace: true }
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Chat message error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/chat/threads
router.get('/chat/threads', async (req, res) => {
  try {
    const db = require('../db');
    const threads = await db.getChatThreads(req.auth.sub);
    return res.json({ success: true, threads });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/chat/:booking_id
router.get('/chat/:booking_id', async (req, res) => {
  try {
    const db = require('../db');
    const messages = await db.getChatMessages(req.params.booking_id, 80, req.auth.sub);
    return res.json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rag/ingest
router.post('/rag/ingest', async (req, res) => {
  try {
    const { source, content, metadata } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'content is required' });
    }
    const { ingestText } = require('../rag/retriever');
    const chunks = await ingestText({ source, content, metadata });
    return res.json({ success: true, chunks_ingested: chunks.length, chunks });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rag/query
router.post('/rag/query', async (req, res) => {
  try {
    const { query, top_k, token_budget } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'query is required' });
    }
    const { retrieve } = require('../rag/retriever');
    const chunks = await retrieve(query, { topK: top_k || 4, tokenBudget: token_budget || 450 });
    return res.json({ success: true, chunks });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/booking/confirm
router.post('/booking/confirm', async (req, res) => {
  try {
    const { booking_id, user_confirmed } = req.body;
    if (!booking_id) return res.status(400).json({ success: false, error: 'booking_id is required' });

    const booking = BookingExecutorAgent.getBooking(booking_id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    if (user_confirmed) {
      BookingExecutorAgent.updateBooking(booking_id, { status: 'confirmed' });
      const notifications = FollowUpManagerAgent.getNotifications(booking_id);
      return res.json({ success: true, status: 'confirmed', reminders_scheduled: notifications.length });
    } else {
      BookingExecutorAgent.updateBooking(booking_id, { status: 'cancelled' });
      return res.json({ success: true, status: 'cancelled' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/booking/:booking_id
router.get('/booking/:booking_id', async (req, res) => {
  try {
    const booking = BookingExecutorAgent.getBooking(req.params.booking_id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
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
      reminders: notifications.map(n => ({ time: n.scheduled_time, type: n.type, status: n.status }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/booking/:booking_id/feedback
router.post('/booking/:booking_id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookingId = req.params.booking_id;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be 1–5' });
    }
    const booking = BookingExecutorAgent.getBooking(bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    const feedbackId = `FB_${Date.now()}`;
    BookingExecutorAgent.updateBooking(bookingId, {
      feedback: { rating, comment: comment || '', feedback_id: feedbackId, created_at: new Date().toISOString() }
    });
    return res.json({ success: true, feedback_id: feedbackId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs
router.get('/logs', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const { LOGS_ROOT } = require('../traceLogger');
  const logsDir = LOGS_ROOT;
  try {
    if (!fs.existsSync(logsDir)) return res.json([]);
    const runDirs = fs.readdirSync(logsDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
    const logs = runDirs.flatMap(dir => {
      const runPath = path.join(logsDir, dir.name);
      return fs.readdirSync(runPath)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const data = JSON.parse(fs.readFileSync(path.join(runPath, file), 'utf8'));
          return { file: path.join(dir.name, file), ...data };
        });
    });
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// BOOKING MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /api/bookings
// Create a new booking (with duplicate prevention)
router.post('/bookings', async (req, res) => {
  try {
    const db = require('../db');
    const { sub: user_id } = req.auth;
    const { provider_id, provider_name, service_type, location, city, area, booking_start_time, scheduled_time, quote_pkr, status, raw_data } = req.body;

    const resolvedBookingStartTime = booking_start_time || scheduled_time || raw_data?.scheduled_time || raw_data?.booking_start_time || null;

    // Validate required fields
    if (!provider_id || !provider_name || !service_type) {
      return res.status(400).json({ success: false, error: 'provider_id, provider_name, and service_type are required' });
    }

    // Check for duplicate booking (same provider, same time, active status)
    if (resolvedBookingStartTime) {
      const duplicate = await db.checkDuplicateBooking(user_id, provider_id, resolvedBookingStartTime);
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: 'duplicate_booking',
          message: `You already have a ${duplicate.status} booking with this provider at this time`,
          existing_booking: duplicate
        });
      }
    }

    // Create the booking
    const booking = await db.createBooking({
      user_id,
      provider_id,
      provider_name,
      service_type,
      location,
      city,
      area,
      booking_start_time: resolvedBookingStartTime,
      quote_pkr,
      status: status || 'confirmed',
      raw_data
    });

    // Dispatch confirmation push notification
    let formattedTime = 'the scheduled time';
    try {
      if (resolvedBookingStartTime) {
        formattedTime = new Date(resolvedBookingStartTime).toLocaleString('en-PK');
      }
    } catch (_) {}

    await sendPushNotification(
      user_id,
      'Booking Confirmed! 🎉',
      `Your ${service_type} booking with ${provider_name} is confirmed for ${formattedTime}.`,
      { booking_id: booking._id, status: booking.status }
    );

    return res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create booking', message: error.message });
  }
});

// GET /api/bookings
// Get all bookings for the current user
router.get('/bookings', async (req, res) => {
  try {
    const db = require('../db');
    const { sub: user_id } = req.auth;

    const bookings = await db.getUserBookings(user_id);
    return res.json({ success: true, bookings, count: bookings.length });
  } catch (error) {
    console.error('Booking retrieval error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve bookings', message: error.message });
  }
});

// GET /api/bookings/:booking_id
// Get a specific booking
router.get('/bookings/:booking_id', async (req, res) => {
  try {
    const db = require('../db');
    const booking = await db.getBookingById(req.params.booking_id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Verify user owns this booking
    if (booking.user_id !== req.auth.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    return res.json({ success: true, booking });
  } catch (error) {
    console.error('Booking retrieval error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve booking', message: error.message });
  }
});

// PUT /api/bookings/:booking_id
// Update booking status
router.put('/bookings/:booking_id', async (req, res) => {
  try {
    const db = require('../db');
    const { status } = req.body;

    if (!status || !['confirmed', 'canceled', 'Operating', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Must be: confirmed, canceled, Operating, or Completed' });
    }

    const booking = await db.getBookingById(req.params.booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Verify user owns this booking
    if (booking.user_id !== req.auth.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const updatedBooking = await db.updateBookingStatus(req.params.booking_id, status);

    broadcastBookingUpdated(updatedBooking, 'user');

    // Dispatch push notification about booking update
    await sendPushNotification(
      booking.user_id,
      'Booking Update 🛠️',
      `Your booking status with ${booking.provider_name} has been updated to "${status}".`,
      { booking_id: req.params.booking_id, status }
    );

    return res.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error('Booking update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update booking', message: error.message });
  }
});

// DELETE /api/bookings/:booking_id
// Cancel a booking
router.delete('/bookings/:booking_id', async (req, res) => {
  try {
    const db = require('../db');
    const booking = await db.getBookingById(req.params.booking_id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Verify user owns this booking
    if (booking.user_id !== req.auth.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const cancelledBooking = await db.cancelBooking(req.params.booking_id);

    broadcastBookingUpdated(cancelledBooking, 'user');

    // Dispatch push notification about cancellation
    await sendPushNotification(
      booking.user_id,
      'Booking Cancelled ❌',
      `Your booking with ${booking.provider_name} has been successfully cancelled.`,
      { booking_id: req.params.booking_id, status: 'canceled' }
    );

    return res.json({ success: true, message: 'Booking cancelled', booking: cancelledBooking });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel booking', message: error.message });
  }
});

module.exports = router;
