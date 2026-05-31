#!/usr/bin/env node
const http = require('http');

console.log('🧹 Clearing and re-seeding provider credentials...\n');

const options = {
  host: 'localhost',
  port: 3001,
  path: '/api/provider/seed-provider-credentials?clearFirst=true',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 2
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
        console.log('\n📝 First 15 credentials created:');
        json.created.slice(0, 15).forEach((c, i) => {
          console.log(`${(i+1).toString().padStart(3)}. ${c.name.padEnd(25)} (${c.service.padEnd(12)}) -> ${c.email.padEnd(30)} / ${c.password}`);
        });
        
        if (json.created.length > 15) {
          console.log(`\n    ... and ${json.created.length - 15} more\n`);
        }
      }
      
      console.log('\n💾 Collection: providers_users');
      console.log('🔓 Email format: name + service + @gmail.com');
      console.log('🔐 Password format: service + 123 (NOT encrypted)\n');
    } catch (e) {
      console.error('Error:', e.message);
      console.log('Raw response:', data.substring(0, 300));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write('{}');
req.end();
