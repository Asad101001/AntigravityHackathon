'use strict';

const BaseAgent = require('./BaseAgent');
const db = require('../db');
const {
  findLocationCandidate,
  getLocationCatalog,
  normalizeLocation,
  similarity,
  haversineKm,
} = require('../utils/locationNormalizer');
const { withRetry } = require('../utils/retryHelper');

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';
const PAK_BBOX = { latMin: 23.0, latMax: 37.5, lngMin: 60.0, lngMax: 77.5 };
const DEFAULT_CITY = process.env.DEFAULT_CITY || process.env.ASAANIYAT_DEFAULT_CITY || 'Karachi';

class LocationResolverAgent extends BaseAgent {
  constructor() {
    super('resolve_location', 2);
    this.apiKey = process.env.MAPS_API_KEY || null;
    if (!this.apiKey) {
      console.warn('[LocationResolver] MAPS_API_KEY not set; using local catalog matching only');
    }
  }

  async execute(context) {
    try {
      return await this._resolve(context);
    } catch (err) {
      console.error('[LocationResolver] Unexpected error:', err.message);
      return this._defaultFallback(context, `Unexpected resolver error: ${err.message}`);
    }
  }

  async _resolve(context) {
    this.coordinatesByCity = await this._getCoordinatesByCity();
    const explicitCity = this._resolveCity(context.city || context.explicit_city || context.selected_city);
    const rawLocation = this._usableParsedLocation(context.location);
    const userText = String(context.user_text || '');

    let typedFallback = null;
    if (rawLocation) {
      const typedResolution = await this._resolveTyped(rawLocation, explicitCity, userText);
      // If it resolved to a real neighborhood, local match, or geocoding coordinates (not a fallback)
      if (typedResolution && typedResolution.output && !typedResolution.output.fallback && typedResolution.output.source !== 'explicit_city_area_fallback') {
        return typedResolution;
      }
      typedFallback = typedResolution;
    }

    const pinResolution = await this._resolvePinnedCoordinates(context, explicitCity, rawLocation, userText);
    if (pinResolution) return pinResolution;

    if (typedFallback) {
      return typedFallback;
    }

    if (explicitCity) {
      return this._cityResult(explicitCity.city, 'explicit_city', `Frontend selected city "${explicitCity.city}". No typed area or GPS pin was provided, so city-level coordinates were used.`);
    }

    const inferredCity = this._extractCityFromText(userText);
    if (inferredCity) {
      return this._cityResult(inferredCity.city, 'city_text_match', `Detected city "${inferredCity.city}" from request text.`);
    }

    return this._defaultFallback(context, `No usable location was detected. Falling back to DEFAULT_CITY="${DEFAULT_CITY}".`);
  }

  async _resolvePinnedCoordinates(context, explicitCity, rawLocation, userText) {
    const pin = context.user_location;
    if (pin?.lat == null || pin?.lng == null) return null;

    const lat = Number(pin.lat);
    const lng = Number(pin.lng);
    if (!this._inPakistan(lat, lng)) {
      return this._reject({ lat, lng }, 'Coordinates outside Pakistan bounding box');
    }

    const localArea = await this._nearestArea(lat, lng, explicitCity?.city);
    if (localArea && localArea.distance_km <= this._localReverseRadiusKm(localArea.city)) {
      return this._pinResult({
        pin,
        lat,
        lng,
        areaName: localArea.coords.area_name,
        city: localArea.city,
        confidence: Math.max(0.82, 1 - (localArea.distance_km / 20)),
        source: 'local_reverse_geocode',
        reasoning: `Reverse-geocoded exact user GPS (${lat}, ${lng}) against coordinates.json and matched ${localArea.coords.area_name} ${localArea.distance_km}km away before applying city scope.`,
        rawLocation,
        userText,
      });
    }

    if (this.apiKey) {
      const geo = await this._reverseGeocode(lat, lng);
      if (geo) {
        return this._pinResult({
          pin,
          lat,
          lng,
          areaName: geo.area_name,
          city: geo.city || explicitCity?.city || (await this._nearestCity(lat, lng))?.city || null,
          confidence: geo.confidence,
          source: 'reverse_geocoding_api',
          placeId: geo.place_id,
          reasoning: `Google reverse geocoding resolved exact user GPS (${lat}, ${lng}) to ${geo.area_name}.`,
          rawLocation,
          userText,
        });
      }
    }

    const pinCity = this._resolveCity(pin.city) || explicitCity || (await this._nearestCity(lat, lng));
    const city = pinCity?.city || null;
    return this._pinResult({
      pin,
      lat,
      lng,
      areaName: pin.label || (city ? `${city} pinned location` : 'Pinned location'),
      city,
      confidence: 0.72,
      source: context.location_source || 'gps_pin',
      reasoning: `Using exact ${context.location_source || 'GPS'} coordinates because neither coordinates.json nor Google reverse geocoding returned a neighborhood match.`,
      rawLocation,
      userText,
    });
  }

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

  async _resolveTyped(rawLocation, explicitCity, userText) {
    const local = await this._fromLocalCache(rawLocation, explicitCity?.city);
    if (local) return local;

    const textCity = this._extractCityFromText(`${rawLocation} ${userText}`);
    if (textCity && !explicitCity) {
      const cityScoped = await this._fromLocalCache(rawLocation, textCity.city);
      if (cityScoped) return cityScoped;
    }

    if (this.apiKey) {
      const geo = await this._geocode(rawLocation, explicitCity?.city);
      if (geo) {
        return {
          input: { location: rawLocation, city: explicitCity?.city || null },
          output: geo,
          reasoning: `Google Geocoding resolved "${rawLocation}"${explicitCity ? ` within ${explicitCity.city}` : ''}.`,
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

    if (explicitCity) {
      return this._cityResult(explicitCity.city, 'explicit_city_area_fallback', `Could not resolve area "${rawLocation}". Kept the user-selected city "${explicitCity.city}" as a safe fallback.`);
    }

    return {
      input: rawLocation,
      output: { lat: null, lng: null, area_name: null, city: null, fallback: true },
      reasoning: `Could not resolve "${rawLocation}" via local fuzzy matching or geocoding.`,
      contextUpdates: { coordinates: null, city: null, resolved_area: null, location_fallback: true },
    };
  }

  async _fromLocalCache(rawLocation, city) {
    const candidate = await findLocationCandidate(rawLocation, {
      minConfidence: 0.52,
      city,
    });
    if (!candidate?.coords?.lat) return null;

    const lat = Number(candidate.coords.lat);
    const lng = Number(candidate.coords.lng);
    if (!this._inPakistan(lat, lng)) return null;

    if (candidate.cityOnly) {
      return this._cityResult(candidate.city, 'local_city_match', `"${rawLocation}" matched city "${candidate.city}".`);
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
      reasoning: `Local fuzzy catalog matched "${rawLocation}" to "${candidate.coords.area_name}" with confidence ${candidate.confidence}.`,
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
    const best = data.results.find(result =>
      result.types?.some(type => ['neighborhood', 'sublocality', 'sublocality_level_1', 'political'].includes(type))
    ) || data.results[0];

    const areaName = this._extractComponent(best.address_components, [
      'neighborhood',
      'sublocality_level_1',
      'sublocality',
      'route',
    ]) || best.formatted_address;
    const resolvedCity = this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2'])
      || this._extractComponent(best.address_components, ['administrative_area_level_1'])
      || (await this._nearestCity(lat, lng))?.city
      || null;
    const preciseType = best.types?.some(type => ['neighborhood', 'sublocality', 'sublocality_level_1'].includes(type));

    return {
      lat,
      lng,
      area_name: areaName,
      city: resolvedCity,
      confidence: preciseType ? 0.94 : 0.82,
      source: 'reverse_geocoding_api',
      place_id: best.place_id,
    };
  }

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

    const resolvedCity = this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2'])
      || this._extractComponent(best.address_components, ['administrative_area_level_1'])
      || city
      || (await this._nearestCity(lat, lng))?.city
      || null;
    const resultType = best.types?.[0] || '';
    const confidence = resultType.includes('sublocality') || resultType.includes('neighborhood')
      ? 0.95
      : resultType.includes('locality')
        ? 0.85
        : 0.72;

    return {
      lat,
      lng,
      area_name: best.formatted_address,
      city: resolvedCity,
      confidence,
      source: 'geocoding_api',
      place_id: best.place_id,
    };
  }

  _resolveCity(cityText) {
    const text = String(cityText || '').trim();
    if (!text) return null;
    const normalized = normalizeLocation(text);
    let best = null;
    const coordinatesByCity = this.coordinatesByCity || {};

    for (const city of Object.keys(coordinatesByCity)) {
      const score = similarity(normalized, city);
      if (!best || score > best.score) best = { city: this._titleCase(city), key: city, score };
    }

    return best?.score >= 0.64 ? best : null;
  }

  _extractCityFromText(text) {
    const normalized = normalizeLocation(text);
    let best = null;
    const coordinatesByCity = this.coordinatesByCity || {};

    for (const city of Object.keys(coordinatesByCity)) {
      const score = similarity(normalized, city);
      const wordMatch = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
      const finalScore = wordMatch ? Math.max(score, 0.95) : score;
      if (!best || finalScore > best.score) best = { city: this._titleCase(city), key: city, score: finalScore };
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
    const cityKey = this._resolveCity(cityName)?.key || this._resolveCity(DEFAULT_CITY)?.key || Object.keys(coordinatesByCity)[0];
    const areas = Object.values(coordinatesByCity[cityKey] || {});
    const count = areas.length || 1;
    const lat = areas.reduce((sum, item) => sum + Number(item.lat || 0), 0) / count;
    const lng = areas.reduce((sum, item) => sum + Number(item.lng || 0), 0) / count;
    return { lat, lng };
  }

  async _nearestArea(lat, lng, city) {
    const requestedCity = city ? normalizeLocation(city) : '';
    let best = null;
    const locationCatalog = await this._getLocationCatalog();
    for (const item of locationCatalog.filter(entry => !entry.cityOnly && entry.coords)) {
      if (requestedCity && normalizeLocation(item.city) !== requestedCity) continue;
      const distance = haversineKm({ lat, lng }, { lat: Number(item.coords.lat), lng: Number(item.coords.lng) });
      if (distance == null) continue;
      if (!best || distance < best.distance_km) {
        best = { city: item.city, area: item.area, coords: item.coords, distance_km: distance };
      }
    }
    return best || (requestedCity ? await this._nearestArea(lat, lng, null) : null);
  }

  _localReverseRadiusKm(city) {
    const normalized = normalizeLocation(city || '');
    if (normalized === 'karachi') return 8;
    if (normalized === 'lahore') return 7;
    if (normalized === 'islamabad') return 6;
    return 10;
  }

  async _nearestCity(lat, lng) {
    let best = null;
    const locationCatalog = await this._getLocationCatalog();
    for (const item of locationCatalog.filter(entry => entry.cityOnly && entry.coords)) {
      const dLat = lat - item.coords.lat;
      const dLng = lng - item.coords.lng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      if (!best || distance < best.distance) best = { city: item.city, distance };
    }
    return best;
  }

  _defaultFallback(context, reason) {
    const coordinatesByCity = this.coordinatesByCity || {};
    const fallbackCity = this._resolveCity(DEFAULT_CITY)?.city || Object.keys(coordinatesByCity)[0];
    const result = this._cityResult(fallbackCity, 'default_city_fallback', reason);
    result.input = context.location || '';
    result.contextUpdates.location_confidence = 0.3;
    result.contextUpdates.location_fallback = true;
    return result;
  }

  _usableParsedLocation(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const normalized = normalizeLocation(text);
    const genericGpsTerms = ['current location', 'my current location', 'near me', 'meri current location', 'mere current location', 'yahan', 'idhar'];
    return genericGpsTerms.includes(normalized) ? '' : text;
  }

  _extractComponent(components = [], types = []) {
    for (const type of types) {
      const found = components.find(component => component.types?.includes(type));
      if (found) return found.long_name;
    }
    return null;
  }

  _inPakistan(lat, lng) {
    return Number.isFinite(lat)
      && Number.isFinite(lng)
      && lat >= PAK_BBOX.latMin
      && lat <= PAK_BBOX.latMax
      && lng >= PAK_BBOX.lngMin
      && lng <= PAK_BBOX.lngMax;
  }

  _titleCase(str = '') {
    return String(str)
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  _reject(coords, reason) {
    return {
      input: coords,
      output: { error: reason },
      reasoning: reason,
      contextUpdates: { coordinates: null, city: null, resolved_area: null },
    };
  }

  async _getCoordinatesByCity() {
    try {
      return await db.getCoordinatesByCity();
    } catch (err) {
      console.warn('[LocationResolver] Falling back to empty coordinate catalog:', err.message);
      return {};
    }
  }

  async _getLocationCatalog() {
    try {
      return await db.getLocationCatalog();
    } catch (err) {
      console.warn('[LocationResolver] Falling back to empty location catalog:', err.message);
      return [];
    }
  }
}

module.exports = LocationResolverAgent;
