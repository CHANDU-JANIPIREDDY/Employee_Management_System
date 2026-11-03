import tls from 'node:tls';
import mongoose from 'mongoose';

// Atlas rejects Node 22+ default TLS handshakes with "tlsv1 alert internal error".
tls.DEFAULT_MAX_VERSION = 'TLSv1.2';

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  });
  return mongoose.connection;
}
