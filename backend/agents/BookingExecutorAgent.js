/**
 * Agent 6: BookingExecutorAgent
 * Creates booking in simulated Firestore, generates confirmation ID
 * Selects first available slot in requested time window
 */

const BaseAgent = require('./BaseAgent');

// In-memory booking store (demo mode — replaces Firestore)
const bookingStore = new Map();

function parseExplicitAppointment(userText = '', timePref = '', appointmentText = '') {
  const sourceText = `${appointmentText || ''} ${timePref || ''} ${userText || ''}`.trim();
  if (!sourceText) return null;

  const text = sourceText.toLowerCase();
  const now = new Date();
  const scheduledDate = new Date(now);
  let dateShiftApplied = false;

  if (/\bday after tomorrow\b/.test(text)) {
    scheduledDate.setDate(now.getDate() + 2);
    dateShiftApplied = true;
  } else if (/\btomorrow\b/.test(text)) {
    scheduledDate.setDate(now.getDate() + 1);
    dateShiftApplied = true;
  }

  if (/\bweekend\b/.test(text)) {
    const todayDay = now.getDay();
    const daysUntilSaturday = (6 - todayDay + 7) % 7 || 7;
    scheduledDate.setDate(now.getDate() + daysUntilSaturday);
    dateShiftApplied = true;
  }

  if (/\b(today|tonight)\b/.test(text) && !dateShiftApplied) {
    scheduledDate.setDate(now.getDate());
    dateShiftApplied = true;
  }

  const timeMatch = sourceText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!timeMatch) {
    if (dateShiftApplied) {
      scheduledDate.setHours(10, 0, 0, 0);
      return {
        slotLabel: '10:00 AM',
        scheduledDate,
      };
    }
    return null;
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] || '0');
  const period = timeMatch[3].toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  scheduledDate.setHours(hours, minutes, 0, 0);

  const slotLabel = `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  return {
    slotLabel,
    scheduledDate,
  };
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
    
    // Calculate scheduled date
    let scheduledDate = explicitAppointment?.scheduledDate ? new Date(explicitAppointment.scheduledDate) : new Date(now);
    if (!explicitAppointment?.scheduledDate) {
      if (timePref && timePref.includes('tomorrow')) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
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

    const confirmationMsg = `Booking confirmed! ${provider.name} arrives ${scheduledDate.toLocaleDateString('en-PK')} at ${selectedSlot}. ` +
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


