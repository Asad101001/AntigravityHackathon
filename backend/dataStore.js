const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const LOCAL_PROVIDERS_PATH = path.join(LOCAL_DATA_DIR, 'providers.json');
const LOCAL_KEYWORDS_PATH = path.join(LOCAL_DATA_DIR, 'keywords.json');
const LOCAL_COORDINATES_PATH = path.join(LOCAL_DATA_DIR, 'coordinates.json');

let mongoDb = null;
let mongoClientPromise = null;
let seedPromise = null;
let mongoUnavailable = false;

const memoryCache = {
  providers: null,
  keywords: null,
  coordinates: null
};

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`[dataStore] Failed to read ${path.basename(filePath)}:`, error.message);
    return fallback;
  }
}

function loadLocalProviders() {
  return readJson(LOCAL_PROVIDERS_PATH, []);
}

function loadLocalKeywords() {
  return readJson(LOCAL_KEYWORDS_PATH, {});
}

function loadLocalCoordinates() {
  return readJson(LOCAL_COORDINATES_PATH, {});
}

function normalizeAreaKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\be\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveProviderCoordinates(provider, coordinatesByCity = loadLocalCoordinates()) {
  if (Number.isFinite(Number(provider.lat)) && Number.isFinite(Number(provider.lng))) {
    return { lat: Number(provider.lat), lng: Number(provider.lng) };
  }

  const cityKey = Object.keys(coordinatesByCity).find(
    key => normalizeAreaKey(key) === normalizeAreaKey(provider.city)
  );
  const cityCoordinates = cityKey ? coordinatesByCity[cityKey] : null;
  if (!cityCoordinates) return { lat: null, lng: null };

  const normalizedArea = normalizeAreaKey(provider.area);
  const areaKey = Object.keys(cityCoordinates).find(key => {
    const normalizedKey = normalizeAreaKey(key);
    return normalizedKey === normalizedArea
      || normalizedKey.includes(normalizedArea)
      || normalizedArea.includes(normalizedKey);
  });

  const coords = areaKey ? cityCoordinates[areaKey] : Object.values(cityCoordinates)[0];
  return { lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

function hydrateProvider(provider) {
  return {
    ...provider,
    verified: provider.verified === 1 || provider.verified === true,
    available_slots: Array.isArray(provider.available_slots)
      ? provider.available_slots
      : JSON.parse(provider.available_slots || '[]')
  };
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const dbName = process.env.MONGODB_DB_NAME || 'asaaniyat';
  return { uri, dbName };
}

async function getMongoDb() {
  const { uri, dbName } = getMongoConfig();
  if (!uri) return null;

  if (mongoDb) return mongoDb;

  if (!mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });

    mongoClientPromise = client.connect()
      .then(connectedClient => {
        mongoDb = connectedClient.db(dbName);
        return mongoDb;
      })
      .catch(error => {
        mongoClientPromise = null;
        throw error;
      });
  }

  return mongoClientPromise;
}

function buildLocationCatalog(coordinatesByCity) {
  const catalog = [];
  for (const [city, areas] of Object.entries(coordinatesByCity || {})) {
    const cityTitle = city.charAt(0).toUpperCase() + city.slice(1);
    const areaValues = Object.values(areas || {});
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
      normalized: normalizeAreaKey(cityTitle),
      cityOnly: true
    });

    for (const [area, coords] of Object.entries(areas || {})) {
      const areaName = coords.area_name || `${area} ${cityTitle}`;
      const searchVariants = [area, areaName, `${area} ${cityTitle}`];
      for (const variant of searchVariants) {
        catalog.push({
          city: cityTitle,
          area,
          canonical: area,
          coords,
          searchText: variant,
          normalized: normalizeAreaKey(variant),
          cityOnly: false
        });
      }
    }
  }
  return catalog;
}

async function seedMongoCollections(db) {
  if (!db) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const coordinatesByCity = loadLocalCoordinates();
    const localKeywords = loadLocalKeywords();
    const localProviders = loadLocalProviders();

    const providersCollection = db.collection('providers');
    const keywordsCollection = db.collection('keywords_catalog');
    const coordinatesCollection = db.collection('coordinates_catalog');

    const providerCount = await providersCollection.countDocuments();
    if (providerCount === 0 && localProviders.length > 0) {
      const docs = localProviders.map(provider => {
        const resolvedCoords = resolveProviderCoordinates(provider, coordinatesByCity);
        return {
          ...provider,
          lat: resolvedCoords.lat,
          lng: resolvedCoords.lng,
          verified: provider.verified === 1 || provider.verified === true,
          available_slots: Array.isArray(provider.available_slots) ? provider.available_slots : provider.available_slots || []
        };
      });
      await providersCollection.insertMany(docs);
    }

    const keywordDoc = await keywordsCollection.findOne({ _id: 'default' });
    if (!keywordDoc) {
      await keywordsCollection.insertOne({
        _id: 'default',
        data: localKeywords,
        createdAt: new Date().toISOString(),
        source: 'local_seed'
      });
    }

    const coordinatesDoc = await coordinatesCollection.findOne({ _id: 'default' });
    if (!coordinatesDoc) {
      await coordinatesCollection.insertOne({
        _id: 'default',
        data: coordinatesByCity,
        createdAt: new Date().toISOString(),
        source: 'local_seed'
      });
    }

    return true;
  })();

  return seedPromise;
}

async function ensureMongoReady() {
  if (mongoUnavailable) return null;

  try {
    const db = await getMongoDb();
    if (!db) return null;
    await seedMongoCollections(db);
    return db;
  } catch (error) {
    mongoUnavailable = true;
    mongoDb = null;
    mongoClientPromise = null;
    seedPromise = null;
    console.warn('[dataStore] MongoDB unavailable, falling back to local files:', error.message);
    return null;
  }
}

async function getProviders() {
  const db = await ensureMongoReady();
  if (!db) {
    if (!memoryCache.providers) memoryCache.providers = loadLocalProviders().map(hydrateProvider);
    return memoryCache.providers;
  }

  const providers = await db.collection('providers').find({}).toArray();
  return providers.map(hydrateProvider);
}

async function findProvidersByService(service, location = '', limit = 50) {
  const providers = await getProviders();
  const normalizedService = String(service || '').toLowerCase().trim();
  const normalizedLocation = String(location || '').toLowerCase().trim();

  const matchesService = provider => {
    if (!normalizedService) return true;
    const searchable = [
      provider.service,
      provider.type,
      ...(provider.services || []),
      ...(provider.specialization || [])
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase());

    return searchable.some(value => value.includes(normalizedService) || normalizedService.includes(value));
  };

  const matchesLocation = provider => {
    if (!normalizedLocation) return true;
    const city = String(provider.city || '').toLowerCase();
    const area = String(provider.area || '').toLowerCase();
    return city.includes(normalizedLocation) || area.includes(normalizedLocation);
  };

  return providers
    .filter(matchesService)
    .filter(matchesLocation)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(a.distance_km) || 0) - (Number(b.distance_km) || 0))
    .slice(0, limit);
}

async function getKeywords() {
  const db = await ensureMongoReady();
  if (!db) {
    if (!memoryCache.keywords) memoryCache.keywords = loadLocalKeywords();
    return memoryCache.keywords;
  }

  const doc = await db.collection('keywords_catalog').findOne({ _id: 'default' });
  return doc?.data || loadLocalKeywords();
}

async function getCoordinates() {
  const db = await ensureMongoReady();
  if (!db) {
    if (!memoryCache.coordinates) memoryCache.coordinates = loadLocalCoordinates();
    return memoryCache.coordinates;
  }

  const doc = await db.collection('coordinates_catalog').findOne({ _id: 'default' });
  return doc?.data || loadLocalCoordinates();
}

async function getLocationCatalog() {
  const coordinatesByCity = await getCoordinates();
  return buildLocationCatalog(coordinatesByCity);
}

module.exports = {
  ensureMongoReady,
  getProviders,
  findProvidersByService,
  getKeywords,
  getCoordinates,
  getLocationCatalog,
  resolveProviderCoordinates,
  normalizeAreaKey
};
