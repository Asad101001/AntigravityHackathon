/**
 * Agent 3: ProviderDiscovererAgent — Two-Pass Distance Filter
 *
 * Pass 1 (free):  Haversine straight-line sort → top 5 candidates from providers.json
 * Pass 2 (paid):  Google Maps Distance Matrix API → real driving time & distance
 *                 for those 5 only. Costs $0.005 × 5 = $0.025 per user query.
 *
 * Output shape per provider:
 *   { id, name, service, lat, lng, distance_km, response_time_min, phone, rating }
 */

const BaseAgent = require('./BaseAgent');
const { withRetry } = require('../utils/retryHelper');
const dataStore = require('../dataStore');

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
    const providers = await dataStore.getProviders();
    const coordinatesByCity = await dataStore.getCoordinates();

    if (!coordinates?.lat || !coordinates?.lng) {
      return {
        input: context,
        output: { providers: [], error: 'No resolved coordinates in context' },
        reasoning: 'Cannot discover providers without resolved coordinates.',
        contextUpdates: { providers: [], nearby_providers: [], provider_discovery_failed: true },
      };
    }

    const { lat: userLat, lng: userLng } = coordinates;

    // ── Pass 1: Haversine filter ─────────────────────────────────────────
    const filtered = this._filterByType(providers, service_type)
      .map(provider => this._withResolvedCoordinates(provider, coordinatesByCity))
      .filter(provider => this._hasUsableCoordinates(provider));
    const ranked   = this._haversineRank(filtered, userLat, userLng);
    const topN     = ranked.slice(0, TOP_N_HAVERSINE);

    if (!topN.length) {
      return {
        input: { coordinates, service_type },
        output: { providers: [] },
        reasoning: `No providers found for type "${service_type}" near (${userLat}, ${userLng}).`,
        contextUpdates: { providers: [], nearby_providers: [], provider_count: 0 },
      };
    }

    // ── Pass 2: Distance Matrix for exact driving metrics ────────────────
    let enriched = topN.map(provider => this._withEstimatedTravel(provider));
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
        providers: enriched,
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
    const t = this._normalizeServiceText(serviceType);
    return list.filter(p => {
      const searchable = [
        p.service,
        p.type,
        ...(p.services || []),
        ...(p.specialization || [])
      ]
        .filter(Boolean)
        .map(value => this._normalizeServiceText(value));

      return searchable.some(value => value.includes(t) || t.includes(value));
    });
  }

  _normalizeServiceText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _withResolvedCoordinates(provider, coordinatesByCity) {
    if (provider.lat != null && provider.lng != null) return provider;

    const cityKey = this._findCoordinateCityKey(provider.city, coordinatesByCity);
    const cityCoordinates = cityKey ? coordinatesByCity[cityKey] : null;
    const areaCoordinates = cityCoordinates ? this._findAreaCoordinates(cityCoordinates, provider.area) : null;

    if (!areaCoordinates) return provider;

    return {
      ...provider,
      lat: areaCoordinates.lat,
      lng: areaCoordinates.lng,
      coordinates_source: 'local_area_cache',
    };
  }

  _findCoordinateCityKey(city, coordinatesByCity) {
    const normalizedCity = this._normalizeAreaKey(city);
    return Object.keys(coordinatesByCity || {}).find(key => this._normalizeAreaKey(key) === normalizedCity);
  }

  _findAreaCoordinates(cityCoordinates, area) {
    const normalizedArea = this._normalizeAreaKey(area);
    const exactKey = Object.keys(cityCoordinates).find(key => this._normalizeAreaKey(key) === normalizedArea);
    if (exactKey) return cityCoordinates[exactKey];

    const partialKey = Object.keys(cityCoordinates).find(key => {
      const normalizedKey = this._normalizeAreaKey(key);
      return normalizedKey.includes(normalizedArea) || normalizedArea.includes(normalizedKey);
    });
    return partialKey ? cityCoordinates[partialKey] : null;
  }

  _normalizeAreaKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\be\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _hasUsableCoordinates(provider) {
    return Number.isFinite(Number(provider.lat)) && Number.isFinite(Number(provider.lng));
  }

  _withEstimatedTravel(provider) {
    return {
      ...provider,
      distance_km: provider.haversine_km,
      response_time_min: Math.max(5, Math.round(provider.haversine_km * 2.5)),
      distance_source: 'haversine_estimate',
    };
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
        ...this._withEstimatedTravel(p),
        distance_source: 'haversine_fallback',
      }));
    }

    if (data?.status !== 'OK') {
      console.warn('[ProviderDiscoverer] Distance Matrix status:', data?.status);
      return topProviders.map(p => ({
        ...this._withEstimatedTravel(p),
        distance_source: 'haversine_fallback',
      }));
    }

    const elements = data.rows?.[0]?.elements ?? [];

    return topProviders.map((provider, i) => {
      const el = elements[i];
      if (!el || el.status !== 'OK') {
        return {
          ...this._withEstimatedTravel(provider),
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