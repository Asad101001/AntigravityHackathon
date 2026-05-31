/**
 * Agent 6: BookingExecutorAgent
 * Creates booking in simulated Firestore, generates confirmation ID
 * Selects first available slot in requested time window
 */

const BaseAgent = require('./BaseAgent');
const { parseDateTime, parseTimePreference } = require('../utils/dateTimeParser');
const db = require('../db');

/**
 * Parse explicit appointment from user text with improved date/time parsing
 * Tries multiple approaches to find a complete date+time combination
 */
function parseExplicitAppointment(userText = '', timePref = '', appointmentText = '') {
  const sourceText = `${appointmentText || ''} ${userText || ''}`.trim();
  if (!sourceText) return null;

  // Try comprehensive date+time parsing first
  const parsed = parseDateTime(sourceText);
  if (parsed) {
    const slotLabel = parsed.timeIn12H;
    return {
      slotLabel,
      scheduledDate: parsed.date,
      confidence: parsed.confidence
    };
  }

  // Fallback: Try to parse time from user text and date from time preference
  // If time is found in userText but date might be in timePref
  const timePreferenceTime = parseTimePreference(timePref);
  if (timePreferenceTime && sourceText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)) {
    // Time was found in text, use it
    const timeMatch = sourceText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (timeMatch) {
      let hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] || '0');
      const period = timeMatch[3].toUpperCase();

      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      // Now handle the date from timePref (e.g., "tomorrow_morning")
      const now = new Date();
      let scheduledDate = new Date(now);

      if (/tomorrow/.test(timePref)) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      } else if (/\btoday/.test(timePref) || /tonight/.test(timePref)) {
        // Already set to today
      }

      scheduledDate.setHours(hours, minutes, 0, 0);
      const slotLabel = `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
      
      return {
        slotLabel,
        scheduledDate,
        confidence: 0.85
      };
    }
  }

  return null;
}

function formatSlotFromHourString(hourString) {
  const [hourPart, minutePart = '00'] = String(hourString || '').split(':');
  const hours24 = Number(hourPart);
  if (!Number.isFinite(hours24)) return null;
  const minutes = Number(minutePart);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

class BookingExecutorAgent extends BaseAgent {
  constructor() {
    super('execute_booking', 6);
  }

  async execute(context) {
    const provider = context.selected_provider;
    const userId = context.user_id || 'anonymous';
    const timePref = context.time_preference;
    const explicitAppointment = parseExplicitAppointment(
      context.user_text || '',
      timePref || '',
      context.requested_datetime_text || context.appointment_time_text || ''
    );

    if (!provider) {
      return {
        input: { provider: null },
        output: { booking_id: null, error: 'No provider selected' },
        reasoning: 'Cannot create booking — no provider was selected by DecisionMaker.',
        contextUpdates: { booking_id: null, booking_status: 'failed' }
      };
    }

    // ── Select Time Slot ──
    const slots = provider.available_slots || [];
    let selectedSlot = null;

    if (explicitAppointment?.slotLabel) {
      selectedSlot = explicitAppointment.slotLabel;
    }

    if (!selectedSlot && timePref && timePref.includes('morning')) {
      selectedSlot = slots.find(s => parseInt(s) >= 8 && parseInt(s) <= 12);
    } else if (!selectedSlot && timePref && timePref.includes('afternoon')) {
      selectedSlot = slots.find(s => parseInt(s) >= 12 && parseInt(s) <= 17);
    } else if (!selectedSlot && timePref && timePref.includes('evening')) {
      selectedSlot = slots.find(s => parseInt(s) >= 17 && parseInt(s) <= 21);
    }

    // Fallback: first available slot
    if (!selectedSlot && slots.length > 0) {
      const fallbackSlot = formatSlotFromHourString(slots[0]) || slots[0];
      selectedSlot = fallbackSlot;
    }

    if (!selectedSlot) {
      return {
        input: { provider: provider.name, time_preference: timePref },
        output: { booking_id: null, error: 'No available slots' },
        reasoning: `${provider.name} has no available slots matching "${timePref || 'any time'}". Suggest trying alternative provider.`,
        contextUpdates: { booking_id: null, booking_status: 'no_slots' }
      };
    }

    // ── Generate Booking ──
    const bookingId = `BK_${Date.now()}`;
    const now = new Date();
    
    // Calculate scheduled date - improved logic
    let scheduledDate = new Date(now);
    let dateConfidence = 0;

    // Strategy 1: Use explicit appointment if high confidence
    if (explicitAppointment?.scheduledDate && (explicitAppointment.confidence || 0) > 0.75) {
      scheduledDate = new Date(explicitAppointment.scheduledDate);
      dateConfidence = explicitAppointment.confidence;
    } else {
      // Strategy 2: Combine time preference (for date) with slot time (for time part)
      const timePreferenceResult = parseTimePreference(timePref);
      
      // Determine date from timePref
      let dateFromPref = new Date(now);
      if (timePref) {
        if (/tomorrow|kal(?!aam)|کل/i.test(timePref)) {
          dateFromPref.setDate(dateFromPref.getDate() + 1);
          dateConfidence = 0.9;
        } else if (/\btoday|aaj|آج|\btonight/i.test(timePref)) {
          // Keep as today
          dateConfidence = 0.9;
        } else if (/day after tomorrow|parso|parson|paron|پرسوں|tarso|tarson|taron|تارسو/i.test(timePref)) {
          dateFromPref.setDate(dateFromPref.getDate() + 2);
          dateConfidence = 0.85;
        } else if (/next week/i.test(timePref)) {
          dateFromPref.setDate(dateFromPref.getDate() + 7);
          dateConfidence = 0.75;
        } else if (/weekend/i.test(timePref)) {
          // Find next Saturday
          const currentDay = dateFromPref.getDay();
          let daysToAdd = 6 - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7;
          dateFromPref.setDate(dateFromPref.getDate() + daysToAdd);
          dateConfidence = 0.80;
        } else if (/morning|subah|subha|dopehir|afternoon|shaam|evening|raat|night|early|later/i.test(timePref)) {
          // Time period detected without specific date → default to TOMORROW
          // User specified a time period (morning/afternoon/evening/night/etc)
          // so they likely mean tomorrow at that time
          dateFromPref.setDate(dateFromPref.getDate() + 1);
          dateConfidence = 0.70;
        } else {
          // Completely unrecognized time_pref, default to TOMORROW (since booking future services)
          dateFromPref.setDate(dateFromPref.getDate() + 1);
          dateConfidence = 0.50;
        }
      } else {
        // No time preference provided, default to TOMORROW (not today)
        // since booking future services is the most common use case
        dateFromPref.setDate(dateFromPref.getDate() + 1);
        dateConfidence = 0.40; // Low confidence, but better than defaulting to today
      }

      scheduledDate = dateFromPref;
    }

    // Set time from slot
    const slotMatch = String(selectedSlot || '').match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (slotMatch) {
      let hours = Number(slotMatch[1]);
      const minutes = Number(slotMatch[2] || '0');
      const period = (slotMatch[3] || '').toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      scheduledDate.setHours(hours, minutes, 0, 0);
    } else if (/^\d{2}:\d{2}$/.test(String(selectedSlot || ''))) {
      const [hours, minutes] = String(selectedSlot).split(':').map(Number);
      scheduledDate.setHours(hours, minutes, 0, 0);
    }

    // DEBUG: Log scheduling decision before creating booking
    try {
      console.log('[BookingExecutor] DEBUG scheduling decision');
      console.log('  user_text:', context.user_text);
      console.log('  time_preference:', timePref);
      console.log('  explicitAppointment:', JSON.stringify(explicitAppointment || null));
      console.log('  selectedSlot:', selectedSlot);
      console.log('  scheduledDate (local):', scheduledDate.toString());
      console.log('  scheduledDate (iso):', scheduledDate.toISOString());
    } catch (e) {
      // ignore logging errors
    }

    const booking = {
      booking_id: bookingId,
      user_id: userId,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_phone: provider.phone,
      service_type: context.service_type,
      location: context.resolved_area || context.location,
      scheduled_time: scheduledDate.toISOString(),
      time_slot: selectedSlot,
      status: 'pending',
      created_at: now.toISOString(),
      reasoning: context.decision_reasoning || '',
      agent_trace: null, // Will be filled by orchestrator
      booking_date_confidence: dateConfidence // Track confidence in date parsing
    };

    // ── Real MongoDB Write ──
    let writeSuccess = false;
    let savedBooking = null;
    try {
      savedBooking = await db.createBooking({
        user_id: userId,
        provider_id: provider.id,
        provider_name: provider.name,
        service_type: context.service_type,
        location: context.resolved_area || context.location,
        city: context.city || '',
        area: context.resolved_area || context.location,
        booking_start_time: scheduledDate.toISOString(),
        quote_pkr: context.quote_pkr || 0,
        status: 'pending',
        raw_data: booking
      });
      writeSuccess = true;
      // Overwrite bookingId with real mongo ID for consistency
      if (savedBooking && savedBooking._id) {
        bookingId = savedBooking._id;
        booking.booking_id = bookingId;
      }
    } catch (err) {
      console.error(`[BookingExecutor] Write failed:`, err.message);
    }

    if (!writeSuccess) {
      return {
        input: { provider: provider.name },
        output: { booking_id: null, error: 'MongoDB write failed' },
        reasoning: 'Booking write failed. Could not save to database.',
        contextUpdates: { booking_id: null, booking_status: 'write_failed' }
      };
    }

    const confirmationMsg = `Job request sent! Waiting for ${provider.name} to accept. They are scheduled to arrive ${scheduledDate.toLocaleDateString('en-PK')} at ${selectedSlot}. ` +
      `Contact: ${provider.phone}. Booking ID: ${bookingId}`;

    return {
      input: { provider: provider.name, time_slot: selectedSlot },
      output: {
        booking_id: bookingId,
        confirmation_message: confirmationMsg,
        scheduled_time: scheduledDate.toISOString(),
        time_slot: selectedSlot
      },
      reasoning: `Booking created successfully. Slot "${selectedSlot}" selected (${timePref || 'first available'}). Written to MongoDB as ${bookingId}. Confirmation sent.`,
      contextUpdates: {
        booking_id: bookingId,
        booking: booking,
        confirmation_message: confirmationMsg,
        booking_status: 'pending'
      }
    };
  }
}

module.exports = BookingExecutorAgent;


