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
          for (const intent in intents) {
            for (const kw of intents[intent]) {
              await stmt.run(intent, kw);
            }
          }
          await stmt.finalize();
        }
        
        console.log('Database seeding complete.');
      }

      return db;
    });
  }
  return dbPromise;
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
  
  query += ' ORDER BY rating DESC, distance_km ASC LIMIT 5';
  
  const results = await db.all(query, params);
  
  // Parse available_slots back to array
  return results.map(r => ({
    ...r,
    verified: r.verified === 1,
    available_slots: JSON.parse(r.available_slots)
  }));
}

module.exports = {
  setupDatabase,
  findProviders
};


