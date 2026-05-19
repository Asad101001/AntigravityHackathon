/**
 * Simulate different time_preference scenarios to understand what breaks
 */

const fs = require('fs');
const path = require('path');

// Read the BookingExecutorAgent code to simulate the date determination logic
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  Simulating BookingExecutor Date Determination Logic              ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const scenarios = [
  {
    name: 'Scenario 1: time_preference is "kal_subha" (both date + time)',
    timePref: 'kal_subha',
    expectedDate: 'Tomorrow (May 20)'
  },
  {
    name: 'Scenario 2: time_preference is just "subha" (time only)',
    timePref: 'subha',
    expectedDate: 'Should be Tomorrow (May 20) but might default to Today',
    issue: true
  },
  {
    name: 'Scenario 3: time_preference is "kal" (date only)',
    timePref: 'kal',
    expectedDate: 'Tomorrow (May 20)'
  },
  {
    name: 'Scenario 4: time_preference is "parso" (day after tomorrow)',
    timePref: 'parso',
    expectedDate: 'May 21'
  },
  {
    name: 'Scenario 5: time_preference is "morning" (English time period)',
    timePref: 'morning',
    expectedDate: 'Should be Tomorrow but might default to Today',
    issue: true
  },
  {
    name: 'Scenario 6: time_preference is "kal_morning" (combined)',
    timePref: 'kal_morning',
    expectedDate: 'Tomorrow (May 20)'
  },
];

const now = new Date(2026, 4, 19); // May 19, 2026 (today)

scenarios.forEach((scenario, idx) => {
  console.log(`\n${scenario.name}`);
  console.log(`timePref: "${scenario.timePref}"`);
  console.log(`Expected: ${scenario.expectedDate}`);
  
  let dateFromPref = new Date(now);
  let dateConfidence = 0;
  
  // Simulate the Strategy 2 logic from BookingExecutorAgent
  if (scenario.timePref) {
    if (/tomorrow|kal(?!aam)|کل/i.test(scenario.timePref)) {
      dateFromPref.setDate(dateFromPref.getDate() + 1);
      dateConfidence = 0.9;
      console.log(`✅ Matched "tomorrow/kal" → Date: ${dateFromPref.toDateString()}`);
    } else if (/\btoday|aaj|آج|\btonight/i.test(scenario.timePref)) {
      dateConfidence = 0.9;
      console.log(`⚠️  Matched "today" → Date: ${dateFromPref.toDateString()}`);
    } else if (/day after tomorrow|parso|parson|paron|پرسوں|tarso|tarson|taron|تارسو/i.test(scenario.timePref)) {
      dateFromPref.setDate(dateFromPref.getDate() + 2);
      dateConfidence = 0.85;
      console.log(`✅ Matched "parso/day after tomorrow" → Date: ${dateFromPref.toDateString()}`);
    } else if (/next week/i.test(scenario.timePref)) {
      dateFromPref.setDate(dateFromPref.getDate() + 7);
      dateConfidence = 0.75;
      console.log(`✅ Matched "next week" → Date: ${dateFromPref.toDateString()}`);
    } else if (/weekend/i.test(scenario.timePref)) {
      const currentDay = dateFromPref.getDay();
      let daysToAdd = 6 - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      dateFromPref.setDate(dateFromPref.getDate() + daysToAdd);
      dateConfidence = 0.80;
      console.log(`✅ Matched "weekend" → Date: ${dateFromPref.toDateString()}`);
    } else {
      dateConfidence = 0.50;
      console.log(`❌ NO MATCH → Defaults to Today: ${dateFromPref.toDateString()}`);
      if (scenario.issue) {
        console.log(`   ⚠️  PROBLEM: time_preference "${scenario.timePref}" doesn't match any pattern!`);
      }
    }
  } else {
    dateConfidence = 0.30;
    console.log(`❌ NO TIME_PREF → Defaults to Today: ${dateFromPref.toDateString()}`);
  }
  
  console.log(`   Confidence: ${dateConfidence}`);
});

console.log('\n\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                        FINDINGS                                    ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

console.log('PROBLEM IDENTIFIED:');
console.log('  If time_preference is "morning", "afternoon", "evening" or "subha"');
console.log('  WITHOUT a date keyword (kal, parso, tomorrow, today), it defaults to');
console.log('  TODAY, not TOMORROW!\n');

console.log('SOLUTION:');
console.log('  Time preferences without explicit dates should default to TOMORROW,');
console.log('  not today. This makes intuitive sense - users book future services.\n');
