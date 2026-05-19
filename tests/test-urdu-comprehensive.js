/**
 * Test Comprehensive Urdu Keywords - Covers user's specific examples
 * Tests: "kal", "parso", "tarso", and other Urdu/Roman Urdu variations
 * Run with: node test-urdu-comprehensive.js
 */

const { parseDateTime } = require('./backend/utils/dateTimeParser');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     COMPREHENSIVE URDU/ROMAN URDU DATE PARSING TEST        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const today = new Date(2026, 4, 19); // May 19, 2026 (today)
const tomorrow = new Date(2026, 4, 20); // May 20, 2026 (tomorrow)
const dayAfterTomorrow = new Date(2026, 4, 21); // May 21, 2026 (day after tomorrow)

const testCases = [
  {
    category: '🇬🇧 ENGLISH - Basic Keywords',
    tests: [
      { input: 'tomorrow at 2 pm', expectedDate: tomorrow },
      { input: 'day after tomorrow at 3 pm', expectedDate: dayAfterTomorrow },
      { input: 'today at 5 pm', expectedDate: today },
      { input: 'tomorrow morning', expectedDate: tomorrow },
      { input: 'day after tomorrow evening', expectedDate: dayAfterTomorrow },
    ]
  },
  {
    category: '🇵🇰 URDU/ROMAN URDU - Basic Keywords',
    tests: [
      { input: 'kal at 2 pm', expectedDate: tomorrow },
      { input: 'parso at 3 pm', expectedDate: dayAfterTomorrow },
      { input: 'aaj at 5 pm', expectedDate: today },
      { input: 'kal morning', expectedDate: tomorrow },
      { input: 'parso evening', expectedDate: dayAfterTomorrow },
    ]
  },
  {
    category: '🔤 ROMAN URDU VARIATIONS',
    tests: [
      { input: 'kal subah', expectedDate: tomorrow },
      { input: 'parso dopehir', expectedDate: dayAfterTomorrow },
      { input: 'aaj shaam', expectedDate: today },
      { input: 'parso raat', expectedDate: dayAfterTomorrow },
    ]
  },
  {
    category: '🎯 MIXED ENGLISH-URDU SENTENCES',
    tests: [
      { input: 'i need plumber kal at 2 pm', expectedDate: tomorrow },
      { input: 'book electrician parso subah', expectedDate: dayAfterTomorrow },
      { input: 'send carpenter aaj dopehir', expectedDate: today },
      { input: 'hairdresser appointment kal morning', expectedDate: tomorrow },
      { input: 'AC repair parso evening', expectedDate: dayAfterTomorrow },
    ]
  },
  {
    category: '⏰ TIME FORMATS WITH URDU DATES',
    tests: [
      { input: 'kal 2 pm', expectedDate: tomorrow },
      { input: 'parso 10:30 am', expectedDate: dayAfterTomorrow },
      { input: 'aaj 14:00', expectedDate: today },
      { input: 'kal 6 pm', expectedDate: tomorrow },
    ]
  },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

testCases.forEach(category => {
  console.log(`\n${category.category}`);
  console.log('═'.repeat(62));
  
  category.tests.forEach((testCase, idx) => {
    totalTests++;
    const result = parseDateTime(testCase.input);
    
    if (!result) {
      console.log(`❌ [${idx + 1}] "${testCase.input}"`);
      console.log(`   ERROR: Parser returned null!\n`);
      failedTests++;
      return;
    }
    
    const expectedStr = testCase.expectedDate.toDateString();
    const resultStr = result.date.toDateString();
    const isCorrect = expectedStr === resultStr;
    
    if (isCorrect) {
      console.log(`✅ [${idx + 1}] "${testCase.input}"`);
      console.log(`   → ${result.dateLabel} at ${result.timeIn12H}`);
      console.log(`   ⚡ Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);
      passedTests++;
    } else {
      console.log(`❌ [${idx + 1}] "${testCase.input}"`);
      console.log(`   Expected: ${expectedStr}`);
      console.log(`   Got:      ${resultStr}`);
      console.log(`   ${result.dateLabel} at ${result.timeIn12H}\n`);
      failedTests++;
    }
  });
});

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                      FINAL RESULTS                          ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`\nTotal Tests:    ${totalTests}`);
console.log(`✅ Passed:      ${passedTests}`);
console.log(`❌ Failed:      ${failedTests}`);
console.log(`Success Rate:   ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Date parsing is working perfectly!\n');
} else {
  console.log(`\n⚠️  ${failedTests} test(s) failed. Please check the results.\n`);
}
