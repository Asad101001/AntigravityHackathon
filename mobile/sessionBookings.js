const listeners = new Set();
const sessionBookings = [];

function emit() {
  const snapshot = getSessionBookings();
  listeners.forEach(listener => listener(snapshot));
}

export function addSessionBooking(fullResult = {}) {
  const provider = fullResult.provider || {};
  const booking = {
    id: fullResult.booking_id || `SESSION-${Date.now()}`,
    service: provider.service_type || provider.service || fullResult.parsed_intent?.service_type || 'Service',
    provider: provider.name || 'Provider pending',
    provider_phone: provider.phone || null,
    area: provider.area || fullResult.parsed_intent?.resolved_area || fullResult.parsed_intent?.location || 'Selected location',
    city: provider.city || fullResult.parsed_intent?.city || null,
    slot: provider.confirmed_slot || 'Today',
    quote_pkr: fullResult.quote_pkr || fullResult.total || null,
    rating: provider.rating || null,
    status: fullResult.booking?.status || fullResult.status || 'pending_provider_acceptance',
    stageIndex: 0,
    created_at: new Date().toISOString(),
    raw: fullResult,
  };

  const existingIndex = sessionBookings.findIndex(item => item.id === booking.id);
  if (existingIndex >= 0) {
    sessionBookings[existingIndex] = booking;
  } else {
    sessionBookings.unshift(booking);
  }
  emit();
  return booking;
}

export function getSessionBookings() {
  return sessionBookings.map(item => ({ ...item }));
}

export function getActiveBooking() {
  return getSessionBookings()[0] || null;
}

export function subscribeSessionBookings(listener) {
  listeners.add(listener);
  listener(getSessionBookings());
  return () => listeners.delete(listener);
}

export function updateSessionBookingStatus(id, newStatus, newStageIndex) {
  const existingIndex = sessionBookings.findIndex(item => item.id === id);
  if (existingIndex >= 0) {
    sessionBookings[existingIndex].status = newStatus;
    if (newStageIndex !== undefined) sessionBookings[existingIndex].stageIndex = newStageIndex;
    emit();
  }
}

