const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/provider/seed-provider-credentials',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 2
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ SUCCESS!\n');
      console.log('📊 Results:');
      console.log(`   • Created: ${json.created_count}`);
      console.log(`   • Skipped: ${json.skipped_count}`);
      console.log(`\n📝 Sample credentials created:`);
      
      // Show first 5 examples
      json.created.slice(0, 5).forEach(cred => {
        console.log(`   - Name: ${cred.name}`);
        console.log(`     Service: ${cred.service}`);
        console.log(`     Email: ${cred.email}`);
        console.log(`     Password: ${cred.password}`);
        console.log('');
      });
      
      if (json.created.length > 5) {
        console.log(`   ... and ${json.created.length - 5} more`);
      }
      
      console.log(`\n💾 All credentials stored in 'providers_users' collection (passwords NOT encrypted)`);
    } catch (e) {
      console.error('Could not parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write('{}');
req.end();
