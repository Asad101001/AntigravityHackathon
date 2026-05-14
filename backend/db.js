const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

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
        console.log('Seeding SQLite database with mock data...');
        // Read JSON files and seed
        const providersPath = path.join(__dirname, 'data', 'providers.json');
        const keywordsPath = path.join(__dirname, 'data', 'keywords.json');
        
        if (fs.existsSync(providersPath)) {
          const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
          const stmt = await db.prepare(`
            INSERT INTO providers (id, name, service, city, area, distance_km, rating, reviews_count, available_slots, phone, response_time_min, verified, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const p of providers) {
            // Assign some random coords around city centers if none exists
            let lat = p.lat || 33.6844; // Default to Islamabad approx
            let lng = p.lng || 73.0479;
            if (p.city === 'Lahore') { lat = 31.5204; lng = 74.3587; }
            if (p.city === 'Karachi') { lat = 24.8607; lng = 67.0011; }
            
            // Add some noise to coordinates so they don't stack up exactly
            lat += (Math.random() - 0.5) * 0.05;
            lng += (Math.random() - 0.5) * 0.05;

            await stmt.run(
              p.id, p.name, p.service, p.city, p.area, p.distance_km, p.rating, 
              p.reviews_count, JSON.stringify(p.available_slots), p.phone, 
              p.response_time_min, p.verified ? 1 : 0, lat, lng
            );
          }
          await stmt.finalize();
        }

        if (fs.existsSync(keywordsPath)) {
          const intents = JSON.parse(fs.readFileSync(keywordsPath, 'utf8'));
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
        }
        
        console.log('Database seeding complete.');
      }

      return db;
    });
  }
  return dbPromise;
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
  const db = await setupDatabase();
  let query = 'SELECT * FROM providers WHERE service LIKE ?';
  let params = [`%${service}%`];
  
  if (location) {
      query += ' AND (city LIKE ? OR area LIKE ?)';
      params.push(`%${location}%`, `%${location}%`);
  }
  
  query += ' ORDER BY rating DESC, distance_km ASC LIMIT 10';
  const results = await db.all(query, params);
  return results.map(hydrateProvider);
}

async function findProvidersByService(service) {
  const db = await setupDatabase();
  const results = await db.all(
    'SELECT * FROM providers WHERE service LIKE ? ORDER BY rating DESC, distance_km ASC LIMIT 50',
    [`%${service}%`]
  );
  return results.map(hydrateProvider);
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


