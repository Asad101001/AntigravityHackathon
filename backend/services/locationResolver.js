// Simple, configurable location resolver.
// API: resolve(rawPrompt, clientLocation, session, options) -> {lat, lon, name, source, confidence}

const DEFAULTS = {
  LOCATION_CONFIDENCE_THRESHOLD: 0.7
};

function extractExplicitLocation(rawPrompt){
  if(!rawPrompt) return null;
  // naive regex: "in <location>" or "at <location>"
  const m = rawPrompt.match(/\b(?:in|at|near)\s+([A-Za-z0-9\-\s']{3,60})/i);
  if(m) return m[1].trim();
  return null;
}

async function resolve(rawPrompt, clientLocation, session = {}, options = {}){
  const cfg = Object.assign({}, DEFAULTS, options);
  const explicit = extractExplicitLocation(rawPrompt);
  if(explicit){
    // return prompt-derived location with moderate confidence
    return {
      name: explicit,
      lat: null,
      lon: null,
      source: 'prompt',
      confidence: 0.9
    };
  }

  if(clientLocation && clientLocation.lat && clientLocation.lon){
    return {
      name: clientLocation.name || 'current_location',
      lat: clientLocation.lat,
      lon: clientLocation.lon,
      source: 'client',
      confidence: 0.95
    };
  }

  // fallback to session.profileLocation or city center
  if(session && session.profileLocation){
    return Object.assign({}, session.profileLocation, { source: 'profile', confidence: 0.8 });
  }

  if(session && session.cityCenter){
    return Object.assign({}, session.cityCenter, { source: 'city_center', confidence: 0.5 });
  }

  // last resort: unknown
  return { name: 'unknown', lat: null, lon: null, source: 'fallback', confidence: 0.0 };
}

module.exports = { resolve };
