/**
 * FINAL INTEGRATION TEST - Simulates complete booking flow
 * Tests the exact scenario: User says "MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED"
 * Should result in booking for tomorrow (May 19) at 9:00 AM
 */

const { parseDateTime, parseTimePreference } = require('../backend/utils/dateTimeParser');

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║   FINAL INTEGRATION TEST - Complete Booking Flow Simulation       ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

// Simulate user's exact input
const userInput = "MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED";
console.log(`📱 User Input: "${userInput}"\n`);

// Step 1: Parse with our enhanced parser
console.log('Step 1: Parse with parseDateTime()');
const parsed = parseDateTime(userInput);

if (!parsed) {
  console.log('❌ FAILED - Parser returned null');
  process.exit(1);
}

console.log(`✅ Success`);
console.log(`   Date: ${parsed.dateLabel}`);
console.log(`   Time: ${parsed.timeIn12H}`);
console.log(`   Confidence: ${(parsed.confidence * 100).toFixed(0)}%\n`);

// Step 2: Validate the date is tomorrow
console.log('Step 2: Validate booking date is TOMORROW (May 19)');
const today = new Date(2026, 4, 18); // May 18
const tomorrow = new Date(2026, 4, 19); // May 19

const isTomorrow = parsed.date.toDateString() === tomorrow.toDateString();

if (isTomorrow) {
  console.log(`✅ Correct - Booking is for May 19 (TOMORROW)\n`);
} else {
  console.log(`❌ FAILED - Booking is for ${parsed.date.toDateString()}`);
  console.log(`   Expected: ${tomorrow.toDateString()}`);
  process.exit(1);
}

// Step 3: Validate the time is 9:00 AM
console.log('Step 3: Validate booking time is 9:00 AM');
if (parsed.timeIn12H === '9:00 AM') {
  console.log(`✅ Correct - Time is 9:00 AM\n`);
} else {
  console.log(`❌ FAILED - Time is ${parsed.timeIn12H}, expected 9:00 AM`);
  process.exit(1);
}

// Step 4: Convert to UTC for database storage (like your booking JSON shows)
console.log('Step 4: Convert to UTC for storage');
const bookingDateTime = new Date(parsed.date);
const utcDateTime = bookingDateTime.toISOString();
console.log(`   Local (Pakistan): ${bookingDateTime.toString()}`);
console.log(`   UTC (ISO 8601):   ${utcDateTime}`);
console.log(`   ✅ Matches format in your booking\n`);

// Step 5: Simulate booking creation
console.log('Step 5: Simulate booking creation');
const booking = {
  _id: `BK_${Date.now()}_test`,
  user_id: 'USR_test',
  provider_id: 'PL277',
  provider_name: 'DHA Works Plumber Maryam',
  service_type: 'Plumber',
  location: 'Tariq Road Karachi',
  city: 'Karachi',
  area: 'DHA',
  booking_start_time: utcDateTime,  // The fixed date!
  quote_pkr: 3710,
  status: 'confirmed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  parsed_date_confidence: parsed.confidence
};

console.log('📋 Booking JSON:');
console.log(JSON.stringify(booking, null, 2));

// Step 6: Final validation
console.log('\n\nStep 6: Final Validation');
const correctDate = booking.booking_start_time.includes('2026-05-19');
const correctTime = booking.booking_start_time.includes('04:00') || booking.booking_start_time.includes('0400');

if (correctDate && correctTime) {
  console.log('✅ Booking date is CORRECT (May 19 at 4:00 AM UTC = 9:00 AM Pakistan time)');
} else {
  console.log(`❌ Booking date is wrong`);
  console.log(`   Expected: 2026-05-19T04:00`);
  console.log(`   Got:      ${booking.booking_start_time}`);
  process.exit(1);
}

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                   ✅ ALL TESTS PASSED!                            ║');
console.log('║                                                                   ║');
console.log('║  User Input:  "MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED"           ║');
console.log('║  Booking For: May 19, 2026 at 9:00 AM Pakistan Time              ║');
console.log('║  UTC:         2026-05-19T04:00:00.000Z                           ║');
console.log('║                                                                   ║');
console.log('║  The booking date issue is FIXED! 🎉                             ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
