'use strict';
const path = require('path');
const fs = require('fs');

console.log('Running backend tests...');

const testsDir = path.join(__dirname);
const files = fs.readdirSync(testsDir).filter(f => f.startsWith('test_') && f.endsWith('.js'));
let passed = 0, failed = 0;
for (const file of files) {
  try {
    console.log(`- ${file}`);
    require(path.join(testsDir, file));
    console.log('  ✓ OK');
    passed++;
  } catch (err) {
    console.error('  ✗ FAIL', err.stack || err.message);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
