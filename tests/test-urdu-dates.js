/**
 * Test Urdu and Roman Urdu date parsing
 * Run with: node test-urdu-dates.js
 */

const { parseDateTime } = require('./backend/utils/dateTimeParser');

console.log('=== Urdu/Roman Urdu Date Parsing Tests ===\n');

const testCases = [
  // English tests
  { input: 'tomorrow at 2 pm', expected: 'May 19 at 14:00' },
  { input: 'day after tomorrow at 10 am', expected: 'May 20 at 10:00' },
  
  // Roman Urdu tests
  { input: 'kal at 2 pm', expected: 'May 19 at 14:00 (tomorrow)' },
  { input: 'parso at 3 pm', expected: 'May 20 at 15:00 (day after tomorrow)' },
  { input: 'kal morning', expected: 'May 19 at 9:00 AM' },
  { input: 'parso evening', expected: 'May 20 at 6:00 PM' },
  { input: 'aaj at 5 pm', expected: 'May 18 at 17:00 (today)' },
  
  // Mixed English-Urdu
  { input: 'i need plumber kal at 2 pm', expected: 'May 19 at 14:00' },
  { input: 'book electrician parso subah', expected: 'May 20 at 9:00 AM' },
];

testCases.forEach((test, i) => {
  const result = parseDateTime(test.input);
  console.log(`${i + 1}. "${test.input}"`);
  console.log(`   Expected: ${test.expected}`);
  if (result) {
    console.log(`   ✓ Got: ${result.dateLabel} at ${result.timeIn12H}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  } else {
    console.log('   ✗ Could not parse (returned null!)');
  }
  console.log('');
});
