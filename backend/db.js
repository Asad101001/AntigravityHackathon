const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcryptjs = require('bcryptjs');

const coordinatesByCityPath = path.join(__dirname, 'data', 'coordinates.json');
const providersPath = path.join(__dirname, 'data', 'providers.json');
const keywordsPath = path.join(__dirname, 'data', 'keywords.json');

const COLLECTIONS = {
  coordinates: 'coordinates_catalog',
  keywords: 'keywords_catalog',
  providers: 'providers',
  users: 'users',
  adminUsers: 'admin_users',
  chatMessages: 'chat_messages',
  ragChunks: 'rag_chunks',
  bookings: 'bookings',
};

let clientPromise;
let cachedDb;
let cachedCoordinatesByCity = null;
let cachedKeywords = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeAreaKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\be\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveProviderCoordinates(provider, coordinatesByCity) {
  if (Number.isFinite(Number(provider.lat)) && Number.isFinite(Number(provider.lng))) {
    return { lat: Number(provider.lat), lng: Number(provider.lng) };
  }

  const cityKey = Object.keys(coordinatesByCity || {}).find(
    key => normalizeAreaKey(key) === normalizeAreaKey(provider.city)
  );
  const cityCoordinates = cityKey ? coordinatesByCity[cityKey] : null;
  if (!cityCoordinates) return { lat: null, lng: null };

  const normalizedArea = normalizeAreaKey(provider.area);
  const areaKey = Object.keys(cityCoordinates).find(key => {
    const normalizedKey = normalizeAreaKey(key);
    return normalizedKey === normalizedArea || normalizedKey.includes(normalizedArea) || normalizedArea.includes(normalizedKey);
  });

  const coords = areaKey ? cityCoordinates[areaKey] : Object.values(cityCoordinates)[0];
  return { lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

function buildLocationCatalog(coordinatesByCity = {}) {
  const catalog = [];
  for (const [city, areas] of Object.entries(coordinatesByCity)) {
    const cityTitle = city.charAt(0).toUpperCase() + city.slice(1);
    const areaValues = Object.values(areas || {});
    const centroid = areaValues.length
      ? {
          lat: areaValues.reduce((sum, item) => sum + Number(item.lat || 0), 0) / areaValues.length,
          lng: areaValues.reduce((sum, item) => sum + Number(item.lng || 0), 0) / areaValues.length,
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

function hydrateProvider(provider) {
  return {
    ...provider,
    verified: provider.verified === 1 || provider.verified === true,
    available_slots: Array.isArray(provider.available_slots)
      ? provider.available_slots
      : JSON.parse(provider.available_slots || '[]')
  };
}

async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'asaaniyat';
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  await seedCollections(db);
  await seedAdminUsers(db);
  await refreshCaches(db);
  return { client, db };
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection(COLLECTIONS.providers).createIndex({ service: 1, city: 1, area: 1 }),
    db.collection(COLLECTIONS.users).createIndex({ emailLower: 1 }, { unique: true }),
    db.collection(COLLECTIONS.adminUsers).createIndex({ emailLower: 1 }, { unique: true }),
    db.collection(COLLECTIONS.chatMessages).createIndex({ booking_id: 1, created_at: 1 }),
    db.collection(COLLECTIONS.ragChunks).createIndex({ created_at: -1 }),
    db.collection(COLLECTIONS.bookings).createIndex({ user_id: 1, created_at: -1 }),
    db.collection(COLLECTIONS.bookings).createIndex({ provider_id: 1, user_id: 1, booking_start_time: 1 }, { unique: true, sparse: true }),
    db.collection(COLLECTIONS.bookings).createIndex({ status: 1 }),
  ]);
}

async function seedCollections(db) {
  const coordinatesCollection = db.collection(COLLECTIONS.coordinates);
  const keywordsCollection = db.collection(COLLECTIONS.keywords);
  const providersCollection = db.collection(COLLECTIONS.providers);

  const [coordinatesCount, keywordsCount, providersCount] = await Promise.all([
    coordinatesCollection.estimatedDocumentCount(),
    keywordsCollection.estimatedDocumentCount(),
    providersCollection.estimatedDocumentCount(),
  ]);

  if (coordinatesCount === 0 && fs.existsSync(coordinatesByCityPath)) {
    const coordinates = JSON.parse(fs.readFileSync(coordinatesByCityPath, 'utf8'));
    await coordinatesCollection.insertOne({
      _id: 'coordinates_catalog',
      data: coordinates,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (keywordsCount === 0 && fs.existsSync(keywordsPath)) {
    const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
    await keywordsCollection.insertOne({
      _id: 'keywords_catalog',
      data: keywords,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (providersCount === 0 && fs.existsSync(providersPath)) {
    const coordinates = fs.existsSync(coordinatesByCityPath)
      ? JSON.parse(fs.readFileSync(coordinatesByCityPath, 'utf8'))
      : {};
    const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
    const docs = providers.map(provider => {
      const resolvedCoords = resolveProviderCoordinates(provider, coordinates);
      return {
        ...provider,
        lat: resolvedCoords.lat,
        lng: resolvedCoords.lng,
        verified: Boolean(provider.verified),
        available_slots: Array.isArray(provider.available_slots) ? provider.available_slots : [],
        created_at: new Date().toISOString(),
      };
    });
    if (docs.length) await providersCollection.insertMany(docs);
  }
}

async function seedAdminUsers(db) {
  const adminCollection = db.collection(COLLECTIONS.adminUsers);
  const count = await adminCollection.countDocuments();
  
  if (count === 0) {
    // Create demo admin account
    const demoEmail = 'admin@asaaniyat.com';
    const demoPassword = 'AdminPassword123';
    const demoEmailLower = demoEmail.toLowerCase();
    
    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(demoPassword, salt);
    
    const demoAdmin = {
      _id: `admin_${Date.now()}`,
      email: demoEmail,
      emailLower: demoEmailLower,
      passwordHash,
      displayName: 'Admin User',
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      loginCount: 0
    };
    
    await adminCollection.insertOne(demoAdmin);
    console.log('✅ Demo admin created:');
    console.log('   Email: admin@asaaniyat.com');
    console.log('   Password: AdminPassword123');
  }
}

async function refreshCaches(db) {
  const [coordinatesDoc, keywordsDoc] = await Promise.all([
    db.collection(COLLECTIONS.coordinates).findOne({ _id: 'coordinates_catalog' }),
    db.collection(COLLECTIONS.keywords).findOne({ _id: 'keywords_catalog' }),
  ]);
  cachedCoordinatesByCity = coordinatesDoc?.data || {};
  cachedKeywords = keywordsDoc?.data || {};
}

async function setupDatabase() {
  if (cachedDb) return cachedDb;

  if (!clientPromise) {
    clientPromise = connectMongo().catch(err => {
      clientPromise = null;
      throw err;
    });
  }

  const { db } = await clientPromise;
  cachedDb = db;
  return cachedDb;
}

// Convenience function to get the database
async function getDb() {
  return setupDatabase();
}

async function getCoordinatesByCity() {
  await setupDatabase();
  return clone(cachedCoordinatesByCity || {});
}

async function getKeywordsCatalog() {
  await setupDatabase();
  return clone(cachedKeywords || {});
}

async function getLocationCatalog() {
  const coordinates = await getCoordinatesByCity();
  return buildLocationCatalog(coordinates);
}

async function getProvidersCatalog(limit = 1000) {
  const db = await setupDatabase();
  const providers = await db.collection(COLLECTIONS.providers)
    .find({})
    .sort({ rating: -1, distance_km: 1 })
    .limit(limit)
    .toArray();
  return providers.map(hydrateProvider);
}

async function findUserByEmail(email) {
  if (!email) return null;
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.users).findOne({ emailLower: String(email).trim().toLowerCase() });
}

async function findUserById(userId) {
  if (!userId) return null;
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.users).findOne({ _id: String(userId) });
}

async function createUser({ email, passwordHash, displayName, city }) {
  const db = await setupDatabase();
  const now = new Date().toISOString();
  const user = {
    _id: `USR_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: String(email).trim(),
    emailLower: String(email).trim().toLowerCase(),
    displayName: displayName || String(email).split('@')[0],
    city: String(city || '').trim() || null,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    loginCount: 0,
  };
  await db.collection(COLLECTIONS.users).insertOne(user);
  return user;
}

async function recordUserLogin(userId) {
  const db = await setupDatabase();
  const now = new Date().toISOString();
  await db.collection(COLLECTIONS.users).updateOne(
    { _id: String(userId) },
    { $set: { lastLoginAt: now, updatedAt: now }, $inc: { loginCount: 1 } }
  );
}

async function findProviders(service, location) {
  const db = await setupDatabase();
  const query = service
    ? { service: { $regex: escapeRegExp(service), $options: 'i' } }
    : {};

  if (location) {
    query.$or = [
      { city: { $regex: escapeRegExp(location), $options: 'i' } },
      { area: { $regex: escapeRegExp(location), $options: 'i' } },
    ];
  }

  const results = await db.collection(COLLECTIONS.providers)
    .find(query)
    .sort({ rating: -1, distance_km: 1 })
    .limit(10)
    .toArray();

  return results.map(hydrateProvider);
}

async function findProvidersByService(service) {
  const db = await setupDatabase();
  const results = await db.collection(COLLECTIONS.providers)
    .find({ service: { $regex: escapeRegExp(service || ''), $options: 'i' } })
    .sort({ rating: -1, distance_km: 1 })
    .limit(50)
    .toArray();

  return results.map(hydrateProvider);
}

async function saveChatMessage({ booking_id, role, content, token_count = 0 }) {
  const db = await setupDatabase();
  const id = `MSG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();
  const record = { id, booking_id, role, content, token_count, created_at };
  await db.collection(COLLECTIONS.chatMessages).insertOne(record);
  return record;
}

async function getChatMessages(booking_id, limit = 40) {
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.chatMessages)
    .find({ booking_id })
    .sort({ created_at: 1 })
    .limit(limit)
    .toArray();
}

async function saveRagChunk({ source, content, tokens = [], metadata = {} }) {
  const db = await setupDatabase();
  const id = `RAG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();
  const record = {
    id,
    source: source || 'manual',
    content,
    tokens: Array.isArray(tokens) ? tokens : [],
    metadata,
    created_at,
  };
  await db.collection(COLLECTIONS.ragChunks).insertOne(record);
  return record;
}

async function getRagChunks(limit = 200) {
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.ragChunks)
    .find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

async function createBooking({ user_id, provider_id, provider_name, service_type, location, city, area, booking_start_time, quote_pkr, status = 'confirmed', raw_data = {} }) {
  const db = await setupDatabase();
  const now = new Date().toISOString();
  const booking = {
    _id: `BK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: String(user_id),
    provider_id: String(provider_id),
    provider_name: String(provider_name || ''),
    service_type: String(service_type || ''),
    location: String(location || ''),
    city: String(city || ''),
    area: String(area || ''),
    booking_start_time: booking_start_time ? new Date(booking_start_time).toISOString() : null,
    quote_pkr: typeof quote_pkr === 'number' ? quote_pkr : null,
    status: String(status),
    raw_data: raw_data || {},
    created_at: now,
    updated_at: now,
  };
  await db.collection(COLLECTIONS.bookings).insertOne(booking);
  return booking;
}

async function getUserBookings(user_id) {
  if (!user_id) return [];
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.bookings)
    .find({ user_id: String(user_id) })
    .sort({ created_at: -1 })
    .toArray();
}

async function getBookingById(booking_id) {
  if (!booking_id) return null;
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.bookings).findOne({ _id: String(booking_id) });
}

async function updateBookingStatus(booking_id, new_status) {
  if (!booking_id) return null;
  const db = await setupDatabase();
  const now = new Date().toISOString();
  const result = await db.collection(COLLECTIONS.bookings).findOneAndUpdate(
    { _id: String(booking_id) },
    { $set: { status: String(new_status), updated_at: now } },
    { returnDocument: 'after' }
  );
  return result?.value || result || null;
}

async function checkDuplicateBooking(user_id, provider_id, booking_start_time) {
  if (!user_id || !provider_id || !booking_start_time) return null;
  const db = await setupDatabase();
  const startTime = new Date(booking_start_time).toISOString();
  return db.collection(COLLECTIONS.bookings).findOne({
    user_id: String(user_id),
    provider_id: String(provider_id),
    booking_start_time: startTime,
    status: { $in: ['confirmed', 'Operating'] },
  });
}

async function cancelBooking(booking_id) {
  return updateBookingStatus(booking_id, 'canceled');
}

async function getAllBookings(limit = 1000, skip = 0) {
  const db = await setupDatabase();
  return db.collection(COLLECTIONS.bookings)
    .find({})
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  setupDatabase,
  getCoordinatesByCity,
  getKeywordsCatalog,
  getLocationCatalog,
  getProvidersCatalog,
  findUserByEmail,
  findUserById,
  createUser,
  recordUserLogin,
  findProviders,
  findProvidersByService,
  saveChatMessage,
  getChatMessages,
  saveRagChunk,
  getRagChunks,
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  checkDuplicateBooking,
  cancelBooking,
  getAllBookings,
  getDb,
  COLLECTIONS,
};


