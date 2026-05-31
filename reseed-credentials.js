#!/usr/bin/env node
const http = require('http');

console.log('🧹 Clearing and re-seeding provider credentials...\n');

const postData = JSON.stringify({ clearFirst: true });
const options = {
  host: 'localhost',
  port: 3001,
  path: '/api/provider/seed-provider-credentials',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('========== RESULTS ==========\n');
      console.log('✅ Created:', json.created_count);
      console.log('⏭️  Skipped:', json.skipped_count);
      
      if (json.created.length > 0) {
        console.log('\n📝 First 10 credentials created:');
        json.created.slice(0, 10).forEach((c, i) => {
          console.log(`\n${i+1}. PROVIDER: ${c.name.padEnd(20)} (${c.service.padEnd(15)})`);
          console.log(`   EMAIL:    ${c.email}`);
          console.log(`   PASSWORD: ${c.password}`);
        });
        
        if (json.created.length > 10) {
          console.log(`\n... and ${json.created.length - 10} more credentials\n`);
        }
      }
      
      console.log('\n💾 Collection: providers_users');
      console.log('🔓 Format: name + service + @gmail.com');
      console.log('🔐 Password: service + 123 (NOT encrypted)\n');
    } catch (e) {
      console.error('Error:', e.message);
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(postData);
req.end();
