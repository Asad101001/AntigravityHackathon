const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/provider/seed-providers',
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
    console.log('RESPONSE:', data);
    try {
      const json = JSON.parse(data);
      console.log('✅ Created:', json.created_count);
      console.log('⏭️  Skipped:', json.skipped_count);
      console.log('Total providers created/skipped:', json.created_count + json.skipped_count);
    } catch (e) {
      console.log('Could not parse JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write('{}');
req.end();
