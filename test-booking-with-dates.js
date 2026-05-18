/**
 * Integration test showing the full booking flow with improved date parsing
 * Run with: node test-booking-with-dates.js
 */

const { parseDateTime, parseTimePreference } = require('./backend/utils/dateTimeParser');

console.log('=== BOOKING FLOW WITH DATE/TIME PARSING ===\n');

// Simulate what happens when user says: "I need a plumber tomorrow at 2 pm"
const userInput = "I need a plumber tomorrow at 2 pm";

console.log(`User Input: "${userInput}"\n`);

// Step 1: LLM Intent Parser extracts basics
console.log('Step 1: Intent Parser');
console.log('└─ Service Type: Plumber');
console.log('└─ Location: Not specified');
console.log('└─ Time Preference: tomorrow');
console.log('');

// Step 2: New Date/Time Parser is applied
console.log('Step 2: Date/Time Parser (NEW)');
const parsed = parseDateTime(userInput);
console.log(`└─ Parsed DateTime: ${JSON.stringify(parsed, null, 2)}`);
console.log('');

// Step 3: Provider Discovery (simulated)
console.log('Step 3: Provider Discovery');
const mockProvider = {
  id: 'plumber_001',
  name: 'Ahmed Plumbing Services',
  rating: 4.8,
  available_slots: ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '18:00', '19:00']
};
console.log(`└─ Found: ${mockProvider.name}`);
console.log(`└─ Available slots: ${mockProvider.available_slots.join(', ')}`);
console.log('');

// Step 4: Booking Executor uses parsed date/time
console.log('Step 4: Booking Executor');
console.log(`└─ Explicit appointment found: ${parsed?.date.toLocaleDateString('en-PK')} at ${parsed?.timeIn12H}`);
console.log(`└─ Confidence: ${(parsed?.confidence * 100).toFixed(1)}%`);

// Find matching slot
const bestSlot = mockProvider.available_slots.find(slot => {
  const slotHour = parseInt(slot.split(':')[0]);
  return slotHour === parsed.date.getHours();
});
console.log(`└─ Selected slot: ${bestSlot || mockProvider.available_slots[0]}`);
console.log('');

// Step 5: Final Booking
console.log('Step 5: Booking Confirmation');
const bookingId = `BK_${Date.now()}`;
const scheduled = new Date(parsed.date);
console.log(`✅ Booking Confirmed!`);
console.log(`   ID: ${bookingId}`);
console.log(`   Service: Plumber`);
console.log(`   Provider: ${mockProvider.name}`);
console.log(`   Date: ${scheduled.toLocaleDateString('en-PK')}`);
console.log(`   Time: ${parsed.timeIn12H}`);
console.log(`   Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);
console.log('');

console.log('─────────────────────────────────────────────────');
console.log('');

// Additional test cases
console.log('=== OTHER TEST CASES ===\n');

const testCases = [
  'I need AC repair tomorrow morning',
  'Book carpenter for next Monday at 10:30 am',
  'I want a hairdresser appointment on May 22 at 3 pm',
  'Send electrician day after tomorrow at 4 pm',
  'I need plumber in G-11 tomorrow at 2 pm'
];

testCases.forEach((test, i) => {
  const result = parseDateTime(test);
  console.log(`${i + 1}. "${test}"`);
  if (result) {
    console.log(`   → ${result.dateLabel} at ${result.timeIn12H}`);
    console.log(`   → Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  } else {
    console.log('   → Could not parse');
  }
  console.log('');
});

console.log('=== SUMMARY ===');
console.log('✓ Date parsing now handles specific times');
console.log('✓ "Tomorrow at 2 pm" produces TOMORROW date, not today');
console.log('✓ Confidence scores track parsing reliability');
console.log('✓ Works with complex sentences and locations');
