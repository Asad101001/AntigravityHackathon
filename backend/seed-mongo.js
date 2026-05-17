#!/usr/bin/env node
require('dotenv').config();
const dataStore = require('./dataStore');

(async () => {
  try {
    console.log('Starting MongoDB seed process (reads backend/data/*.json)...');
    const db = await dataStore.ensureMongoReady();
    if (!db) {
      console.error('MongoDB not configured or unreachable. Check MONGODB_URI in .env');
      process.exit(1);
    }
    console.log('Seeding (if needed) completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeder failed:', err.message || err);
    process.exit(1);
  }
})();
