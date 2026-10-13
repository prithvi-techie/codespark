const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // 1. If explicit URI provided and not default localhost, try connecting directly
  if (uri && !uri.includes('localhost:27017') && !uri.includes('127.0.0.1:27017')) {
    try {
      await mongoose.connect(uri);
      console.log(' Connected to MongoDB (Remote/Atlas) successfully');
      return;
    } catch (err) {
      console.error('Failed to connect to provided MONGODB_URI:', err.message);
      throw err;
    }
  }

  // 2. Try connecting to local MongoDB first (with short 2.5s timeout)
  const localUri = uri || 'mongodb://127.0.0.1:27017/smart-canteen';
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2500 });
    console.log(' Connected to local MongoDB successfully');
    return;
  } catch (err) {
    console.log(' Local MongoDB not reachable (127.0.0.1:27017).');
  }

  // 3. Fallback to embedded In-Memory MongoDB for effortless local development and testing
  console.log(' Starting embedded In-Memory MongoDB server...');
  try {
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(` Connected to embedded MongoDB at ${memoryUri}`);
    console.log('  Note: In-Memory DB is active. All data will be preserved in-process for this session.');
  } catch (err) {
    console.error('Could not start In-Memory MongoDB:', err);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB };
