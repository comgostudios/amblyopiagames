const { MongoClient } = require('mongodb');

let db;

async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db();
  await db.collection('otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('otps').createIndex({ email: 1 }, { unique: true });

  // Safety net: remove any unverified user records older than 24 hours
  const { deletedCount } = await db.collection('users').deleteMany({
    verified: { $ne: true },
    createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (deletedCount > 0) console.log(`Cleaned up ${deletedCount} unverified user(s)`);

  console.log(`Connected to MongoDB: ${db.databaseName}`);
  return db;
}

function getDB() {
  return db;
}

module.exports = { connectDB, getDB };
