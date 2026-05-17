#!/usr/bin/env node
/**
 * MongoDB Connection Tester
 * Run: node test-mongo.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'asaaniyat';

  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }

  console.log('🔗 Testing MongoDB connection...');
  console.log(`   URI: ${uri.replace(/:[^:]*@/, ':****@')}`);
  console.log(`   Database: ${dbName}\n`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });

  try {
    // Connect
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // Get database
    const db = client.db(dbName);
    console.log(`📦 Using database: "${dbName}"\n`);

    // Check collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Collections in database (${collections.length}):`);
    if (collections.length === 0) {
      console.log('   (none yet - will be created on app start)\n');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
      console.log();
    }

    // Test write (optional)
    const testCollection = db.collection('_connection_test');
    const testDoc = { test: true, timestamp: new Date() };
    const result = await testCollection.insertOne(testDoc);
    console.log(`✅ Test insert successful (ID: ${result.insertedId})\n`);

    // Clean up test
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Test document cleaned up\n');

    // Final verdict
    console.log('🎉 MongoDB connection is working perfectly!');
    console.log('\nYou can now run: npm start');
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('authentication failed')) {
      console.error('   → Check your username/password in MongoDB Atlas');
      console.error('   → Verify IP whitelist includes your address');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error('   → Check your internet connection');
      console.error('   → Verify cluster name in connection string');
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();
