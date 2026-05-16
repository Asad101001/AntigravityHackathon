/**
 * LocationResolverAgent.js — v3  (Zero-hardcode, never-crash edition)
 *
 * Resolution waterfall:
 *   1. Typed location string (text wins over GPS)
 *      a. Ambiguous area? → disambiguate using city extracted from user_text
 *      b. Local coordinates cache (fast, free)
 *      c. Google Geocoding API (accurate, $0.005/call)
 *      d. City-name match → authoritative city-centre coords
 *   2. City inference from user_text (when no location was typed at all)
 *   3. Explicit map-pin / GPS coordinates
 *   4. DEFAULT_CITY env-var fallback (never null)
 *
 * Key fixes over v2:
 *   • City-only resolution uses CITY_CENTERS (real centres), not a computed
 *     area centroid that happened to land on Gulshan.
 *   • Ambiguous area names (DHA, Defence) are disambiguated by scanning
 *     the user's raw text for any city keyword before touching the cache.
 *   • When the user types nothing at all, city keywords in their request
 *     are used to infer a city rather than silently returning null.
 *   • All async paths are wrapped in try/catch — never throws to orchestrator.
 */

'use strict';

const BaseAgent             = require('./BaseAgent');
const { findLocationCandidate, getLocationCatalog } = require('../utils/locationNormalizer');
const { withRetry }         = require('../utils/retryHelper');

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

// Pakistan bounding box — used to reject out-of-country geocoding results
const PAK_BBOX = { latMin: 23.0, latMax: 37.5, lngMin: 60.0, lngMax: 77.5 };

// ── Authoritative city-centre coordinates ─────────────────────────────────────
// These are used whenever the resolver confirms a city name but no specific area.
// Never derived from the area centroid (which drifts based on what's in the DB).
const CITY_CENTERS = {
  karachi:    { lat: 24.8607, lng: 67.0104, area_name: 'Karachi'     },
  lahore:     { lat: 31.5204, lng: 74.3587, area_name: 'Lahore'      },
  islamabad:  { lat: 33.7215, lng: 73.0433, area_name: 'Islamabad'   },
  rawalpindi: { lat: 33.5651, lng: 73.0169, area_name: 'Rawalpindi'  },
  faisalabad: { lat: 31.4504, lng: 73.1350, area_name: 'Faisalabad'  },
  peshawar:   { lat: 34.0150, lng: 71.5249, area_name: 'Peshawar'    },
  quetta:     { lat: 30.1798, lng: 66.9750, area_name: 'Quetta'      },
  multan:     { lat: 30.1575, lng: 71.5249, area_name: 'Multan'      },
  hyderabad:  { lat: 25.3960, lng: 68.3578, area_name: 'Hyderabad'   },
  gujranwala: { lat: 32.1877, lng: 74.1945, area_name: 'Gujranwala'  },
};

// ── City keyword aliases for free-text city extraction ────────────────────────
const CITY_ALIASES = {
  karachi:    ['karachi', ' khi', 'krc', 'karaachi'],
  lahore:     ['lahore', 'lhr', 'lhe', 'lahor'],
  islamabad:  ['islamabad', ' isb', ' isl'],
  rawalpindi: ['rawalpindi', 'pindi', ' rwp', 'rawalpindi'],
  faisalabad: ['faisalabad', 'fsd', 'lyallpur'],
  peshawar:   ['peshawar', 'pew', 'pesh'],
  quetta:     ['quetta'],
  multan:     ['multan', 'mul'],
  hyderabad:  ['hyderabad', 'hyd'],
  gujranwala: ['gujranwala', 'gujran'],
};

// ── Area names present in MORE than one city (require disambiguation) ─────────
// Checked by seeing if the user-typed area substring appears in this set.
const AMBIGUOUS_AREA_KEYWORDS = new Set([
  'dha', 'defence', 'bahria', 'johar town', 'model town', 'gulberg', 'cantonment', 'cant',
]);

// Pakistan-wide default city — overridable via env
const DEFAULT_CITY_KEY = (process.env.DEFAULT_CITY || 'karachi').toLowerCase().trim();

// ─────────────────────────────────────────────────────────────────────────────

class LocationResolverAgent extends BaseAgent {
  constructor() {
    super('resolve_location', 2);
    this.apiKey = process.env.MAPS_API_KEY || null;
    if (!this.apiKey) {
      console.warn('[LocationResolver] MAPS_API_KEY not set — falling back to local cache only');
    }
  }

  // ── Public entry point ────────────────────────────────────────────────
  async execute(context) {
    try {
      return await this._resolve(context);
    } catch (err) {
      console.error('[LocationResolver] Unexpected error:', err.message);
      return this._defaultFallback(context, `Unexpected error: ${err.message}`);
    }
  }

  async _resolve(context) {
    const rawLocation = this._usableParsedLocation(context.location);
    const userText    = String(context.user_text || '').toLowerCase();

    // ── 1. Typed location ───────────────────────────────────────────────
    if (rawLocation) {
      return await this._resolveTyped(rawLocation, userText, context);
    }

    // ── 2. City inferred from user text (no area typed, no GPS) ─────────
    const inferredCity = this._extractCityFromText(userText);
    if (inferredCity) {
      const coords = CITY_CENTERS[inferredCity];
      if (coords) {
        return this._cityResult(inferredCity, coords, 'city_inference',
          `No explicit location in request. Detected city "${inferredCity}" from user text. Using city-centre coordinates.`);
      }
    }

    // ── 3. Explicit GPS / map-pin coordinates ───────────────────────────
    const pin = context.user_location;
    if (pin?.lat != null && pin?.lng != null) {
      const lat = Number(pin.lat);
      const lng = Number(pin.lng);
      if (!this._inPakistan(lat, lng)) {
        return this._reject({ lat, lng }, 'Coordinates outside Pakistan bounding box');
      }
      return {
        input:  pin,
        output: { lat, lng, area_name: pin.label || 'Pinned location', city: pin.city || null, source: context.location_source || 'map' },
        reasoning: `No typed location. Using ${context.location_source || 'map'} coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
        contextUpdates: {
          coordinates:         { lat, lng },
          city:                pin.city || null,
          resolved_area:       pin.label || 'Pinned location',
          location_confidence: 1,
          location_source:     context.location_source || 'map',
        },
      };
    }

    // ── 4. Last resort: DEFAULT_CITY env var ────────────────────────────
    return this._defaultFallback(context, `No location detected via text, GPS, or map. Using DEFAULT_CITY="${DEFAULT_CITY_KEY}".`);
  }

  // ── Typed-location resolution waterfall ──────────────────────────────
  async _resolveTyped(rawLocation, userText, context) {
    // (a) Check for ambiguous area → disambiguate first
    const isAmbiguous = this._isAmbiguous(rawLocation);

    if (isAmbiguous) {
      const cityKey = this._extractCityFromText(userText)
                   || this._extractCityFromText(rawLocation.toLowerCase())
                   || DEFAULT_CITY_KEY;
      const result  = this._disambiguateArea(rawLocation, cityKey);
      if (result) return result;
    }

    // (b) Local coordinates cache (fuzzy match)
    const cached = this._fromLocalCache(rawLocation);
    if (cached) return cached;

    // (c) Google Geocoding API
    if (this.apiKey) {
      const geo = await this._geocode(rawLocation);
      if (geo) {
        return {
          input:    rawLocation,
          output:   geo,
          reasoning: `Google Geocoding resolved "${rawLocation}" → ${geo.area_name} (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}, confidence ${geo.confidence}).`,
          contextUpdates: {
            coordinates:         { lat: geo.lat, lng: geo.lng },
            city:                geo.city,
            resolved_area:       geo.area_name,
            location:            geo.area_name,
            location_confidence: geo.confidence,
            location_source:     'geocoding_api',
          },
        };
      }
    }

    // (d) rawLocation might itself be a city name
    const cityFromRaw = this._extractCityFromText(rawLocation.toLowerCase());
    if (cityFromRaw) {
      const coords = CITY_CENTERS[cityFromRaw];
      if (coords) {
        return this._cityResult(cityFromRaw, coords, 'city_name_match',
          `"${rawLocation}" matched city name. Using city-centre coordinates.`);
      }
    }

    // Nothing worked
    return {
      input:   rawLocation,
      output:  { lat: null, lng: null, area_name: null, city: null, fallback: true },
      reasoning: `Could not resolve "${rawLocation}" via cache, geocoding, or city match. User must clarify.`,
      contextUpdates: { coordinates: null, city: null, resolved_area: null, location_fallback: true },
    };
  }

  // ── Ambiguous-area disambiguation ─────────────────────────────────────
  // Scans the full location catalog for entries that belong to the resolved
  // city and whose normalized form overlaps with the typed area string.
  _disambiguateArea(rawLocation, cityKey) {
    const cityName     = this._titleCase(cityKey);
    const normalRaw    = rawLocation.toLowerCase().replace(/[-_]+/g, ' ').trim();
    const catalog      = getLocationCatalog();

    const best = catalog
      .filter(item => !item.cityOnly && item.city === cityName && item.coords?.lat)
      .find(item => {
        const norm = item.normalized;
        return norm.includes(normalRaw) || normalRaw.includes(norm.split(' ')[0]);
      });

    if (!best) return null;

    const { lat, lng } = best.coords;
    if (!this._inPakistan(lat, lng)) return null;

    return {
      input:    rawLocation,
      output:   { lat, lng, area_name: best.coords.area_name, city: cityName, source: 'local_cache_disambiguated' },
      reasoning: `Ambiguous area "${rawLocation}" → disambiguated to ${cityName} using city context from user text.`,
      contextUpdates: {
        coordinates:         { lat, lng },
        city:                cityName,
        resolved_area:       best.coords.area_name,
        location:            best.coords.area_name,
        location_confidence: Math.max(best.confidence || 0.7, 0.7),
        location_source:     'local_cache_disambiguated',
      },
    };
  }

  // ── Local cache lookup (standard fuzzy) ──────────────────────────────
  _fromLocalCache(rawLocation) {
    const candidate = findLocationCandidate(rawLocation, { minConfidence: 0.55 });
    if (!candidate?.coords?.lat) return null;

    const { lat, lng } = candidate.coords;
    if (!this._inPakistan(lat, lng)) return null;

    // If findLocationCandidate returned a city-level entry (e.g. "Karachi"),
    // use our authoritative CITY_CENTERS instead of the computed area centroid.
    if (candidate.cityOnly) {
      const key    = candidate.city.toLowerCase();
      const center = CITY_CENTERS[key];
      if (center) {
        return this._cityResult(key, center, 'local_city_center',
          `"${rawLocation}" resolved to city "${candidate.city}". Using authoritative city-centre (not area centroid).`);
      }
    }

    return {
      input:    rawLocation,
      output:   { lat, lng, area_name: candidate.coords.area_name, city: candidate.city, source: 'local_cache' },
      reasoning: `Local cache matched "${rawLocation}" → ${candidate.coords.area_name} (confidence ${candidate.confidence}).`,
      contextUpdates: {
        coordinates:         { lat, lng },
        city:                candidate.city,
        resolved_area:       candidate.coords.area_name,
        location:            candidate.coords.area_name,
        location_confidence: candidate.confidence,
        location_source:     'local_cache',
      },
    };
  }

  // ── Google Geocoding ──────────────────────────────────────────────────
  async _geocode(locationString) {
    const query = encodeURIComponent(`${locationString}, Pakistan`);
    const url   = `${GEOCODING_ENDPOINT}?address=${query}&components=country:PK&key=${this.apiKey}&language=en`;

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

    const best = data.results[0];
    const { lat, lng } = best.geometry.location;
    if (!this._inPakistan(lat, lng)) return null;

    const city = this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2'])
              || this._extractComponent(best.address_components, ['administrative_area_level_1'])
              || 'Pakistan';

    const resultType = best.types?.[0] || '';
    const confidence = resultType.includes('sublocality') || resultType.includes('neighborhood') ? 0.95
                     : resultType.includes('locality') ? 0.85
                     : 0.70;

    return { lat, lng, area_name: best.formatted_address, city, confidence, source: 'geocoding_api', place_id: best.place_id };
  }

  // ── City extraction from free text ────────────────────────────────────
  // Uses word-boundary regex so "lhr" won't match inside "Lahore".
  _extractCityFromText(text = '') {
    const lower = text.toLowerCase();
    for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
      for (const alias of aliases) {
        const pattern = alias.trim();
        if (!pattern) continue;
        const re = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(lower)) return city;
      }
    }
    return null;
  }

  // ── Is this area name known to appear in multiple cities? ─────────────
  _isAmbiguous(rawLocation) {
    const lower = rawLocation.toLowerCase().replace(/[-_]+/g, ' ').trim();
    return [...AMBIGUOUS_AREA_KEYWORDS].some(kw => lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw));
  }

  // ── DEFAULT_CITY fallback ─────────────────────────────────────────────
  _defaultFallback(context, reason) {
    const key    = DEFAULT_CITY_KEY in CITY_CENTERS ? DEFAULT_CITY_KEY : 'karachi';
    const coords = CITY_CENTERS[key];
    return {
      input:    context.location || '',
      output:   { ...coords, source: 'default_city_fallback' },
      reasoning: reason,
      contextUpdates: {
        coordinates:         { lat: coords.lat, lng: coords.lng },
        city:                coords.area_name,
        resolved_area:       coords.area_name,
        location:            coords.area_name,
        location_confidence: 0.3,
        location_source:     'default_fallback',
        location_fallback:   true,
      },
    };
  }

  // ── Build a clean city-level result ──────────────────────────────────
  _cityResult(cityKey, coords, source, reasoning) {
    const cityName = coords.area_name;
    return {
      input:   cityKey,
      output:  { ...coords, source },
      reasoning,
      contextUpdates: {
        coordinates:         { lat: coords.lat, lng: coords.lng },
        city:                cityName,
        resolved_area:       cityName,
        location:            cityName,
        location_confidence: 0.65,
        location_source:     source,
      },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  _usableParsedLocation(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const normalized = text.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const skipSet = new Set([
      'current location', 'my current location', 'near me',
      'meri current location', 'mere current location', 'yahan', 'idhar',
    ]);
    return skipSet.has(normalized) ? '' : text;
  }

  _extractComponent(components = [], types = []) {
    for (const type of types) {
      const found = components.find(c => c.types?.includes(type));
      if (found) return found.long_name;
    }
    return null;
  }

  _inPakistan(lat, lng) {
    return lat >= PAK_BBOX.latMin && lat <= PAK_BBOX.latMax
        && lng >= PAK_BBOX.lngMin && lng <= PAK_BBOX.lngMax;
  }

  _titleCase(str = '') {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _reject(coords, reason) {
    return {
      input:   coords,
      output:  { error: reason },
      reasoning: reason,
      contextUpdates: { coordinates: null, city: null, resolved_area: null },
    };
  }
}

module.exports = LocationResolverAgent;