// Regression test for booking_start_time precedence
// Ensures scheduled_time wins over booking_start_time when both exist

function pickBookingStartTime(fullResult, provider = {}) {
  const value =
    fullResult.scheduled_time ||
    fullResult.booking?.scheduled_time ||
    fullResult.booking_start_time ||
    provider.scheduled_time ||
    provider.confirmed_slot ||
    '';

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.getTime())) return directDate.toISOString();

  const timeMatch = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] || '0');
    const period = (timeMatch[3] || '').toUpperCase();

    let normalizedHours = hours;
    if (period === 'PM' && hours < 12) normalizedHours += 12;
    if (period === 'AM' && hours === 12) normalizedHours = 0;

    const date = new Date();
    date.setHours(normalizedHours, minutes, 0, 0);
    return date.toISOString();
  }

  return new Date().toISOString();
}

const fullResult = {
  scheduled_time: '2026-05-20T04:00:00.000Z',
  booking_start_time: '2026-05-19T04:00:00.000Z',
  booking: { scheduled_time: '2026-05-20T04:00:00.000Z' }
};

const bookingStartTime = pickBookingStartTime(fullResult, {});
console.log('picked:', bookingStartTime);
console.log('expected:', '2026-05-20T04:00:00.000Z');
console.log('pass:', bookingStartTime === '2026-05-20T04:00:00.000Z');
