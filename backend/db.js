const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const dataStore = require('./dataStore');

let dbPromise;

async function setupDatabase() {
  if (!dbPromise) {
    dbPromise = open({
      filename: path.join(__dirname, 'asaaniyat.sqlite'),
      driver: sqlite3.Database
    }).then(async (db) => {
      // Create Providers Table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS providers (
          id TEXT PRIMARY KEY,
          name TEXT,
          service TEXT,
          city TEXT,
          area TEXT,
          distance_km REAL,
          rating REAL,
          reviews_count INTEGER,
          available_slots TEXT,
          phone TEXT,
          response_time_min INTEGER,
          verified INTEGER,
          lat REAL,
          lng REAL
        );
      `);

      // Create Keywords Table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS keywords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          intent TEXT,
          keyword TEXT
        );
      `);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          booking_id TEXT,
          role TEXT,
          content TEXT,
          token_count INTEGER,
          created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS rag_chunks (
          id TEXT PRIMARY KEY,
          source TEXT,
          content TEXT,
          tokens TEXT,
          metadata TEXT,
          created_at TEXT
        );
      `);

      // Check if providers are empty
      const count = await db.get('SELECT COUNT(*) as count FROM providers');
      if (count.count === 0) {
        console.log('Seeding SQLite database with shared data store data...');
        const [providers, intents, coords] = await Promise.all([
          dataStore.getProviders(),
          dataStore.getKeywords(),
          dataStore.getCoordinates()
        ]);

        if (providers.length > 0) {
          const stmt = await db.prepare(`
            INSERT INTO providers (id, name, service, city, area, distance_km, rating, reviews_count, available_slots, phone, response_time_min, verified, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const p of providers) {
            const resolvedCoords = resolveProviderCoordinates(p, coords);

            await stmt.run(
              p.id, p.name, p.service, p.city, p.area, p.distance_km, p.rating,
              p.reviews_count, JSON.stringify(p.available_slots), p.phone,
              p.response_time_min, p.verified ? 1 : 0, resolvedCoords.lat, resolvedCoords.lng
            );
          }
          await stmt.finalize();
        }

        const stmt = await db.prepare('INSERT INTO keywords (intent, keyword) VALUES (?, ?)');
        for (const [serviceKey, serviceData] of Object.entries(intents.services || {})) {
          for (const kw of serviceData.keywords || []) {
            await stmt.run(serviceKey, kw);
          }
        }
        for (const [timeKey, timeData] of Object.entries(intents.time_expressions || {})) {
          for (const kw of timeData.keywords || []) {
            await stmt.run(timeKey, kw);
          }
        }
        for (const kw of intents.need_indicators || []) await stmt.run('need_indicator', kw);
        for (const kw of intents.urgency_indicators || []) await stmt.run('urgency_indicator', kw);
        await stmt.finalize();
        
        console.log('Database seeding complete.');
      }

      return db;
    });
  }
  return dbPromise;
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

  const cityKey = Object.keys(coordinatesByCity).find(key => normalizeAreaKey(key) === normalizeAreaKey(provider.city));
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

function hydrateProvider(r) {
  return {
    ...r,
    verified: r.verified === 1 || r.verified === true,
    available_slots: Array.isArray(r.available_slots) ? r.available_slots : JSON.parse(r.available_slots || '[]')
  };
}

// Helper to get providers matching criteria
async function findProviders(service, location) {
  return dataStore.findProvidersByService(service, location, 10);
}

async function findProvidersByService(service) {
  return dataStore.findProvidersByService(service, '', 50);
}

async function saveChatMessage({ booking_id, role, content, token_count = 0 }) {
  const db = await setupDatabase();
  const id = `MSG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();
  await db.run(
    'INSERT INTO chat_messages (id, booking_id, role, content, token_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, booking_id, role, content, token_count, created_at]
  );
  return { id, booking_id, role, content, token_count, created_at };
}

async function getChatMessages(booking_id, limit = 40) {
  const db = await setupDatabase();
  return db.all(
    'SELECT * FROM chat_messages WHERE booking_id = ? ORDER BY created_at ASC LIMIT ?',
    [booking_id, limit]
  );
}

async function saveRagChunk({ source, content, tokens = [], metadata = {} }) {
  const db = await setupDatabase();
  const id = `RAG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();
  await db.run(
    'INSERT INTO rag_chunks (id, source, content, tokens, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, source || 'manual', content, JSON.stringify(tokens), JSON.stringify(metadata), created_at]
  );
  return { id, source, content, tokens, metadata, created_at };
}

async function getRagChunks(limit = 200) {
  const db = await setupDatabase();
  const rows = await db.all('SELECT * FROM rag_chunks ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map(row => ({
    ...row,
    tokens: JSON.parse(row.tokens || '[]'),
    metadata: JSON.parse(row.metadata || '{}')
  }));
}

module.exports = {
  setupDatabase,
  findProviders,
  findProvidersByService,
  saveChatMessage,
  getChatMessages,
  saveRagChunk,
  getRagChunks
};


