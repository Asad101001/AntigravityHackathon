const coordinates = require('../data/coordinates.json');
const { normalizeText, tokenize } = require('./textTokenizer');

const GENERIC_LOCATION_WORDS = new Set([
  'area', 'town', 'city', 'sector', 'block', 'phase', 'society', 'colony', 'karachi', 'lahore', 'islamabad', 'pakistan'
]);

function normalizeLocation(value = '') {
  return normalizeText(value)
    .replace(/\b(e|i)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationTokens(value = '') {
  return normalizeLocation(value)
    .split(' ')
    .filter(Boolean)
    .filter(token => !GENERIC_LOCATION_WORDS.has(token));
}

function levenshtein(a = '', b = '') {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a = '', b = '') {
  const left = normalizeLocation(a);
  const right = normalizeLocation(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    return Math.max(0.72, shorter / longer);
  }

  const leftTokens = new Set(locationTokens(left));
  const rightTokens = new Set(locationTokens(right));
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size || 1;
  const tokenScore = intersection / union;

  const distance = levenshtein(left, right);
  const editScore = 1 - distance / Math.max(left.length, right.length, 1);
  return Math.max(tokenScore, editScore * 0.9);
}

function getLocationCatalog() {
  const catalog = [];
  for (const [city, areas] of Object.entries(coordinates)) {
    const cityTitle = city.charAt(0).toUpperCase() + city.slice(1);
    const areaValues = Object.values(areas);
    const centroid = areaValues.length
      ? {
          lat: areaValues.reduce((sum, item) => sum + item.lat, 0) / areaValues.length,
          lng: areaValues.reduce((sum, item) => sum + item.lng, 0) / areaValues.length,
          area_name: `${cityTitle} city center`
        }
      : null;

    catalog.push({
      city: cityTitle,
      area: cityTitle,
      canonical: cityTitle,
      coords: centroid,
      searchText: cityTitle,
      normalized: normalizeLocation(cityTitle),
      cityOnly: true
    });

    for (const [area, coords] of Object.entries(areas)) {
      const areaName = coords.area_name || `${area} ${cityTitle}`;
      const searchVariants = [area, areaName, `${area} ${cityTitle}`];
      for (const variant of searchVariants) {
        catalog.push({
          city: cityTitle,
          area,
          canonical: area,
          coords,
          searchText: variant,
          normalized: normalizeLocation(variant),
          cityOnly: false
        });
      }
    }
  }
  return catalog;
}

function findLocationCandidate(input = '', options = {}) {
  const minConfidence = options.minConfidence || 0.58;
  const requestedCity = options.city ? normalizeLocation(options.city) : '';
  const parsed = tokenize(input);
  const phrases = [parsed.normalized, ...parsed.ngrams]
    .map(normalizeLocation)
    .filter(Boolean);

  let best = null;
  const catalog = getLocationCatalog().filter(item => {
    if (!requestedCity) return true;
    return normalizeLocation(item.city) === requestedCity;
  });

  for (const item of catalog) {
    for (const phrase of phrases) {
      const score = similarity(phrase, item.normalized);
      const tokenBoost = locationTokens(item.normalized).some(token => locationTokens(phrase).includes(token)) ? 0.08 : 0;
      const confidence = Math.min(1, score + tokenBoost);
      if (!best || confidence > best.confidence) {
        best = { ...item, matched_query: phrase, confidence: Math.round(confidence * 100) / 100 };
      }
    }
  }

  if (!best || best.confidence < minConfidence) return null;
  return best;
}

function haversineKm(a, b) {
  if (!a || !b || typeof a.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lat !== 'number' || typeof b.lng !== 'number') {
    return null;
  }
  const toRad = degrees => degrees * Math.PI / 180;
  const radiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round((radiusKm * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))) * 10) / 10;
}

module.exports = { normalizeLocation, locationTokens, similarity, findLocationCandidate, haversineKm, getLocationCatalog };
