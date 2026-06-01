/**
 * REAL WORLD USER SCENARIOS - End-to-end verification
 * Demonstrates the fix working for actual user conversations
 * Run with: node test-real-scenarios.js
 */

const { parseDateTime, parseTimePreference } = require('../backend/utils/dateTimeParser');

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║           REAL-WORLD USER SCENARIOS - TESTING FIX                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const scenarios = [
  {
    title: '👨 User in English (Pakistan)',
    userInput: 'I need a plumber tomorrow at 2 pm',
    expectedDate: 'Tuesday, 19 May 2026',
    expectedTime: '2:00 PM'
  },
  {
    title: '👩 User in Urdu Roman (Pakistan Urban)',
    userInput: 'mujhe kal electrician chahiye 3 pm ko',
    expectedDate: 'Tuesday, 19 May 2026', 
    expectedTime: '3:00 PM'
  },
  {
    title: '🧑 User code-switching (Mix of Urdu and English)',
    userInput: 'book carpenter parso morning mujhe chahiye',
    expectedDate: 'Wednesday, 20 May 2026',
    expectedTime: '9:00 AM'
  },
  {
    title: '👴 Elder user (Simple Urdu)',
    userInput: 'kal subah plumber ko bulao',
    expectedDate: 'Tuesday, 19 May 2026',
    expectedTime: '9:00 AM'
  },
  {
    title: '📱 Mobile user (Quick text)',
    userInput: 'AC repair day after tomorrow 4pm',
    expectedDate: 'Wednesday, 20 May 2026',
    expectedTime: '4:00 PM'
  },
  {
    title: '🏢 Business user (Formal)',
    userInput: 'Request for hairdresser appointment on May 22 at 3 pm',
    expectedDate: 'Friday, 22 May 2026',
    expectedTime: '3:00 PM'
  },
  {
    title: '🚗 Traveler (with location)',
    userInput: 'I need electrician in Gulberg DHA tomorrow at evening',
    expectedDate: 'Tuesday, 19 May 2026',
    expectedTime: '6:00 PM'
  },
  {
    title: '⏰ Urgent user (ASAP with specific time)',
    userInput: 'Send mechanic ASAP already 2 hours, kal at 10am',
    expectedDate: 'Tuesday, 19 May 2026',
    expectedTime: '10:00 AM'
  },
];

let passed = 0;
let failed = 0;

scenarios.forEach((scenario, idx) => {
  console.log(`\n${scenario.title}`);
  console.log(`Input:  "${scenario.userInput}"`);
  
  const result = parseDateTime(scenario.userInput);
  
  if (!result) {
    console.log(`❌ FAILED: Parser returned null`);
    failed++;
    return;
  }
  
  const dateMatch = result.dateLabel.includes(scenario.expectedDate);
  const timeMatch = result.timeIn12H === scenario.expectedTime;
  
  if (dateMatch && timeMatch) {
    console.log(`✅ PASS`);
    console.log(`   Booking: ${result.dateLabel} at ${result.timeIn12H}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    passed++;
  } else {
    console.log(`❌ FAILED`);
    console.log(`   Expected: ${scenario.expectedDate} at ${scenario.expectedTime}`);
    console.log(`   Got:      ${result.dateLabel} at ${result.timeIn12H}`);
    failed++;
  }
});

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                          TEST SUMMARY                             ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log(`\nTotal Scenarios: ${scenarios.length}`);
console.log(`✅ Passed:       ${passed}`);
console.log(`❌ Failed:       ${failed}`);
console.log(`Success Rate:    ${((passed / scenarios.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 ALL REAL-WORLD SCENARIOS WORK! Users can book with any date format!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} scenario(s) failed.\n`);
  process.exit(1);
}
