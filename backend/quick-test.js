const http = require('http');

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:3001${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function quickTest() {
  console.log('🧪 QUICK BOOKING UPDATE TEST\n');

  // Register
  console.log('1. Registering user...');
  const email = `test-${Date.now()}@test.com`;
  const regResp = await makeRequest('POST', '/api/auth/register', {
    email,
    password: 'Test123456',
    displayName: 'Tester',
  });
  const token = regResp.body.token;
  console.log(`✅ Got token\n`);

  // Create booking
  console.log('2. Creating booking...');
  const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const bookResp = await makeRequest('POST', '/api/bookings', {
    provider_id: 'TEST_' + Date.now(),
    provider_name: 'Test Provider',
    service_type: 'Test',
    location: 'Test',
    city: 'Test',
    area: 'Test',
    booking_start_time: futureTime,
    quote_pkr: 1000,
    status: 'confirmed',
    raw_data: {},
  }, token);

  const bookingId = bookResp.body.booking._id;
  console.log(`✅ Booking created: ${bookingId}\n`);

  // Update and see what we get back
  console.log('3. Updating booking status...');
  const updateResp = await makeRequest('PUT', `/api/bookings/${bookingId}`, { status: 'Operating' }, token);
  console.log(`Status: ${updateResp.status}`);
  console.log('Full response:', JSON.stringify(updateResp.body, null, 2));
  console.log();

  // Get the booking directly
  console.log('4. Fetching booking directly...');
  const getResp = await makeRequest('GET', `/api/bookings/${bookingId}`, null, token);
  console.log(`Status: ${getResp.status}`);
  console.log('Booking:', getResp.body?.booking?.status || 'MISSING');
}

quickTest().catch(console.error);
