const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function run() {
  const uri = 'mongodb://admin:pppoooiii@ac-pbpncpy-shard-00-00.zzrnzk3.mongodb.net:27017,ac-pbpncpy-shard-00-01.zzrnzk3.mongodb.net:27017,ac-pbpncpy-shard-00-02.zzrnzk3.mongodb.net:27017/?ssl=true&replicaSet=atlas-8n1e0d-shard-0&authSource=admin&appName=Cluster0';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('asaaniyat');
    const targetDir = 'd:\\Desktop\\AntigravityHackathon\\database_dumps';
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const collections = await db.listCollections().toArray();
    for (const collInfo of collections) {
      const name = collInfo.name;
      console.log(`Dumping collection: ${name}`);
      const data = await db.collection(name).find({}).toArray();
      const filePath = path.join(targetDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Dumped ${data.length} documents to ${filePath}`);
    }
    console.log('✅ Database dump complete!');
  } catch (error) {
    console.error('Error dumping database:', error);
  } finally {
    await client.close();
  }
}
run();
