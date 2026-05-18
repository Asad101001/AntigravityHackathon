const path = require('path');
const tests = [
  './test_locationResolver.js',
  './test_terminalRenderer.js'
];

(async function(){
  console.log('Running backend tests...');
  for(const t of tests){
    console.log('\n--- ' + t + ' ---');
    await require(path.join(__dirname, t));
  }
  console.log('\nAll tests completed.');
})();
