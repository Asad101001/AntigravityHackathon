'use strict';
const assert = require('assert');
const locationService = require('../services/locationResolver');

(async () => {
  // Basic smoke test: when given a fake session lastKnownLocation, resolver should return coordinates
  const ctx = { session: { lastKnownLocation: { lat: 24.915, lng: 67.082, label: 'Gulzar-e-Hijri' } } };
  const res = await locationService.resolve(ctx);
  assert(res && res.output, 'Resolver returned no output');
  // If reverse mapping not available, we still expect contextUpdates.coordinates to exist
  const coords = res.contextUpdates && res.contextUpdates.coordinates;
  assert(coords && (coords.lat != null || coords.lng != null), 'Expected coordinates to be present in contextUpdates');
})();
