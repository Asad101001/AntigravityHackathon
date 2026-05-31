#!/usr/bin/env node
const http = require('http');

console.log('Starting seed request...');
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
  console.log('Got response, status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    process.stdout.write('.');
  });
  res.on('end', () => {
    console.log('\nResponse received!');
    try {
      const json = JSON.parse(data);
      console.log('\n========== SEED RESULTS ==========');
      console.log('Created:', json.created_count);
      console.log('Skipped:', json.skipped_count);
      console.log('\n📝 First 5 provider credentials:');
      json.created.slice(0, 5).forEach((c, i) => {
        console.log(`\n${i+1}. Provider: ${c.name}`);
        console.log(`   Service: ${c.service}`);
        console.log(`   Email: ${c.email}`);
        console.log(`   Password: ${c.password}`);
      });
      console.log('\n✅ Seed completed successfully!');
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
      console.log('Raw data:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();

console.log('Request sent, waiting for response...');
