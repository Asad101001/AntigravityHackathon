/**
 * Simulate what the LLM Intent Parser extracts from user input
 * Then trace through to see why the booking uses today's date
 */

const { parseDateTime } = require('./backend/utils/dateTimeParser');

console.log('=== TRACING THE FULL BOOKING FLOW ===\n');

const userInput = "MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED";

console.log(`Original User Input: "${userInput}"\n`);

// Simulate what LLMIntentParserAgent extracts
// (This is what the LLM would typically output)
console.log('Step 1: LLM Intent Parser Output (simulated)');
const llmOutput = {
  service_type: 'Plumber',
  time_preference: 'kal_subha',  // or just "kal" or "subha"
  location: 'not specified',
  user_text: userInput  // Raw user text
};
console.log(JSON.stringify(llmOutput, null, 2));

// Step 2: BookingExecutorAgent calls parseExplicitAppointment
console.log('\n\nStep 2: BookingExecutorAgent.parseExplicitAppointment() is called with:');
const sourceText = `${llmOutput.user_text || ''}`.trim();
console.log(`  sourceText: "${sourceText}"`);

// Step 3: parseDateTime is called
console.log('\nStep 3: parseDateTime() is called');
const parsed = parseDateTime(sourceText);

if (!parsed) {
  console.log('  ❌ Result: NULL');
  console.log('  → This causes fallback to TODAY\'s date!');
} else {
  console.log(`  ✅ Result:`);
  console.log(`     Date: ${parsed.dateLabel}`);
  console.log(`     Time: ${parsed.timeIn12H}`);
  console.log(`     scheduledDate: ${parsed.date}`);
  console.log(`     Confidence: ${parsed.confidence}`);
  
  console.log('\nStep 4: Check confidence > 0.75:');
  if (parsed.confidence > 0.75) {
    console.log(`  ✅ YES (${parsed.confidence} > 0.75)`);
    console.log('  → Should use the parsed date (May 19)');
  } else {
    console.log(`  ❌ NO (${parsed.confidence} < 0.75)`);
    console.log('  → Falls back to today\'s date');
  }
}

// Also test just the time preference
console.log('\n\n--- ALTERNATIVE: If only time_preference is used ---');
console.log(`time_preference: "${llmOutput.time_preference}"`);

const timePref = llmOutput.time_preference;

// This is what happens in the else branch
const now = new Date();
let scheduledDate = new Date(now);

if (/^kal|tomorrow/.test(timePref)) {
  scheduledDate.setDate(scheduledDate.getDate() + 1);
  console.log(`✅ Would add 1 day → "${scheduledDate.toDateString()}"`);
} else {
  console.log(`❌ time_preference not recognized`);
  console.log(`   Would default to today → "${scheduledDate.toDateString()}"`);
}
