/**
 * Agent 2: LocationResolverAgent
 * Converts area name to lat/lng coordinates using local cache
 * Validates coordinates are within Pakistan bounding box
 */

const BaseAgent = require('./BaseAgent');
const coordinates = require('../data/coordinates.json');
const { findLocationCandidate } = require('../utils/locationNormalizer');

class LocationResolverAgent extends BaseAgent {
  constructor() {
    super('resolve_location', 2);
  }

  async execute(context) {
    const explicit = context.user_location;
    if (explicit && typeof explicit.lat === 'number' && typeof explicit.lng === 'number') {
      if (!this._isInPakistan(explicit.lat, explicit.lng)) {
        return {
          input: explicit,
          output: { error: 'Coordinates outside Pakistan bounds' },
          reasoning: `User-picked coordinates (${explicit.lat}, ${explicit.lng}) are outside Pakistan bounds.`,
          contextUpdates: { coordinates: null, city: null, resolved_area: null }
        };
      }
      return {
        input: explicit,
        output: { lat: explicit.lat, lng: explicit.lng, area_name: explicit.label || 'Pinned location', city: explicit.city || null, source: context.location_source || 'map' },
        reasoning: `Resolved location from ${context.location_source || 'explicit'} coordinates, so provider distance can be calculated dynamically.`,
        contextUpdates: {
          coordinates: { lat: explicit.lat, lng: explicit.lng },
          city: explicit.city || null,
          resolved_area: explicit.label || 'Pinned location',
          location_confidence: 1,
          location_source: context.location_source || 'map'
        }
      };
    }

    const location = context.location;
    const candidate = context.location_candidate || findLocationCandidate(location || context.user_text || '', { minConfidence: 0.55 });
    
    if (!location && !candidate) {
      return {
        input: 'No location provided',
        output: { lat: null, lng: null, area_name: null, city: null },
        reasoning: 'No location was parsed from user input. Will prompt user for location.',
        contextUpdates: { coordinates: null, city: null, resolved_area: null }
      };
    }

    if (candidate?.coords) {
      const coords = candidate.coords;
      if (!this._isInPakistan(coords.lat, coords.lng)) {
        return {
          input: location,
          output: { error: 'Coordinates outside Pakistan bounds' },
          reasoning: `Resolved "${location}" but coordinates (${coords.lat}, ${coords.lng}) fall outside Pakistan bounding box. Rejecting.`,
          contextUpdates: { coordinates: null, city: null, resolved_area: null }
        };
      }
      return {
        input: location || candidate.matched_query,
        output: { lat: coords.lat, lng: coords.lng, area_name: coords.area_name, city: candidate.city, confidence: candidate.confidence },
        reasoning: `Resolved "${location || candidate.matched_query}" using normalized fuzzy cache match "${candidate.searchText}" → ${coords.area_name} (${coords.lat}, ${coords.lng}).`,
        contextUpdates: {
          coordinates: { lat: coords.lat, lng: coords.lng },
          city: candidate.city,
          resolved_area: coords.area_name,
          location: candidate.canonical,
          location_confidence: candidate.confidence,
          location_source: 'typed'
        }
      };
    }

    // Exact legacy fallback through all cities for compatibility
    for (const [city, areas] of Object.entries(coordinates)) {
      for (const [areaName, coords] of Object.entries(areas)) {
        if (areaName.toLowerCase() === String(location).toLowerCase()) {
          const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
          return {
            input: location,
            output: { lat: coords.lat, lng: coords.lng, area_name: coords.area_name, city: capitalizedCity },
            reasoning: `Resolved "${location}" from exact local coordinate cache → ${coords.area_name}.`,
            contextUpdates: { coordinates: { lat: coords.lat, lng: coords.lng }, city: capitalizedCity, resolved_area: coords.area_name }
          };
        }
      }
    }

    return {
      input: location,
      output: { lat: null, lng: null, area_name: null, city: null, fallback: true },
      reasoning: `Location "${location}" not found after normalized/fuzzy matching. Suggesting user clarify area or pick on map.`,
      contextUpdates: { coordinates: null, city: null, resolved_area: null, location_fallback: true }
    };
  }

  _isInPakistan(lat, lng) {
    return lat >= 23.0 && lat <= 37.5 && lng >= 60.0 && lng <= 77.5;
  }
}

module.exports = LocationResolverAgent;


