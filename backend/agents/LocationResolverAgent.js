'use strict';

/**
 * Agent 2: LocationResolverAgent
 *
 * Resolution priority:
 *   1. Typed location (context.location) — if and only if it resolves to a real
 *      known area in the catalog or via Geocoding API. The system itself decides
 *      whether the typed text is a genuine area name by trying to resolve it.
 *      No hardcoded blocklists of "generic terms". If the text resolves → it's
 *      a real override. If it doesn't → it is not treated as an override.
 *
 *   2. GPS pin (context.user_location) — precise coordinates supplied by the app.
 *      Used when no typed override resolved to a real area.
 *
 *   3. Frontend-selected city (context.city / explicit_city)
 *
 *   4. City inferred from user_text
 *
 *   5. DEFAULT_CITY fallback
 */

const BaseAgent = require('./BaseAgent');
const db = require('../db');
const {
  findLocationCandidate,
  normalizeLocation,
  similarity,
  haversineKm,
} = require('../utils/locationNormalizer');
const { withRetry } = require('../utils/retryHelper');

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const PAK_BBOX = { latMin: 23.0, latMax: 37.5, lngMin: 60.0, lngMax: 77.5 };
const DEFAULT_CITY = process.env.DEFAULT_CITY || process.env.ASAANIYAT_DEFAULT_CITY || 'Karachi';

// Minimum confidence for a typed location string to count as a real area override.
// Below this threshold, the typed string is considered ambiguous/unresolvable and
// the GPS pin takes priority.
const TYPED_OVERRIDE_MIN_CONFIDENCE = 0.62;

class LocationResolverAgent extends BaseAgent {
  constructor() {
    super('resolve_location', 2);
    this.apiKey = process.env.MAPS_API_KEY || null;
    if (!this.apiKey) {
      console.warn('[LocationResolver] MAPS_API_KEY not set — local catalog + haversine only');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public entry point
  // ─────────────────────────────────────────────────────────────────────────

  async execute(context) {
    try {
      return await this._resolve(context);
    } catch (err) {
      console.error('[LocationResolver] Unexpected error:', err.message, err.stack);
      return this._defaultFallback(context, `Unexpected resolver error: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core resolution pipeline
  // ─────────────────────────────────────────────────────────────────────────

  async _resolve(context) {
    this.coordinatesByCity = await this._getCoordinatesByCity();

    const explicitCity = this._resolveCity(context.city || context.explicit_city || context.selected_city);
    const rawTypedLocation = String(context.location || '').trim();
    const userText = String(context.user_text || '');

    // ── Priority 1: Typed location override ────────────────────────────────
    // Attempt resolution even if the string looks ambiguous. The catalog
    // matching is the arbiter — no blocklist of words.
    if (rawTypedLocation) {
      const typedResult = await this._resolveTypedLocation(rawTypedLocation, explicitCity, userText);
      if (typedResult) {
        // typedResult.output.location_confidence tells us how certain we are.
        const conf = typedResult.contextUpdates?.location_confidence ?? 0;
        if (conf >= TYPED_OVERRIDE_MIN_CONFIDENCE) {
          console.log(`[LocationResolver] Typed override accepted: "${rawTypedLocation}" → ${typedResult.contextUpdates?.resolved_area} (conf ${conf})`);
          return typedResult;
        }
        // Resolved below threshold — log it and continue to GPS
        console.log(`[LocationResolver] Typed "${rawTypedLocation}" resolved below threshold (${conf}) — deferring to GPS pin`);
      } else {
        console.log(`[LocationResolver] Typed "${rawTypedLocation}" did not resolve — deferring to GPS pin`);
      }
    }

    // ── Priority 2: GPS / fetched device location ──────────────────────────
    const pinResult = await this._resolvePinnedCoordinates(context, explicitCity, rawTypedLocation, userText);
    if (pinResult) return pinResult;

    // ── Priority 3: Frontend-selected city (no GPS, no typed area) ────────
    if (explicitCity) {
      return this._cityResult(
        explicitCity.city,
        'explicit_city',
        `Frontend-selected city "${explicitCity.city}" used; no GPS pin or unambiguous typed area detected.`
      );
    }

    // ── Priority 4: City inferred from request text ────────────────────────
    const inferredCity = this._extractCityFromText(userText);
    if (inferredCity) {
      return this._cityResult(
        inferredCity.city,
        'city_text_match',
        `Detected city "${inferredCity.city}" from request text.`
      );
    }

    // ── Priority 5: Default city fallback ─────────────────────────────────
    return this._defaultFallback(context, `No usable location detected — falling back to DEFAULT_CITY="${DEFAULT_CITY}".`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Typed location: try local catalog → geocoding → null
  // Returns a full result object if confident, or null if unresolvable.
  // ─────────────────────────────────────────────────────────────────────────

  async _resolveTypedLocation(rawLocation, explicitCity, userText) {
    // 1. Try local fuzzy catalog scoped to the selected city first
    const local = await this._fromLocalCache(rawLocation, explicitCity?.city);
    if (local) return local;

    // 2. Try without city scope in case user typed a different city's area
    if (explicitCity?.city) {
      const unscoped = await this._fromLocalCache(rawLocation, null);
      if (unscoped) return unscoped;
    }

    // 3. Extract city from combined text and retry
    const textCity = this._extractCityFromText(`${rawLocation} ${userText}`);
    if (textCity && textCity.city !== explicitCity?.city) {
      const cityScoped = await this._fromLocalCache(rawLocation, textCity.city);
      if (cityScoped) return cityScoped;
    }

    // 4. Geocoding API as last resort for typed location
    if (this.apiKey) {
      const geo = await this._geocode(rawLocation, explicitCity?.city);
      if (geo) {
        return {
          input: { location: rawLocation, city: explicitCity?.city || null },
          output: geo,
          reasoning: `Google Geocoding resolved "${rawLocation}"${explicitCity ? ` within ${explicitCity.city}` : ''} to "${geo.area_name}".`,
          contextUpdates: {
            coordinates: { lat: geo.lat, lng: geo.lng },
            city: geo.city || explicitCity?.city || null,
            resolved_area: geo.area_name,
            location: geo.area_name,
            location_confidence: geo.confidence,
            location_source: 'geocoding_api',
          },
        };
      }
    }

    // 5. Could not resolve typed text to any real area
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GPS pin resolution
  // ─────────────────────────────────────────────────────────────────────────

  async _resolvePinnedCoordinates(context, explicitCity, rawLocation, userText) {
    const pin = context.user_location;
    if (!pin || pin.lat == null || pin.lng == null) return null;

    const lat = Number(pin.lat);
    const lng = Number(pin.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`[LocationResolver] GPS pin has non-finite coordinates: lat=${lat} lng=${lng}`);
      return null;
    }

    if (!this._inPakistan(lat, lng)) {
      console.warn(`[LocationResolver] GPS pin (${lat}, ${lng}) is outside Pakistan bounding box`);
      return this._reject({ lat, lng }, 'Coordinates outside Pakistan bounding box — ignoring GPS pin');
    }

    // Try local reverse geocode first (fast, no API cost)
    const localArea = await this._nearestArea(lat, lng, explicitCity?.city);
    if (localArea && localArea.distance_km <= this._localReverseRadiusKm(localArea.city)) {
      return this._pinResult({
        pin, lat, lng,
        areaName: localArea.coords.area_name,
        city: localArea.city,
        confidence: Math.min(0.97, Math.max(0.82, 1 - (localArea.distance_km / 15))),
        source: 'local_reverse_geocode',
        reasoning: `Reverse-geocoded GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}) against local catalog — nearest area "${localArea.coords.area_name}" is ${localArea.distance_km}km away.`,
        rawLocation, userText,
      });
    }

    // No local match within radius — try Google Reverse Geocoding
    if (this.apiKey) {
      const geo = await this._reverseGeocode(lat, lng);
      if (geo) {
        const city = geo.city || explicitCity?.city || (await this._nearestCity(lat, lng))?.city || null;
        return this._pinResult({
          pin, lat, lng,
          areaName: geo.area_name,
          city,
          confidence: geo.confidence,
          source: 'reverse_geocoding_api',
          placeId: geo.place_id,
          reasoning: `Google reverse geocoding resolved (${lat.toFixed(5)}, ${lng.toFixed(5)}) to "${geo.area_name}".`,
          rawLocation, userText,
        });
      }
    }

    // Last resort: use raw GPS coordinates with nearest city
    const nearestCity = await this._nearestCity(lat, lng);
    const city = this._resolveCity(pin.city)?.city || explicitCity?.city || nearestCity?.city || null;
    return this._pinResult({
      pin, lat, lng,
      areaName: pin.label || (city ? `${city} area` : 'Pinned location'),
      city,
      confidence: 0.68,
      source: context.location_source || 'gps_pin_raw',
      reasoning: `Using raw GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}) — no area match found in local catalog or Geocoding API.`,
      rawLocation, userText,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Local fuzzy catalog lookup
  // ─────────────────────────────────────────────────────────────────────────

  async _fromLocalCache(rawLocation, city) {
    let candidate = await findLocationCandidate(rawLocation, {
      minConfidence: TYPED_OVERRIDE_MIN_CONFIDENCE,
      city,
    });

    // If nothing found at primary threshold, try a wider search and let the
    // caller decide via confidence whether it qualifies as an override.
    if (!candidate) {
      candidate = await findLocationCandidate(rawLocation, {
        minConfidence: 0.45,
        city,
      });
    }

    if (!candidate?.coords?.lat) return null;

    const lat = Number(candidate.coords.lat);
    const lng = Number(candidate.coords.lng);
    if (!this._inPakistan(lat, lng)) {
      console.warn(`[LocationResolver] Local catalog entry for "${rawLocation}" has out-of-Pakistan coords`);
      return null;
    }

    if (candidate.cityOnly) {
      // City-level match — lower confidence, resolver will prefer GPS for
      // neighbourhood precision when a pin is available.
      return {
        input: { location: rawLocation, city: city || null },
        output: { lat, lng, area_name: candidate.city, city: candidate.city, source: 'local_city_match' },
        reasoning: `"${rawLocation}" matched city "${candidate.city}" (city-level only; no neighbourhood resolution).`,
        contextUpdates: {
          coordinates: { lat, lng },
          city: candidate.city,
          resolved_area: candidate.city,
          location: candidate.city,
          location_confidence: candidate.confidence * 0.85, // discount city-only
          location_source: 'local_city_match',
        },
      };
    }

    return {
      input: { location: rawLocation, city: city || null },
      output: {
        lat,
        lng,
        area_name: candidate.coords.area_name,
        city: candidate.city,
        source: 'local_fuzzy_catalog',
      },
      reasoning: `Local fuzzy catalog matched "${rawLocation}" → "${candidate.coords.area_name}" in ${candidate.city} (confidence ${candidate.confidence}).`,
      contextUpdates: {
        coordinates: { lat, lng },
        city: candidate.city,
        resolved_area: candidate.coords.area_name,
        location: candidate.coords.area_name,
        location_confidence: candidate.confidence,
        location_source: 'local_fuzzy_catalog',
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Google Geocoding (forward)
  // ─────────────────────────────────────────────────────────────────────────

  async _geocode(locationString, city) {
    const query = [locationString, city, 'Pakistan'].filter(Boolean).join(', ');
    const url = `${GEOCODING_ENDPOINT}?address=${encodeURIComponent(query)}&components=country:PK&key=${this.apiKey}&language=en`;

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

    if (data?.status !== 'OK' || !data.results?.length) return null;

    const best = data.results[0];
    const lat = Number(best.geometry?.location?.lat);
    const lng = Number(best.geometry?.location?.lng);
    if (!this._inPakistan(lat, lng)) return null;

    const resolvedCity =
      this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2']) ||
      this._extractComponent(best.address_components, ['administrative_area_level_1']) ||
      city ||
      (await this._nearestCity(lat, lng))?.city ||
      null;

    const areaName =
      this._extractComponent(best.address_components, ['neighborhood', 'sublocality_level_1', 'sublocality', 'route']) ||
      best.formatted_address;

    const resultType = best.types?.[0] || '';
    const confidence =
      resultType.includes('sublocality') || resultType.includes('neighborhood') ? 0.93
      : resultType.includes('locality') ? 0.80
      : 0.68;

    return { lat, lng, area_name: areaName, city: resolvedCity, confidence, source: 'geocoding_api', place_id: best.place_id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Google Reverse Geocoding
  // ─────────────────────────────────────────────────────────────────────────

  async _reverseGeocode(lat, lng) {
    const url = `${GEOCODING_ENDPOINT}?latlng=${encodeURIComponent(`${lat},${lng}`)}&components=country:PK&key=${this.apiKey}&language=en`;

    let data;
    try {
      data = await withRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Reverse geocoding HTTP ${res.status}`);
        return res.json();
      }, { maxAttempts: 3, label: 'ReverseGeocoding' });
    } catch (err) {
      console.warn('[LocationResolver] Reverse geocoding failed:', err.message);
      return null;
    }

    if (data?.status !== 'OK' || !data.results?.length) return null;

    // Prefer neighbourhood/sublocality results for precision
    const best = data.results.find(r =>
      r.types?.some(t => ['neighborhood', 'sublocality', 'sublocality_level_1'].includes(t))
    ) || data.results[0];

    const areaName =
      this._extractComponent(best.address_components, ['neighborhood', 'sublocality_level_1', 'sublocality', 'route']) ||
      best.formatted_address;

    const resolvedCity =
      this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2']) ||
      this._extractComponent(best.address_components, ['administrative_area_level_1']) ||
      (await this._nearestCity(lat, lng))?.city ||
      null;

    const preciseType = best.types?.some(t => ['neighborhood', 'sublocality', 'sublocality_level_1'].includes(t));

    return {
      lat, lng,
      area_name: areaName,
      city: resolvedCity,
      confidence: preciseType ? 0.94 : 0.80,
      source: 'reverse_geocoding_api',
      place_id: best.place_id,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // City resolution helpers
  // ─────────────────────────────────────────────────────────────────────────

  _resolveCity(cityText) {
    const text = String(cityText || '').trim();
    if (!text) return null;
    const normalized = normalizeLocation(text);
    let best = null;
    for (const city of Object.keys(this.coordinatesByCity || {})) {
      const score = similarity(normalized, city);
      if (!best || score > best.score) best = { city: this._titleCase(city), key: city, score };
    }
    return best?.score >= 0.64 ? best : null;
  }

  _extractCityFromText(text) {
    const normalized = normalizeLocation(text);
    let best = null;
    for (const city of Object.keys(this.coordinatesByCity || {})) {
      const wordMatch = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
      const score = wordMatch ? Math.max(similarity(normalized, city), 0.95) : similarity(normalized, city);
      if (!best || score > best.score) best = { city: this._titleCase(city), key: city, score };
    }
    return best?.score >= 0.76 ? best : null;
  }

  _cityResult(cityName, source, reasoning) {
    const center = this._cityCenter(cityName);
    return {
      input: cityName,
      output: { ...center, city: cityName, area_name: cityName, source },
      reasoning,
      contextUpdates: {
        coordinates: { lat: center.lat, lng: center.lng },
        city: cityName,
        resolved_area: cityName,
        location: cityName,
        location_confidence: source === 'explicit_city' ? 0.82 : 0.66,
        location_source: source,
      },
    };
  }

  _cityCenter(cityName) {
    const coordinatesByCity = this.coordinatesByCity || {};
    const cityKey =
      this._resolveCity(cityName)?.key ||
      this._resolveCity(DEFAULT_CITY)?.key ||
      Object.keys(coordinatesByCity)[0];
    const areas = Object.values(coordinatesByCity[cityKey] || {});
    const count = areas.length || 1;
    const lat = areas.reduce((sum, a) => sum + Number(a.lat || 0), 0) / count;
    const lng = areas.reduce((sum, a) => sum + Number(a.lng || 0), 0) / count;
    return { lat, lng };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Nearest area / city using haversine
  // ─────────────────────────────────────────────────────────────────────────

  async _nearestArea(lat, lng, city) {
    const requestedCity = city ? normalizeLocation(city) : '';
    let best = null;
    const catalog = await this._getLocationCatalog();

    for (const item of catalog) {
      if (item.cityOnly || !item.coords) continue;
      if (requestedCity && normalizeLocation(item.city) !== requestedCity) continue;

      const dist = haversineKm(
        { lat, lng },
        { lat: Number(item.coords.lat), lng: Number(item.coords.lng) }
      );
      if (dist == null) continue;
      if (!best || dist < best.distance_km) {
        best = { city: item.city, area: item.area, coords: item.coords, distance_km: dist };
      }
    }

    // If no match within city scope, widen to all cities
    if (!best && requestedCity) {
      return this._nearestArea(lat, lng, null);
    }

    return best;
  }

  async _nearestCity(lat, lng) {
    let best = null;
    const catalog = await this._getLocationCatalog();

    for (const item of catalog) {
      if (!item.cityOnly || !item.coords) continue;
      const dist = haversineKm(
        { lat, lng },
        { lat: Number(item.coords.lat), lng: Number(item.coords.lng) }
      );
      if (dist == null) continue;
      if (!best || dist < best.distance_km) {
        best = { city: item.city, distance_km: dist };
      }
    }

    return best;
  }

  // City density determines how tightly we cluster in reverse-geocode matching.
  // Larger / denser cities need tighter radii to avoid mis-attributing areas.
  _localReverseRadiusKm(city) {
    const n = normalizeLocation(city || '');
    if (n === 'karachi') return 7;
    if (n === 'lahore') return 6;
    if (n === 'islamabad' || n === 'rawalpindi') return 5;
    if (n === 'peshawar' || n === 'quetta' || n === 'multan') return 8;
    return 10; // smaller cities — wider radius is fine
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Result builders
  // ─────────────────────────────────────────────────────────────────────────

  _pinResult({ pin, lat, lng, areaName, city, confidence, source, placeId, reasoning, rawLocation, userText }) {
    const output = { lat, lng, area_name: areaName, city, source };
    if (placeId) output.place_id = placeId;
    return {
      input: { pin, parsed_location: rawLocation || null, user_text: userText || '' },
      output,
      reasoning,
      contextUpdates: {
        coordinates: { lat, lng },
        city,
        resolved_area: areaName,
        location: areaName,
        location_confidence: Math.round(confidence * 100) / 100,
        location_source: source,
      },
    };
  }

  _defaultFallback(context, reason) {
    console.warn('[LocationResolver] Using default fallback:', reason);
    const coordinatesByCity = this.coordinatesByCity || {};
    const fallbackCity = this._resolveCity(DEFAULT_CITY)?.city || Object.keys(coordinatesByCity)[0] || DEFAULT_CITY;
    const result = this._cityResult(fallbackCity, 'default_city_fallback', reason);
    result.input = context.location || '';
    result.contextUpdates.location_confidence = 0.30;
    result.contextUpdates.location_fallback = true;
    return result;
  }

  _reject(coords, reason) {
    console.warn('[LocationResolver] Rejecting coordinates:', reason);
    return {
      input: coords,
      output: { error: reason },
      reasoning: reason,
      contextUpdates: { coordinates: null, city: null, resolved_area: null },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  _extractComponent(components = [], types = []) {
    for (const type of types) {
      const found = components.find(c => c.types?.includes(type));
      if (found) return found.long_name;
    }
    return null;
  }

  _inPakistan(lat, lng) {
    return (
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= PAK_BBOX.latMin && lat <= PAK_BBOX.latMax &&
      lng >= PAK_BBOX.lngMin && lng <= PAK_BBOX.lngMax
    );
  }

  _titleCase(str = '') {
    return String(str)
      .split(/\s+/)
      .filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ');
  }

  async _getCoordinatesByCity() {
    try {
      return await db.getCoordinatesByCity();
    } catch (err) {
      console.warn('[LocationResolver] Could not load coordinate catalog:', err.message);
      return {};
    }
  }

  async _getLocationCatalog() {
    try {
      return await db.getLocationCatalog();
    } catch (err) {
      console.warn('[LocationResolver] Could not load location catalog:', err.message);
      return [];
    }
  }
}

module.exports = LocationResolverAgent;
