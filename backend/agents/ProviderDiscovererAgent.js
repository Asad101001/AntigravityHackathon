/**
 * Agent 3: ProviderDiscovererAgent — Two-Pass Distance Filter
 *
 * Pass 1 (free):  Haversine straight-line sort → top 5 candidates from providers.json
 * Pass 2 (paid):  Google Maps Distance Matrix API → real driving time & distance
 *                 for those 5 only. Costs $0.005 × 5 = $0.025 per user query.
 *
 * Output shape per provider:
 *   { id, name, type, lat, lng, distance_km, response_time_min, phone, rating }
 */

const BaseAgent = require('./BaseAgent');
const providers = require('../data/providers.json');
const { withRetry } = require('../utils/retryHelper');

const DISTANCE_MATRIX_ENDPOINT = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const TOP_N_HAVERSINE = 5;
const EARTH_RADIUS_KM = 6371;

class ProviderDiscovererAgent extends BaseAgent {
  constructor() {
    super('discover_providers', 3);
    this.apiKey = process.env.MAPS_API_KEY;
    if (!this.apiKey) {
      console.warn('[ProviderDiscoverer] MAPS_API_KEY not set — driving times will be estimated');
    }
  }

  async execute(context) {
    const { coordinates, service_type } = context;

    if (!coordinates?.lat || !coordinates?.lng) {
      return {
        input: context,
        output: { providers: [], error: 'No resolved coordinates in context' },
        reasoning: 'Cannot discover providers without resolved coordinates.',
        contextUpdates: { nearby_providers: [], provider_discovery_failed: true },
      };
    }

    const { lat: userLat, lng: userLng } = coordinates;

    // ── Pass 1: Haversine filter ─────────────────────────────────────────
    const filtered = this._filterByType(providers, service_type);
    const ranked   = this._haversineRank(filtered, userLat, userLng);
    const topN     = ranked.slice(0, TOP_N_HAVERSINE);

    if (!topN.length) {
      return {
        input: { coordinates, service_type },
        output: { providers: [] },
        reasoning: `No providers found for type "${service_type}" near (${userLat}, ${userLng}).`,
        contextUpdates: { nearby_providers: [], provider_count: 0 },
      };
    }

    // ── Pass 2: Distance Matrix for exact driving metrics ────────────────
    let enriched = topN;
    if (this.apiKey) {
      enriched = await this._enrichWithDrivingTimes(topN, userLat, userLng);
    }

    // Final sort by driving time if available, else straight-line distance
    enriched.sort((a, b) =>
      (a.response_time_min ?? a.haversine_km * 2) -
      (b.response_time_min ?? b.haversine_km * 2)
    );

    return {
      input: { coordinates, service_type },
      output: { providers: enriched },
      reasoning: [
        `Pass 1: Haversine-sorted ${filtered.length} providers → top ${topN.length} candidates.`,
        this.apiKey
          ? `Pass 2: Distance Matrix enriched all ${enriched.length} with driving time/distance.`
          : 'Pass 2: Skipped (no API key) — using haversine estimates.',
      ].join(' '),
      contextUpdates: {
        nearby_providers: enriched,
        provider_count:   enriched.length,
        closest_provider: enriched[0] ?? null,
      },
    };
  }

  // ── Haversine ─────────────────────────────────────────────────────────
  _haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat  = toRad(lat2 - lat1);
    const dLng  = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  _haversineRank(list, userLat, userLng) {
    return list
      .map(p => ({ ...p, haversine_km: parseFloat(this._haversineKm(userLat, userLng, p.lat, p.lng).toFixed(2)) }))
      .sort((a, b) => a.haversine_km - b.haversine_km);
  }

  _filterByType(list, serviceType) {
    if (!serviceType) return list;
    const t = serviceType.toLowerCase();
    return list.filter(p => p.type?.toLowerCase().includes(t) || p.services?.some(s => s.toLowerCase().includes(t)));
  }

  // ── Distance Matrix API ───────────────────────────────────────────────
  async _enrichWithDrivingTimes(topProviders, userLat, userLng) {
    const origin       = `${userLat},${userLng}`;
    const destinations = topProviders.map(p => `${p.lat},${p.lng}`).join('|');
    const url = `${DISTANCE_MATRIX_ENDPOINT}?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destinations)}&mode=driving&units=metric&key=${this.apiKey}&language=en&region=PK`;

    let data;
    try {
      data = await withRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`DistanceMatrix HTTP ${res.status}`);
        return res.json();
      }, { maxAttempts: 3, label: 'DistanceMatrix' });
    } catch (err) {
      console.warn('[ProviderDiscoverer] Distance Matrix failed:', err.message);
      return topProviders.map(p => ({
        ...p,
        distance_km:      p.haversine_km,
        response_time_min: Math.round(p.haversine_km * 2.5),
        distance_source:   'haversine_fallback',
      }));
    }

    if (data?.status !== 'OK') {
      console.warn('[ProviderDiscoverer] Distance Matrix status:', data?.status);
      return topProviders;
    }

    const elements = data.rows?.[0]?.elements ?? [];

    return topProviders.map((provider, i) => {
      const el = elements[i];
      if (!el || el.status !== 'OK') {
        return {
          ...provider,
          distance_km:       provider.haversine_km,
          response_time_min: Math.round(provider.haversine_km * 2.5),
          distance_source:   'haversine_fallback',
        };
      }

      const distance_km      = parseFloat((el.distance.value / 1000).toFixed(2));
      const response_time_min = Math.round(el.duration.value / 60);

      return {
        ...provider,
        distance_km,
        response_time_min,
        distance_text:   el.distance.text,
        duration_text:   el.duration.text,
        distance_source: 'distance_matrix_api',
      };
    });
  }
}

module.exports = ProviderDiscovererAgent;