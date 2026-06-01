/**
 * Test the exact user input that failed
 * User said: "MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED"
 * (I need a plumber tomorrow morning at 9 o'clock)
 */

const { parseDateTime } = require('../backend/utils/dateTimeParser');

console.log('Testing exact user input:\n');

const userInput = "MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED";

console.log(`Input: "${userInput}"`);
console.log(`Lowercase: "${userInput.toLowerCase()}"\n`);

const result = parseDateTime(userInput);

if (!result) {
  console.log('❌ ERROR: Parser returned NULL!\n');
  console.log('This explains why it booked for TODAY instead of TOMORROW.');
} else {
  console.log('✅ Parser result:');
  console.log(`   Date: ${result.dateLabel}`);
  console.log(`   Time: ${result.timeIn12H}`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`   Raw date: ${result.date}`);
  
  const isCorrect = result.dateLabel.includes('May 19');
  if (isCorrect) {
    console.log('\n✅ Correct - Tomorrow!');
  } else {
    console.log('\n❌ Wrong - Should be tomorrow (May 19), not:', result.dateLabel);
  }
}

console.log('\n\n--- TESTING VARIATIONS ---\n');

const testCases = [
  'kal subah 9 bajay',
  'mujhe kal subha 9 bajay plumber ki need',
  'kal 9 bajay',
  'kal 9am',
  'kal at 9 am',
];

testCases.forEach(test => {
  const r = parseDateTime(test);
  console.log(`"${test}"`);
  if (r) {
    console.log(`  → ${r.dateLabel} at ${r.timeIn12H}`);
  } else {
    console.log(`  → NULL (FAILED!)`);
  }
});
