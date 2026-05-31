#!/usr/bin/env node
const http = require('http');

console.log('Sending seed request...\n');
const postData = '{}';
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
      console.log('========== PROVIDER CREDENTIALS SEED ==========\n');
      console.log('✅ Created:', json.created_count);
      console.log('⏭️  Skipped:', json.skipped_count);
      
      if (json.skipped.length > 0) {
        console.log('\n⚠️  Skipped Reasons:');
        const reasons = {};
        json.skipped.forEach(s => {
          reasons[s.reason] = (reasons[s.reason] || 0) + 1;
        });
        Object.entries(reasons).forEach(([reason, count]) => {
          console.log(`   - ${reason}: ${count}`);
        });
      }
      
      if (json.created.length > 0) {
        console.log('\n📝 First 5 created:');
        json.created.slice(0, 5).forEach((c, i) => {
          console.log(`\n${i+1}. ${c.name} (${c.service})`);
          console.log(`   📧 ${c.email}`);
          console.log(`   🔐 ${c.password}`);
        });
        
        if (json.created.length > 5) {
          console.log(`\n... and ${json.created.length - 5} more credentials`);
        }
      }
      
      console.log('\n💾 All credentials stored in "providers_users" collection');
      console.log('🔓 Passwords are NOT encrypted (plain text)\n');
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.write(postData);
req.end();
