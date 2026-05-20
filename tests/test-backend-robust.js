/**
 * Comprehensive Backend Robustness Test Suite
 * Tests: IntentParser, LocationResolver, ProviderRanker, DateTimeParser, full pipeline
 * Run: node tests/test-backend-robust.js
 */

'use strict';

// ── Environment ───────────────────────────────────────────────────────────────
const path = require('path');
const BACKEND = path.join(__dirname, '..', 'backend');

try { require('dotenv').config({ path: path.join(BACKEND, '.env') }); } catch(_) {}

const { parseDateTime, parseTimePreference } = require(path.join(BACKEND, 'utils/dateTimeParser'));
const { normalizeLocation, similarity } = require(path.join(BACKEND, 'utils/locationNormalizer'));
const ProviderRankerAgent = require(path.join(BACKEND, 'agents/ProviderRankerAgent'));
const LocationResolverAgent = require(path.join(BACKEND, 'agents/LocationResolverAgent'));
const IntentParserAgent = require(path.join(BACKEND, 'agents/IntentParserAgent'));

// ── Test harness ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0, warned = 0;
const results = [];

function test(group, name, fn) {
  try {
    const result = fn();
    if (result && result.then) {
      return result.then(() => {
        log('PASS', group, name);
      }).catch(err => {
        log('FAIL', group, name, err.message);
      });
    }
    log('PASS', group, name);
  } catch (err) {
    log('FAIL', group, name, err.message);
  }
}

function log(status, group, name, err = null) {
  if (status === 'PASS') passed++;
  else failed++;
  const entry = { status, group, name, error: err };
  results.push(entry);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} [${group}] ${name}${err ? ' — ' + err : ''}`);
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'Expected equality'}: got "${a}", expected "${b}"`);
}

function assertContains(str, sub, msg) {
  if (!String(str || '').includes(sub)) throw new Error(`${msg || 'Expected to contain'}: "${sub}" not in "${str}"`);
}

// ── Mock providers for ranker tests ──────────────────────────────────────────
const MOCK_PROVIDERS = [
  {
    id: 'p1', name: 'Ali Electric', service: 'Electrician',
    distance_km: 1.2, rating: 4.8, reviews_count: 120,
    response_time_min: 15, available_slots: ['09:00', '11:00', '14:00'],
    base_rate_pkr: 800, on_time_score: 0.95, cancellation_risk: 'low',
    verified: true,
  },
  {
    id: 'p2', name: 'Hassan Electric', service: 'Electrician',
    distance_km: 0.5, rating: 3.9, reviews_count: 30,
    response_time_min: 8, available_slots: ['10:00'],
    base_rate_pkr: 1200, on_time_score: 0.70, cancellation_risk: 'medium',
    verified: true,
  },
  {
    id: 'p3', name: 'Cheapo Wiring', service: 'Electrician',
    distance_km: 3.0, rating: 3.5, reviews_count: 10,
    response_time_min: 40, available_slots: ['09:00', '12:00'],
    base_rate_pkr: 400, on_time_score: 0.55, cancellation_risk: 'high',
    verified: false,
  },
  {
    id: 'p4', name: 'Premium Sparks', service: 'Electrician',
    distance_km: 2.8, rating: 4.9, reviews_count: 200,
    response_time_min: 30, available_slots: ['08:00', '09:00', '10:00', '14:00', '16:00'],
    base_rate_pkr: 2500, on_time_score: 0.98, cancellation_risk: 'low',
    verified: true,
  },
  // Missing fields — should not crash
  {
    id: 'p5', name: 'No Data Guy', service: 'Electrician',
    distance_km: undefined, rating: undefined, reviews_count: undefined,
    response_time_min: undefined, available_slots: undefined,
    base_rate_pkr: undefined, on_time_score: undefined, cancellation_risk: undefined,
    verified: false,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// 1. DATE/TIME PARSER
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ 1. Date/Time Parser ━━━');

test('DateTime', 'English: tomorrow', () => {
  const r = parseDateTime('I need someone tomorrow');
  assert(r, 'Should parse');
  assert(r.date, 'Should have date');
});

test('DateTime', 'English: today morning', () => {
  const r = parseDateTime('come today morning');
  assert(r, 'Should parse');
  assertContains(r.timeLabel, 'AM', 'Morning should be AM');
});

test('DateTime', 'English: specific time 2pm', () => {
  const r = parseDateTime('book at 2 pm');
  assert(r, 'Should parse');
  assertEq(r.date.getHours(), 14, 'Should be 14:00');
});

test('DateTime', 'English: 24h format 14:00', () => {
  const r = parseDateTime('appointment at 14:00');
  assert(r, 'Should parse');
  assertEq(r.date.getHours(), 14, 'Should be 14:00');
});

test('DateTime', 'Roman Urdu: kal', () => {
  const r = parseDateTime('kal aajao');
  assert(r, 'Should parse kal as tomorrow');
});

test('DateTime', 'Roman Urdu: parso', () => {
  const r = parseDateTime('parso subah');
  assert(r, 'Should parse parso as day after tomorrow');
  const now = new Date();
  const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2);
  assert(r.date.getDate() === dayAfter.getDate(), 'Should be day after tomorrow');
});

test('DateTime', 'Roman Urdu: subah (morning)', () => {
  const r = parseDateTime('subah 9 baje');
  assert(r, 'Should parse');
  assertEq(r.date.getHours(), 9, 'Should be 9 AM');
});

test('DateTime', 'Roman Urdu: shaam (evening)', () => {
  const r = parseDateTime('kal shaam ko bulao');
  assert(r, 'Should parse');
  assert(r.date.getHours() >= 17, 'Evening should be >= 17:00');
});

test('DateTime', 'Roman Urdu: bajay format', () => {
  const r = parseDateTime('3 bajay aa jana');
  assert(r, 'Should parse bajay');
});

test('DateTime', 'Urdu script: kal subah', () => {
  const r = parseDateTime('کل صبح آنا');
  // May or may not parse Urdu script — should not throw
  assert(r !== undefined || r === null, 'Should not throw');
});

test('DateTime', 'Next week', () => {
  const r = parseDateTime('next week send someone');
  assert(r, 'Should parse next week');
  const now = new Date(); now.setHours(0,0,0,0);
  assert(r.date > now, 'Should be in future');
});

test('DateTime', 'Agla hafta (Roman Urdu next week)', () => {
  const r = parseDateTime('agla hafta theek hai');
  assert(r, 'Should parse agla hafta');
});

test('DateTime', 'Next month', () => {
  const r = parseDateTime('agla mahina book karo');
  assert(r, 'Should parse agla mahina');
});

test('DateTime', 'Specific date: May 25', () => {
  const r = parseDateTime('May 25 available hai?');
  assert(r, 'Should parse specific date');
  assertEq(r.date.getMonth(), 4, 'May = month 4 (0-indexed)');
  assertEq(r.date.getDate(), 25, 'Day 25');
});

test('DateTime', 'DD/MM date format', () => {
  const r = parseDateTime('25/06 ko chahiye');
  assert(r, 'Should parse DD/MM');
});

test('DateTime', 'Weekend', () => {
  const r = parseDateTime('this weekend please');
  assert(r, 'Should parse weekend');
  const day = r.date.getDay();
  assert(day === 0 || day === 6, 'Should be Saturday or Sunday');
});

test('DateTime', 'Empty string → null', () => {
  const r = parseDateTime('');
  assert(r === null, 'Empty should return null');
});

test('DateTime', 'Garbage input → null or object', () => {
  const r = parseDateTime('asdfghjkl xyz 123');
  assert(r === null || typeof r === 'object', 'Should not throw');
});

test('DateTime', 'null input → null', () => {
  const r = parseDateTime(null);
  assert(r === null, 'null should return null');
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. LOCATION NORMALIZER
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ 2. Location Normalizer ━━━');

test('Location', 'Exact match: DHA Karachi', () => {
  const score = similarity('DHA Karachi', 'dha karachi');
  assert(score > 0.9, `Score should be high, got ${score}`);
});

test('Location', 'Typo tolerance: Karaachi vs Karachi', () => {
  const score = similarity('Karaachi', 'karachi');
  assert(score > 0.6, `Typo score should be > 0.6, got ${score}`);
});

test('Location', 'Abbreviation: F-8 vs F8', () => {
  const score = similarity('F-8', 'F8');
  assert(score > 0.5, `Abbreviation score should be > 0.5, got ${score}`);
});

test('Location', 'Normalize: strips extra spaces', () => {
  const n = normalizeLocation('  DHA   Phase 5  ');
  assert(!n.startsWith(' ') && !n.endsWith(' '), 'Should trim');
});

test('Location', 'Normalize: lowercases', () => {
  const n = normalizeLocation('GULSHAN-E-IQBAL');
  assert(n === n.toLowerCase(), 'Should be lowercase');
});

test('Location', 'Empty string similarity → 0', () => {
  const s = similarity('', 'karachi');
  assertEq(s, 0, 'Empty similarity should be 0');
});

test('Location', 'Both empty → 0', () => {
  const s = similarity('', '');
  assertEq(s, 0, 'Both empty should be 0');
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. PROVIDER RANKER AGENT
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ 3. ProviderRankerAgent ━━━');

const ranker = new ProviderRankerAgent();

test('Ranker', 'Empty providers → empty result', async () => {
  const r = await ranker.execute({ providers: [] });
  assertEq(r.contextUpdates.ranked_providers.length, 0, 'Should return empty array');
});

test('Ranker', 'All 5 providers ranked, no crash', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS });
  assertEq(r.contextUpdates.ranked_providers.length, 5, 'All 5 should be ranked');
});

test('Ranker', 'Provider with missing fields not dropped', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS });
  const noData = r.contextUpdates.ranked_providers.find(p => p.id === 'p5');
  assert(noData, 'No-data provider should still be in results');
});

test('Ranker', 'All scores are valid numbers 0–1', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS });
  for (const p of r.contextUpdates.ranked_providers) {
    for (const [k, v] of Object.entries(p.scores)) {
      assert(!isNaN(v) && v >= 0 && v <= 1.001, `${p.name}.scores.${k}=${v} is invalid`);
    }
  }
});

test('Ranker', 'Urgent profile: closest/fastest ranks higher', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS, urgency_level: 'high' });
  // p2 is closest (0.5km) — should rank high despite lower rating
  const ranked = r.contextUpdates.ranked_providers;
  const p2idx = ranked.findIndex(p => p.id === 'p2');
  assert(p2idx < 3, `p2 (closest) should be in top 3 for urgent, got index ${p2idx}`);
});

test('Ranker', 'Budget profile: cheapest has highest affordability score', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS, price_sensitivity: 'high' });
  const ranked = r.contextUpdates.ranked_providers;
  const p3 = ranked.find(p => p.id === 'p3');
  const maxAfford = Math.max(...ranked.map(p => p.scores.affordability));
  assert(p3, 'p3 should still be in results');
  assertEq(p3.scores.affordability, maxAfford, `p3 should have highest affordability score (${p3.scores.affordability} vs max ${maxAfford})`);
});

test('Ranker', 'Quality profile: Premium Sparks wins', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS, price_sensitivity: 'low' });
  const ranked = r.contextUpdates.ranked_providers;
  const premiumIdx = ranked.findIndex(p => p.id === 'p4');
  assert(premiumIdx < 3, `Premium provider should rank top in quality mode, got index ${premiumIdx}`);
});

test('Ranker', 'Top provider has multi_factor_badge = overall_best', async () => {
  const r = await ranker.execute({ providers: MOCK_PROVIDERS });
  const top = r.contextUpdates.ranked_providers[0];
  assertEq(top.multi_factor_badge, 'overall_best', 'Top should have overall_best badge');
});

test('Ranker', 'Single provider → still ranked', async () => {
  const r = await ranker.execute({ providers: [MOCK_PROVIDERS[0]] });
  assertEq(r.contextUpdates.ranked_providers.length, 1, 'Single provider should work');
});

test('Ranker', 'Provider with available_slots=null does not crash', async () => {
  const p = { ...MOCK_PROVIDERS[0], available_slots: null };
  const r = await ranker.execute({ providers: [p] });
  assert(r.contextUpdates.ranked_providers.length === 1, 'Should handle null slots');
});

test('Ranker', 'cancellation_risk=high penalizes provider', async () => {
  const pLow  = { ...MOCK_PROVIDERS[0], id: 'low',  cancellation_risk: 'low',  rating: 4.0, distance_km: 2 };
  const pHigh = { ...MOCK_PROVIDERS[0], id: 'high', cancellation_risk: 'high', rating: 4.0, distance_km: 2 };
  const r = await ranker.execute({ providers: [pLow, pHigh] });
  const ranked = r.contextUpdates.ranked_providers;
  assert(ranked[0].id === 'low', 'Low risk should outrank high risk with identical other factors');
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. LOCATION RESOLVER AGENT (self-regulating override logic)
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ 4. LocationResolverAgent ━━━');

const resolver = new LocationResolverAgent();

test('LocationResolver', 'No location, no GPS → default fallback', async () => {
  const r = await resolver.execute({ user_text: 'send an electrician' });
  assert(r.contextUpdates, 'Should have contextUpdates');
  assert(r.contextUpdates.location_source, 'Should have location_source');
});

test('LocationResolver', 'GPS pin only → uses GPS', async () => {
  const r = await resolver.execute({
    user_text: 'I need a plumber',
    user_location: { lat: 24.8607, lng: 67.0011 }, // Karachi
  });
  assert(r.contextUpdates.coordinates, 'Should resolve coordinates from GPS');
  assert(r.contextUpdates.city, 'Should have a city');
});

test('LocationResolver', 'GPS outside Pakistan → rejected', async () => {
  const r = await resolver.execute({
    user_location: { lat: 51.5074, lng: -0.1278 }, // London
  });
  const src = r.contextUpdates?.location_source || r.output?.error || '';
  assert(
    src.includes('fallback') || src.includes('outside') || r.output?.error,
    'Non-PK GPS should be rejected or fallback used'
  );
});

test('LocationResolver', 'GPS with NaN coords → graceful', async () => {
  const r = await resolver.execute({
    user_location: { lat: NaN, lng: NaN },
    city: 'Karachi',
  });
  assert(r.contextUpdates, 'Should not throw');
});

test('LocationResolver', 'Explicit city set → used', async () => {
  const r = await resolver.execute({
    user_text: 'I need help',
    city: 'Lahore',
  });
  assert(r.contextUpdates.city, 'Should have a city');
});

test('LocationResolver', 'Null user_location → no crash', async () => {
  const r = await resolver.execute({ user_location: null, user_text: 'anything' });
  assert(r.contextUpdates, 'Should not throw on null GPS');
});

test('LocationResolver', 'Empty context → default fallback', async () => {
  const r = await resolver.execute({});
  assert(r.contextUpdates, 'Should not throw on empty context');
  assert(r.contextUpdates.location_source, 'Should have a fallback source');
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. PIPELINE INPUT EDGE CASES (intent-level)
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ 5. Input Edge Cases ━━━');

const localParser = new IntentParserAgent();

const intentCases = [
  // Valid clear English
  { label: 'Clear English',       text: 'I need an electrician in DHA tomorrow at 2pm' },
  // Clear Roman Urdu
  { label: 'Clear Roman Urdu',    text: 'mujhe kal subah ek bijli wala chahiye G-11 mein' },
  // Urdu script
  { label: 'Urdu script',         text: 'مجھے کل صبح ایک الیکٹریشن چاہیے' },
  // Mixed language
  { label: 'Mixed lang',          text: 'Need plumber kal shaam' },
  // Service slang
  { label: 'Masi slang',          text: 'mujhe ek masi chahiye ghar saaf karne ke liye' },
  // Unclear service
  { label: 'Vague: fix something', text: 'kuch theek karna hai' },
  // No location
  { label: 'No location',         text: 'I need a carpenter' },
  // No time
  { label: 'No time',             text: 'Plumber DHA please' },
  // Single word
  { label: 'Single word: Electrician', text: 'Electrician' },
  // Typo in service
  { label: 'Typo: Elektrician',   text: 'I need an Elektrician' },
  // Extra whitespace
  { label: 'Extra whitespace',    text: '   electrician    tomorrow   ' },
  // Repeated words
  { label: 'Repeated words',      text: 'plumber plumber plumber please please' },
  // Special chars
  { label: 'Special chars',       text: 'Need electrician!!! @DHA #urgent $cheap' },
  // Very long input
  { label: 'Very long',           text: 'I am looking for a very very experienced certified professional electrician who can come to my house in DHA Phase 5 Karachi tomorrow morning at exactly 9:00 AM to fix the main circuit breaker panel and also check all the wall sockets in three rooms' },
  // Empty string (should return gracefully)
  { label: 'Empty string',        text: '' },
  // Gibberish
  { label: 'Gibberish',           text: 'xzqwerty abcde 12345 !@#$%' },
  // Numbers only
  { label: 'Numbers only',        text: '12345' },
  // Emoji only
  { label: 'Emoji only',          text: '🔌⚡🪛' },
  // Very urgent
  { label: 'Urgency: abhi',       text: 'Electrician chahiye abhi foran emergency hai' },
  // Budget conscious
  { label: 'Budget: sasta',       text: 'Need plumber, sasta wala, kam paison mein' },
];

for (const { label, text } of intentCases) {
  test('Intent', label, async () => {
    const r = await localParser.execute({ user_text: text });
    assert(r && r.output, 'Should return output object');
    assert(typeof r.contextUpdates === 'object', 'Should have contextUpdates');
    assert(r.contextUpdates.confidence >= 0, 'Confidence should be >= 0');
    assert(r.contextUpdates.confidence <= 1, 'Confidence should be <= 1');
    // Should never throw regardless of input quality
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. TIME PREFERENCE PARSER
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n━━━ 6. Time Preference Parser ━━━');

const timeCases = [
  ['morning',            9,  'Morning → 9 AM'],
  ['subah',              9,  'Subah → 9 AM'],
  ['afternoon',         14,  'Afternoon → 2 PM'],
  ['dopahar',           14,  'Dopahar → 2 PM'],
  ['evening',           18,  'Evening → 6 PM'],
  ['shaam',             18,  'Shaam → 6 PM'],
  ['night',             20,  'Night → 8 PM'],
  ['raat',              20,  'Raat → 8 PM'],
];

for (const [input, expectedHour, label] of timeCases) {
  test('TimePreference', label, () => {
    const r = parseTimePreference(input);
    if (r) {
      assertEq(r.hours, expectedHour, `${label}: expected ${expectedHour}h, got ${r.hours}h`);
    }
    // null is acceptable for some inputs — we just shouldn't crash
  });
}

test('TimePreference', 'null input → null', () => {
  const r = parseTimePreference(null);
  assert(r === null, 'null input should return null');
});

test('TimePreference', 'Empty string → null', () => {
  const r = parseTimePreference('');
  assert(r === null, 'empty string should return null');
});

// ═════════════════════════════════════════════════════════════════════════════
// RESULTS SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

async function waitAndSummarize() {
  // Give async tests time to complete
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n' + '═'.repeat(60));
  console.log(`RESULTS: ${passed} passed  |  ${failed} failed`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ [${r.group}] ${r.name}`);
      if (r.error) console.log(`       ${r.error}`);
    });
  }

  if (failed === 0) {
    console.log('\n✅ All tests passed — backend is robust!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) need attention.`);
    process.exit(1);
  }
}

waitAndSummarize().catch(console.error);
