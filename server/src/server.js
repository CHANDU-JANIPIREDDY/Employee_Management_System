import { app } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';

const server = await start();

async function start() {
  const connection = await connectDb(env.MONGODB_URI);
  return app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT} (database: ${connection.name})`);
  });
}

async function shutdown() {
  server.close();
  const { default: mongoose } = await import('mongoose');
  await mongoose.disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
