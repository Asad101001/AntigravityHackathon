/**
 * Agent 6: BookingExecutorAgent
 * Prepares a booking proposal only. The real booking is created after the user
 * explicitly confirms on the checkout screen.
 */

const BaseAgent = require('./BaseAgent');
const { resolveBookingDateTime, parseTimePreference } = require('../utils/dateTimeParser');
const { STATUS } = require('../utils/bookingStatus');

function formatSlotFromHourString(hourString) {
  const [hourPart, minutePart = '00'] = String(hourString || '').split(':');
  const hours24 = Number(hourPart);
  if (!Number.isFinite(hours24)) return null;
  const minutes = Number(minutePart || 0);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function selectSlot(provider, timePref, resolvedDateTime) {
  if (resolvedDateTime?.timeIn12H) return resolvedDateTime.timeIn12H;
  if (resolvedDateTime?.timeLabel) return resolvedDateTime.timeLabel;

  const slots = provider?.available_slots || [];
  const parsedPreference = parseTimePreference(timePref || '');
  const slotName = parsedPreference?.slot;
  if (slotName === 'morning') {
    const slot = slots.find((s) => parseInt(s, 10) >= 8 && parseInt(s, 10) <= 12);
    if (slot) return formatSlotFromHourString(slot) || slot;
  }
  if (slotName === 'afternoon') {
    const slot = slots.find((s) => parseInt(s, 10) >= 12 && parseInt(s, 10) <= 17);
    if (slot) return formatSlotFromHourString(slot) || slot;
  }
  if (slotName === 'evening') {
    const slot = slots.find((s) => parseInt(s, 10) >= 17 && parseInt(s, 10) <= 21);
    if (slot) return formatSlotFromHourString(slot) || slot;
  }
  if (slots.length) return formatSlotFromHourString(slots[0]) || slots[0];
  return null;
}

class BookingExecutorAgent extends BaseAgent {
  constructor() {
    super('prepare_booking_request', 6);
  }

  async execute(context) {
    const provider = context.selected_provider;
    if (!provider) {
      return {
        input: { provider: null },
        output: { booking_id: null, error: 'No provider selected' },
        reasoning: 'Cannot prepare booking request — no provider was selected.',
        contextUpdates: { booking_id: null, booking_status: 'no_provider' },
      };
    }

    const resolvedDateTime = context.requested_datetime?.scheduled_start_iso
      ? context.requested_datetime
      : resolveBookingDateTime({ text: context.user_text || '', timePreference: context.time_preference || '' });

    const selectedSlot = selectSlot(provider, context.time_preference, resolvedDateTime);
    if (!selectedSlot) {
      return {
        input: { provider: provider.name, time_preference: context.time_preference },
        output: { booking_id: null, error: 'No available slots' },
        reasoning: `${provider.name} has no available slots matching the requested time.`,
        contextUpdates: { booking_id: null, booking_status: 'no_slots' },
      };
    }

    const scheduledIso = resolvedDateTime?.scheduled_start_iso || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const proposalId = `REQ_${Date.now()}`;
    const bookingProposal = {
      booking_id: proposalId,
      user_id: context.user_id || 'anonymous',
      provider_id: provider.id,
      provider_name: provider.name,
      provider_phone: provider.phone,
      service_type: context.service_type,
      location: context.resolved_area || context.location,
      scheduled_time: scheduledIso,
      booking_start_time: scheduledIso,
      time_slot: selectedSlot,
      status: 'proposal',
      final_status_after_user_confirmation: STATUS.PENDING_PROVIDER,
      created_at: new Date().toISOString(),
      booking_date_confidence: resolvedDateTime?.confidence || 0.5,
      timezone: resolvedDateTime?.timezone || 'Asia/Karachi',
      needs_time_clarification: Boolean(resolvedDateTime?.needs_clarification),
    };

    const confirmationMsg = `Provider match ready. If you approve, we will send the request to ${provider.name} for accept/reject.`;

    return {
      input: { provider: provider.name, time_slot: selectedSlot },
      output: {
        booking_id: proposalId,
        confirmation_message: confirmationMsg,
        scheduled_time: scheduledIso,
        booking_start_time: scheduledIso,
        time_slot: selectedSlot,
        booking_status: 'proposal',
      },
      reasoning: `Prepared provider request proposal. Slot "${selectedSlot}" selected; no provider notification is sent until user confirms.`,
      contextUpdates: {
        booking_id: proposalId,
        booking: bookingProposal,
        booking_proposal: bookingProposal,
        confirmation_message: confirmationMsg,
        booking_status: 'proposal',
        scheduled_time: scheduledIso,
        booking_start_time: scheduledIso,
      },
    };
  }
}

module.exports = BookingExecutorAgent;
