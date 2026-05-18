const assert = require('assert');
const { resolve } = require('../services/locationResolver');

async function run(){
  // explicit prompt
  const r1 = await resolve('I need an AC repair in Gulzar e Hijri', null, {});
  assert(r1.source === 'prompt' && /Gulzar/i.test(r1.name));

  // client location takes precedence when no explicit prompt location
  const clientLoc = { name: 'Gulzar-e-Hijri', lat: 24.9, lon: 67.1 };
  const r2 = await resolve('AC repair needed', clientLoc, {});
  assert(r2.source === 'client' && Math.abs(r2.lat - 24.9) < 0.001);

  // fallback to session.profileLocation
  const profile = { name: 'ProfileArea', lat: 1, lon: 2 };
  const r3 = await resolve('', null, { profileLocation: profile });
  assert(r3.source === 'profile' && r3.name === 'ProfileArea');

  console.log('test_locationResolver passed');
}

run().catch(e => { console.error(e); process.exit(2); });
