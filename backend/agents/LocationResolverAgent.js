/**
 * Agent 2: LocationResolverAgent — Google Geocoding Edition
 *
 * Resolution priority:
 *   1. Parsed location string from user text — geocode/cache it; typed intent wins
 *   2. Explicit user_location (map pin/GPS) — use only when text has no real location
 *   3. Return null → orchestrator will ask user to clarify
 *
 * Google Geocoding costs $0.005/request (free tier covers 40,000/month).
 * We bias every query to Pakistan to avoid mis-geocoding common area names.
 */

const BaseAgent   = require('./BaseAgent');
const { findLocationCandidate } = require('../utils/locationNormalizer');
const { withRetry } = require('../utils/retryHelper');

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
// Pakistan bounding box
const PAK_BBOX = { latMin: 23.0, latMax: 37.5, lngMin: 60.0, lngMax: 77.5 };

class LocationResolverAgent extends BaseAgent {
  constructor() {
    super('resolve_location', 2);
    this.apiKey = process.env.MAPS_API_KEY;
    if (!this.apiKey) {
      console.warn('[LocationResolver] MAPS_API_KEY not set — will use local cache only');
    }
  }

  // ── Public execute ────────────────────────────────────────────────────
  async execute(context) {
    const rawLocation = this._usableParsedLocation(context.location);

    // ── 1. Location explicitly typed in the request ─────────────────────
    // The text parser is authoritative: if the user wrote "Gulzar-e-Hijri"
    // while a map pin is also present, resolve the typed area and ignore the pin.
    if (rawLocation) {
      const cached = await this._fromLocalCache(rawLocation);
      if (cached) return cached;

      if (this.apiKey) {
        const geoResult = await this._geocode(rawLocation);
        if (geoResult) {
          return {
            input: rawLocation,
            output: geoResult,
            reasoning: `Google Geocoding resolved "${rawLocation}" → ${geoResult.area_name} (${geoResult.lat.toFixed(4)}, ${geoResult.lng.toFixed(4)}). Confidence: ${geoResult.confidence}.`,
            contextUpdates: {
              coordinates:        { lat: geoResult.lat, lng: geoResult.lng },
              city:               geoResult.city,
              resolved_area:      geoResult.area_name,
              location:           geoResult.area_name,
              location_confidence: geoResult.confidence,
              location_source:    'geocoding_api',
            },
          };
        }
      }

      return {
        input: rawLocation,
        output: { lat: null, lng: null, area_name: null, city: null, fallback: true },
        reasoning: `Could not resolve typed location "${rawLocation}". User must clarify location.`,
        contextUpdates: { coordinates: null, city: null, resolved_area: null, location_fallback: true },
      };
    }

    // ── 2. Explicit map-picked/current-location coordinates ─────────────
    const explicit = context.user_location;
    if (explicit?.lat != null && explicit?.lng != null) {
      const lat = Number(explicit.lat);
      const lng = Number(explicit.lng);
      if (!this._inPakistan(lat, lng)) {
        return this._reject({ lat, lng }, 'Coordinates outside Pakistan');
      }
      return {
        input: explicit,
        output: {
          lat, lng,
          area_name: explicit.label || 'Current location',
          city: explicit.city || null,
          source: context.location_source || 'map',
        },
        reasoning: `No typed location found. Using provided ${context.location_source || 'map'} coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
        contextUpdates: {
          coordinates:        { lat, lng },
          city:               explicit.city || null,
          resolved_area:      explicit.label || 'Current location',
          location_confidence: 1,
          location_source:    context.location_source || 'map',
        },
      };
    }

    // ── 3. Cannot resolve ──────────────────────────────────────────────
    return {
      input: context.location || '',
      output: { lat: null, lng: null, area_name: null, city: null, fallback: true },
      reasoning: 'No typed location or provided coordinates were available. User must clarify location.',
      contextUpdates: { coordinates: null, city: null, resolved_area: null, location_fallback: true },
    };
  }

  _usableParsedLocation(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const normalized = text.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const currentLocationOnly = new Set([
      'current location',
      'my current location',
      'near me',
      'meri current location',
      'mere current location',
      'yahan',
      'idhar'
    ]);
    return currentLocationOnly.has(normalized) ? '' : text;
  }

  async _fromLocalCache(rawLocation) {
    const candidate = await findLocationCandidate(rawLocation, { minConfidence: 0.55 });
    if (!candidate?.coords) return null;
    const { lat, lng } = candidate.coords;
    if (!this._inPakistan(lat, lng)) return this._reject({ lat, lng }, 'Coordinates outside Pakistan');
    return {
      input: rawLocation,
      output: { lat, lng, area_name: candidate.coords.area_name, city: candidate.city, source: 'local_cache' },
      reasoning: `Matched typed location "${rawLocation}" via local cache → ${candidate.coords.area_name}.`,
      contextUpdates: {
        coordinates:        { lat, lng },
        city:               candidate.city,
        resolved_area:      candidate.coords.area_name,
        location:           candidate.coords.area_name,
        location_confidence: candidate.confidence,
        location_source:    'local_cache',
      },
    };
  }

  // ── Google Geocoding ──────────────────────────────────────────────────
  async _geocode(locationString) {
    // Bias query to Pakistan so "Gulshan" doesn't resolve to somewhere in India
    const query   = encodeURIComponent(`${locationString}, Pakistan`);
    const url     = `${GEOCODING_ENDPOINT}?address=${query}&components=country:PK&key=${this.apiKey}&language=en`;

    let data;
    try {
      data = await withRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
        return res.json();
      }, { maxAttempts: 3, label: 'Geocoding' });
    } catch (err) {
      console.warn('[LocationResolver] Geocoding failed:', err.message);
      return null;
    }

    if (data?.status !== 'OK' || !data.results?.length) {
      console.warn('[LocationResolver] Geocoding status:', data?.status);
      return null;
    }

    const best   = data.results[0];
    const { lat, lng } = best.geometry.location;

    if (!this._inPakistan(lat, lng)) return null;

    // Extract city from address components
    const city = this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2'])
               || this._extractComponent(best.address_components, ['administrative_area_level_1'])
               || 'Pakistan';

    // Rough confidence based on result type
    const resultType = best.types?.[0] || '';
    const confidence = resultType.includes('sublocality') || resultType.includes('neighborhood')
      ? 0.95
      : resultType.includes('locality')
        ? 0.85
        : 0.70;

    return {
      lat,
      lng,
      area_name:  best.formatted_address,
      city,
      confidence,
      source:     'geocoding_api',
      place_id:   best.place_id,
    };
  }

  _extractComponent(components, types) {
    for (const type of types) {
      const found = components?.find(c => c.types.includes(type));
      if (found) return found.long_name;
    }
    return null;
  }

  _inPakistan(lat, lng) {
    return lat >= PAK_BBOX.latMin && lat <= PAK_BBOX.latMax
        && lng >= PAK_BBOX.lngMin && lng <= PAK_BBOX.lngMax;
  }

  _reject(coords, reason) {
    return {
      input: coords,
      output: { error: reason },
      reasoning: reason,
      contextUpdates: { coordinates: null, city: null, resolved_area: null },
    };
  }
}

module.exports = LocationResolverAgent;