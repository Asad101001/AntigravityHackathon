(async function(){
  const BookingExecutorAgent = require('../backend/agents/BookingExecutorAgent');

  const agent = new BookingExecutorAgent();

  const context = {
    selected_provider: {
      id: 'PL277',
      name: 'DHA Works Plumber Maryam',
      phone: '+92-300-0000000',
      available_slots: ['08:00', '09:00', '10:00', '14:00', '15:00']
    },
    user_id: 'USR_123_test',
    user_text: 'MUJHE KAL SUBHA 9 BAJAY PLUMBER KI NEED',
    service_type: 'Plumber',
    location: 'Tariq Road Karachi',
    resolved_area: 'DHA',
    time_preference: ''
  };

  console.log('\n=== Running BookingExecutorAgent.execute() simulation ===\n');
  try {
    const result = await agent.execute(context);
    console.log('\n=== Agent result ===');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n=== Booking proposal prepared; no DB write occurs until user confirmation ===');
  } catch (err) {
    console.error('Error running agent:', err);
  }
})();
