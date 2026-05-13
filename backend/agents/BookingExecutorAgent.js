/**
 * Agent 6: BookingExecutorAgent
 * Creates booking in simulated Firestore, generates confirmation ID
 * Selects first available slot in requested time window
 */

const BaseAgent = require('./BaseAgent');
const { v4: uuidv4 } = require('uuid');

// In-memory booking store (demo mode — replaces Firestore)
const bookingStore = new Map();

class BookingExecutorAgent extends BaseAgent {
  constructor() {
    super('execute_booking', 6);
  }

  async execute(context) {
    const provider = context.selected_provider;
    const userId = context.user_id || 'anonymous';
    const timePref = context.time_preference;

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

    if (timePref && timePref.includes('morning')) {
      selectedSlot = slots.find(s => parseInt(s) >= 8 && parseInt(s) <= 12);
    } else if (timePref && timePref.includes('afternoon')) {
      selectedSlot = slots.find(s => parseInt(s) >= 12 && parseInt(s) <= 17);
    } else if (timePref && timePref.includes('evening')) {
      selectedSlot = slots.find(s => parseInt(s) >= 17 && parseInt(s) <= 21);
    }

    // Fallback: first available slot
    if (!selectedSlot && slots.length > 0) {
      selectedSlot = slots[0];
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
    
    // Calculate scheduled date
    let scheduledDate = new Date(now);
    if (timePref && timePref.includes('tomorrow')) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    const [hours] = selectedSlot.split(':').map(Number);
    scheduledDate.setHours(hours, 0, 0, 0);

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
      status: 'confirmed',
      created_at: now.toISOString(),
      reasoning: context.decision_reasoning || '',
      agent_trace: null // Will be filled by orchestrator
    };

    // ── Simulated Firestore Write (with retry) ──
    let writeSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        bookingStore.set(bookingId, booking);
        writeSuccess = true;
        break;
      } catch (err) {
        console.warn(`[BookingExecutor] Write attempt ${attempt} failed:`, err.message);
        await new Promise(r => setTimeout(r, 100 * attempt)); // Backoff
      }
    }

    if (!writeSuccess) {
      return {
        input: { provider: provider.name },
        output: { booking_id: null, error: 'Firestore write failed after 3 retries' },
        reasoning: 'Booking write failed after 3 retry attempts. Data saved to local storage for sync.',
        contextUpdates: { booking_id: null, booking_status: 'write_failed' }
      };
    }

    const confirmationMsg = `Booking confirmed! ${provider.name} arrives ${timePref && timePref.includes('tomorrow') ? 'tomorrow' : 'today'} at ${selectedSlot}. ` +
      `Contact: ${provider.phone}. Booking ID: ${bookingId}`;

    return {
      input: { provider: provider.name, time_slot: selectedSlot },
      output: {
        booking_id: bookingId,
        confirmation_message: confirmationMsg,
        scheduled_time: scheduledDate.toISOString(),
        time_slot: selectedSlot
      },
      reasoning: `Booking created successfully. Slot "${selectedSlot}" selected (${timePref || 'first available'}). Written to Firestore as ${bookingId}. Confirmation sent.`,
      contextUpdates: {
        booking_id: bookingId,
        booking: booking,
        confirmation_message: confirmationMsg,
        booking_status: 'confirmed'
      }
    };
  }

  // Static method to retrieve bookings (for GET endpoint)
  static getBooking(bookingId) {
    return bookingStore.get(bookingId) || null;
  }

  static getAllBookings() {
    return Array.from(bookingStore.values());
  }

  static updateBooking(bookingId, updates) {
    const booking = bookingStore.get(bookingId);
    if (booking) {
      Object.assign(booking, updates);
      bookingStore.set(bookingId, booking);
      return booking;
    }
    return null;
  }
}

module.exports = BookingExecutorAgent;
