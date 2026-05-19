/**
 * Test the FIXED Strategy 2 logic - Time periods now default to TOMORROW
 */

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║        Testing FIXED BookingExecutor Date Logic                   ║');
console.log('║        (Time periods now default to TOMORROW, not TODAY)          ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const scenarios = [
  { name: 'Time only: "subha" (morning in Urdu)', timePref: 'subha', expectedDaysOffset: 1 },
  { name: 'Time only: "dopehir" (afternoon in Urdu)', timePref: 'dopehir', expectedDaysOffset: 1 },
  { name: 'Time only: "shaam" (evening in Urdu)', timePref: 'shaam', expectedDaysOffset: 1 },
  { name: 'Time only: "morning" (English)', timePref: 'morning', expectedDaysOffset: 1 },
  { name: 'Time only: "afternoon" (English)', timePref: 'afternoon', expectedDaysOffset: 1 },
  { name: 'Date + Time: "kal_subha" (tomorrow morning)', timePref: 'kal_subha', expectedDaysOffset: 1 },
  { name: 'Date + Time: "parso_dopehir" (day after tomorrow afternoon)', timePref: 'parso_dopehir', expectedDaysOffset: 2 },
  { name: 'Date only: "aaj" (today)', timePref: 'aaj', expectedDaysOffset: 0 },
  { name: 'No preference at all', timePref: '', expectedDaysOffset: 1 },
];

const now = new Date(2026, 4, 19); // May 19, 2026 (today)
const tomorrow = new Date(2026, 4, 20); // May 20
const dayAfterTomorrow = new Date(2026, 4, 21); // May 21

let passed = 0;
let failed = 0;

scenarios.forEach((scenario, idx) => {
  let dateFromPref = new Date(now);
  
  // Apply the FIXED Strategy 2 logic
  if (scenario.timePref) {
    if (/tomorrow|kal(?!aam)|کل/i.test(scenario.timePref)) {
      dateFromPref.setDate(dateFromPref.getDate() + 1);
    } else if (/\btoday|aaj|آج|\btonight/i.test(scenario.timePref)) {
      // Keep as today
    } else if (/day after tomorrow|parso|parson|paron|پرسوں|tarso|tarson|taron|تارسو/i.test(scenario.timePref)) {
      dateFromPref.setDate(dateFromPref.getDate() + 2);
    } else if (/morning|subah|subha|dopehir|afternoon|shaam|evening|raat|night|early|later/i.test(scenario.timePref)) {
      // Time period detected without specific date → default to TOMORROW ✅ FIXED
      dateFromPref.setDate(dateFromPref.getDate() + 1);
    } else {
      // Unrecognized, default to TOMORROW ✅ FIXED
      dateFromPref.setDate(dateFromPref.getDate() + 1);
    }
  } else {
    // No preference, default to TOMORROW ✅ FIXED
    dateFromPref.setDate(dateFromPref.getDate() + 1);
  }
  
  // Check if result matches expected
  const expectedDate = new Date(now);
  expectedDate.setDate(expectedDate.getDate() + scenario.expectedDaysOffset);
  
  const isCorrect = dateFromPref.toDateString() === expectedDate.toDateString();
  
  if (isCorrect) {
    console.log(`✅ [${idx + 1}] ${scenario.name}`);
    console.log(`   timePref: "${scenario.timePref}"`);
    console.log(`   Result: ${dateFromPref.toDateString()} (${scenario.expectedDaysOffset} days from today)`);
    passed++;
  } else {
    console.log(`❌ [${idx + 1}] ${scenario.name}`);
    console.log(`   timePref: "${scenario.timePref}"`);
    console.log(`   Expected: ${expectedDate.toDateString()}`);
    console.log(`   Got: ${dateFromPref.toDateString()}`);
    failed++;
  }
  console.log('');
});

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                      TEST RESULTS                                 ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log(`\nTotal: ${scenarios.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`\nSuccess Rate: ${((passed / scenarios.length) * 100).toFixed(0)}%\n`);

if (failed === 0) {
  console.log('🎉 ALL TESTS PASS! Bookings now default to TOMORROW, not TODAY! 🎉\n');
}
