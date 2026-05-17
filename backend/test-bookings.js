const http = require('http');

const BASE_URL = 'http://localhost:3001';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
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

async function runTests() {
  try {
    console.log('🧪 BOOKING SYSTEM TEST SUITE\n');

    // Step 1: Register user
    console.log('🔑 STEP 1: Registering test user...');
    const email = `booking-test-${Date.now()}@example.com`;
    const registerResp = await makeRequest('POST', '/api/auth/register', {
      email: email,
      password: 'TestPassword123',
      displayName: 'Booking Tester',
    });

    if (registerResp.status !== 201) {
      console.log(`❌ Registration failed: ${registerResp.status}`);
      console.log(JSON.stringify(registerResp.body, null, 2));
      process.exit(1);
    }

    const token = registerResp.body.token;
    const userId = registerResp.body.user.id;
    console.log(`✅ User registered: ${email}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   User ID: ${userId}\n`);

    // Step 2: Create booking
    console.log('📅 STEP 2: Creating test booking...');
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const bookingBody = {
      provider_id: 'EL298',
      provider_name: 'G-10 Prime Electrician Kiran',
      service_type: 'Electrician',
      location: 'G-10/4, Islamabad',
      city: 'Islamabad',
      area: 'G-10',
      booking_start_time: futureTime,
      quote_pkr: 1500,
      status: 'confirmed',
      raw_data: {
        reasoning: 'Test booking',
        workflow_id: `WF_test_${Date.now()}`,
      },
    };

    const createResp = await makeRequest('POST', '/api/bookings', bookingBody, token);
    console.log(`DEBUG: Create response status: ${createResp.status}`);
    console.log(`DEBUG: Create response body:`, JSON.stringify(createResp.body, null, 2));
    
    if (createResp.status !== 201) {
      console.log(`❌ Booking creation failed: ${createResp.status}`);
      console.log(JSON.stringify(createResp.body, null, 2));
      process.exit(1);
    }

    const bookingId = createResp.body.booking._id;
    console.log(`✅ Booking created successfully`);
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Status: ${createResp.body.booking.status}`);
    console.log(`   Quote: ${createResp.body.booking.quote_pkr} PKR\n`);

    // Step 3: Retrieve all bookings
    console.log('📋 STEP 3: Retrieving all user bookings...');
    const getResp = await makeRequest('GET', '/api/bookings', null, token);
    console.log(`DEBUG: Get response status: ${getResp.status}`);
    console.log(`DEBUG: Get response body:`, JSON.stringify(getResp.body, null, 2));
    
    if (getResp.status !== 200) {
      console.log(`❌ Failed to retrieve bookings: ${getResp.status}`);
      process.exit(1);
    }

    const bookings = getResp.body.bookings;
    console.log(`✅ Retrieved ${bookings.length} booking(s)`);
    bookings.forEach((b) => {
      console.log(`   - ${b.provider_name} (${b.status}) - ${b.quote_pkr} PKR`);
    });
    console.log();

    // Step 4: Test duplicate prevention
    console.log('🔍 STEP 4: Testing duplicate prevention...');
    const dupBody = {
      provider_id: 'EL298',
      provider_name: 'G-10 Prime Electrician Kiran',
      service_type: 'Electrician',
      location: 'G-10/4, Islamabad',
      city: 'Islamabad',
      area: 'G-10',
      booking_start_time: futureTime,
      quote_pkr: 1500,
      status: 'confirmed',
      raw_data: { workflow_id: `WF_dup_${Date.now()}` },
    };

    const dupResp = await makeRequest('POST', '/api/bookings', dupBody, token);
    if (dupResp.status === 409) {
      console.log(`✅ Duplicate booking correctly rejected (409 Conflict)`);
      console.log(`   Error: ${dupResp.body.error}`);
    } else {
      console.log(`❌ Duplicate not blocked! Status: ${dupResp.status}`);
    }
    console.log();

    // Step 5: Update booking status
    console.log('🔄 STEP 5: Updating booking status...');
    const updateResp = await makeRequest(
      'PUT',
      `/api/bookings/${bookingId}`,
      { status: 'Operating' },
      token
    );

    console.log(`DEBUG: Update response status: ${updateResp.status}`);
    console.log(`DEBUG: Update response body:`, JSON.stringify(updateResp.body, null, 2));

    if (updateResp.status !== 200) {
      console.log(`❌ Failed to update status: ${updateResp.status}`);
      console.log(JSON.stringify(updateResp.body, null, 2));
    } else {
      console.log(`✅ Status updated to: ${updateResp.body.booking?.status || updateResp.body.status}`);
      console.log(`   Updated at: ${updateResp.body.booking?.updated_at || updateResp.body.updated_at}`);
    }
    console.log();

    // Step 6: Cancel booking
    console.log('❌ STEP 6: Canceling booking...');
    const cancelResp = await makeRequest('DELETE', `/api/bookings/${bookingId}`, null, token);

    console.log(`DEBUG: Cancel response status: ${cancelResp.status}`);
    console.log(`DEBUG: Cancel response body:`, JSON.stringify(cancelResp.body, null, 2));

    if (cancelResp.status !== 200) {
      console.log(`❌ Failed to cancel booking: ${cancelResp.status}`);
    } else {
      console.log(`✅ Booking canceled (status: ${cancelResp.body.booking?.status || cancelResp.body.status})`);
    }
    console.log();

    // Step 7: Verify final list
    console.log('📋 STEP 7: Final booking list verification...');
    const finalResp = await makeRequest('GET', '/api/bookings', null, token);
    const finalBookings = finalResp.body.bookings;
    console.log(`✅ Final count: ${finalBookings.length} booking(s)`);
    finalBookings.forEach((b) => {
      console.log(`   - ${b.provider_name} (${b.status}) - ${b.quote_pkr} PKR`);
    });
    console.log();

    console.log('🏁 All tests completed successfully!\n');
  } catch (error) {
    console.error('💥 Test error:', error.message);
    process.exit(1);
  }
}

runTests();
