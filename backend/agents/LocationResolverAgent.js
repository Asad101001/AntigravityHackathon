/**
 * Agent 2: LocationResolverAgent
 * Converts area name to lat/lng coordinates using local cache
 * Validates coordinates are within Pakistan bounding box
 */

const BaseAgent = require('./BaseAgent');
const coordinates = require('../data/coordinates.json');

class LocationResolverAgent extends BaseAgent {
  constructor() {
    super('resolve_location', 2);
  }

  async execute(context) {
    const location = context.location;
    
    if (!location) {
      return {
        input: 'No location provided',
        output: { lat: null, lng: null, area_name: null, city: null },
        reasoning: 'No location was parsed from user input. Will prompt user for location.',
        contextUpdates: { coordinates: null, city: null, resolved_area: null }
      };
    }

    // Search through all cities for the area
    for (const [city, areas] of Object.entries(coordinates)) {
      for (const [areaName, coords] of Object.entries(areas)) {
        if (areaName.toLowerCase() === location.toLowerCase()) {
          // Validate Pakistan bounding box: lat 23.0–37.5, lng 60.0–77.5
          if (!this._isInPakistan(coords.lat, coords.lng)) {
            return {
              input: location,
              output: { error: 'Coordinates outside Pakistan bounds' },
              reasoning: `Resolved "${location}" but coordinates (${coords.lat}, ${coords.lng}) fall outside Pakistan bounding box. Rejecting.`,
              contextUpdates: { coordinates: null, city: null, resolved_area: null }
            };
          }

          const capitalizedCity = city.charAt(0).toUpperCase() + city.slice(1);
          return {
            input: location,
            output: { lat: coords.lat, lng: coords.lng, area_name: coords.area_name, city: capitalizedCity },
            reasoning: `Resolved "${location}" from local coordinate cache → ${coords.area_name} (${coords.lat}, ${coords.lng}). No API call needed.`,
            contextUpdates: {
              coordinates: { lat: coords.lat, lng: coords.lng },
              city: capitalizedCity,
              resolved_area: coords.area_name
            }
          };
        }
      }
    }

    // Location not found in cache — suggest fallback
    return {
      input: location,
      output: { lat: null, lng: null, area_name: null, city: null, fallback: true },
      reasoning: `Location "${location}" not found in local coordinate cache. Would normally call Google Maps Geocoding API as fallback. Suggesting user clarify area.`,
      contextUpdates: {
        coordinates: null,
        city: null,
        resolved_area: null,
        location_fallback: true
      }
    };
  }

  _isInPakistan(lat, lng) {
    return lat >= 23.0 && lat <= 37.5 && lng >= 60.0 && lng <= 77.5;
  }
}

module.exports = LocationResolverAgent;
