process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5000';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret-value-123456';
process.env.JWT_EXPIRES_IN = '8h';
process.env.APP_TIMEZONE = 'UTC';
process.env.BCRYPT_ROUNDS = '4';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/smart-ems-e2e';

const { MongoMemoryReplSet } = await import('mongodb-memory-server');
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = replSet.getUri();

const { connectDb } = await import('../config/db.js');
await connectDb(process.env.MONGODB_URI);
const { seedDatabase } = await import('../seed/seedDatabase.js');
await seedDatabase();
const { app } = await import('../app.js');

const port = Number(process.env.PORT);
app.listen(port, () => {
  console.log(`e2e api ready on ${port}`);
});
