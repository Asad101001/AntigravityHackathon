const path = require('path');
const dotenv = require('../backend/node_modules/dotenv');
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { findLocationCandidate } = require('../backend/utils/locationNormalizer');
const db = require('../backend/db');

async function runTests() {
  console.log('=== Connecting to Database ===');
  await db.setupDatabase();
  console.log('Database connected successfully.\n');

  console.log('=== Running Location Precision Tests ===\n');

  // Test Case 1: "Karachi defence" (scoped to Karachi)
  console.log('Test 1: "Karachi defence" (scoped to Karachi)');
  const result1 = await findLocationCandidate('Karachi defence', { minConfidence: 0.5, city: 'Karachi' });
  console.log('Matched Query:', result1?.matched_query);
  console.log('Canonical Area Name:', result1?.coords?.area_name);
  console.log('Coordinates:', result1?.coords?.lat, result1?.coords?.lng);
  console.log('Is City Only?', result1?.cityOnly);
  console.log('Confidence:', result1?.confidence);
  if (result1 && !result1.cityOnly && result1.coords.area_name.includes('Defence')) {
    console.log('✓ PASS: Correctly matched to precise neighborhood coordinates!\n');
  } else {
    console.log('✗ FAIL: Mismatched to city center or wrong neighborhood.\n');
  }

  // Test Case 2: "DHA Karachi" (scoped to Karachi)
  console.log('Test 2: "DHA Karachi" (scoped to Karachi)');
  const result2 = await findLocationCandidate('DHA Karachi', { minConfidence: 0.5, city: 'Karachi' });
  console.log('Matched Query:', result2?.matched_query);
  console.log('Canonical Area Name:', result2?.coords?.area_name);
  console.log('Coordinates:', result2?.coords?.lat, result2?.coords?.lng);
  console.log('Is City Only?', result2?.cityOnly);
  console.log('Confidence:', result2?.confidence);
  if (result2 && !result2.cityOnly && (result2.coords.area_name.includes('DHA') || result2.coords.area_name.includes('Defence'))) {
    console.log('✓ PASS: Correctly matched to precise neighborhood coordinates!\n');
  } else {
    console.log('✗ FAIL: Mismatched to city center or wrong neighborhood.\n');
  }

  // Test Case 3: "Karachi" only
  console.log('Test 3: "Karachi" only');
  const result3 = await findLocationCandidate('Karachi', { minConfidence: 0.5 });
  console.log('Matched Query:', result3?.matched_query);
  console.log('Canonical Area Name:', result3?.coords?.area_name);
  console.log('Is City Only?', result3?.cityOnly);
  console.log('Confidence:', result3?.confidence);
  if (result3 && result3.cityOnly) {
    console.log('✓ PASS: Correctly matched to general city center when no neighborhood specified!\n');
  } else {
    console.log('✗ FAIL: Expected city center match.\n');
  }

  console.log('=== Location Precision Tests Completed ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Error running precision tests:', err);
  process.exit(1);
});
