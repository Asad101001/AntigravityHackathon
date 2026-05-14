/**
 * Agent 3: ProviderDiscovererAgent
 * Filters provider dataset by service type and dynamically computes distance from resolved/user-picked coordinates.
 */

const BaseAgent = require('./BaseAgent');
const db = require('../db');
const { haversineKm, normalizeLocation, similarity } = require('../utils/locationNormalizer');

class ProviderDiscovererAgent extends BaseAgent {
  constructor() {
    super('discover_providers', 3);
  }

  async execute(context) {
    const serviceType = context.service_type;
    const location = context.location;
    const city = context.city;
    const userCoords = context.coordinates;

    if (!serviceType) {
      return {
        input: { service: serviceType, location },
        output: { providers: [], count: 0 },
        reasoning: 'Cannot discover providers without a service type.',
        contextUpdates: { providers: [] }
      };
    }

    let providers = [];
    let radiusUsed = null;
    let source = 'text';

    if (userCoords) {
      const candidates = await db.findProvidersByService(serviceType);
      const withDistance = candidates
        .map(provider => {
          const computed = haversineKm(userCoords, { lat: provider.lat, lng: provider.lng });
          return { ...provider, distance_km: computed ?? provider.distance_km, computed_distance: computed !== null };
        })
        .sort((a, b) => a.distance_km - b.distance_km);

      providers = withDistance.filter(p => p.distance_km <= 5);
      radiusUsed = 5;
      if (providers.length === 0) {
        providers = withDistance.filter(p => p.distance_km <= 10);
        radiusUsed = 10;
      }
      if (providers.length === 0 && city) {
        providers = withDistance.filter(p => normalizeLocation(p.city) === normalizeLocation(city));
        source = 'city_fallback';
      }
      if (providers.length === 0) {
        providers = withDistance.slice(0, 5);
        source = 'nearest_fallback';
      }
      source = source === 'text' ? 'coordinate_distance' : source;
    } else {
      const searchLoc = location || city || '';
      providers = await db.findProviders(serviceType, searchLoc);
      if (providers.length === 0 && searchLoc) {
        const all = await db.findProvidersByService(serviceType);
        providers = all
          .map(provider => ({ ...provider, location_similarity: Math.max(similarity(provider.area, searchLoc), similarity(provider.city, searchLoc)) }))
          .filter(provider => provider.location_similarity >= 0.45)
          .sort((a, b) => b.location_similarity - a.location_similarity)
          .slice(0, 5);
        source = 'fuzzy_text_fallback';
      }
    }

    providers = providers.slice(0, 10);
    let reasoning = `Found ${providers.length} ${serviceType} providers using ${source}`;
    if (radiusUsed) reasoning += ` within ${radiusUsed}km`;
    if (providers.length > 0) reasoning += `. Closest/top: ${providers[0].name} (${providers[0].distance_km}km, ${providers[0].rating}★).`;

    return {
      input: { service: serviceType, location, city, coordinates: userCoords || null },
      output: { providers, count: providers.length, source, radius_km: radiusUsed },
      reasoning,
      contextUpdates: { providers, provider_discovery_source: source, provider_radius_km: radiusUsed }
    };
  }
}

module.exports = ProviderDiscovererAgent;
