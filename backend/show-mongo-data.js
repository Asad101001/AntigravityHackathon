#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function showData() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'asaaniyat';
  if (!uri) return console.error('MONGODB_URI not set in .env');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(dbName);

    const providersCol = db.collection('providers');
    const keywordsCol = db.collection('keywords_catalog');
    const coordsCol = db.collection('coordinates_catalog');

    const providersCount = await providersCol.countDocuments();
    console.log(`providers: ${providersCount}`);
    if (providersCount > 0) {
      const p = await providersCol.find({}).limit(5).toArray();
      console.log('--- sample providers (up to 5) ---');
      console.dir(p, { depth: 2, colors: true });
    }

    const kwDoc = await keywordsCol.findOne({ _id: 'default' });
    console.log(`keywords_catalog: ${kwDoc ? 'present' : 'missing'}`);
    if (kwDoc) {
      console.log('--- keywords.services keys ---');
      console.log(Object.keys(kwDoc.data.services || {}).slice(0, 30));
    }

    const coordsDoc = await coordsCol.findOne({ _id: 'default' });
    console.log(`coordinates_catalog: ${coordsDoc ? 'present' : 'missing'}`);
    if (coordsDoc) {
      const cities = Object.keys(coordsDoc.data || {}).slice(0, 20);
      console.log('--- coordinate cities (sample) ---');
      console.log(cities);
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

showData();
