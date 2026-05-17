#!/usr/bin/env node
require('dotenv').config();
const dns = require('dns');
const { MongoClient } = require('mongodb');

// Temporarily force Node's DNS resolver to use a public DNS that supports SRV
dns.setServers(['8.8.8.8']);
console.log('Using DNS servers:', dns.getServers());

async function test() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'asaaniyat';
  if (!uri) return console.error('MONGODB_URI not set');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 5000 });
  try {
    await client.connect();
    console.log('Connected OK');
    const db = client.db(dbName);
    const col = db.collection('_connection_test');
    const r = await col.insertOne({ ok: true, t: new Date() });
    console.log('Insert ok', r.insertedId);
    await col.deleteOne({ _id: r.insertedId });
    console.log('Cleanup done');
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

test();
