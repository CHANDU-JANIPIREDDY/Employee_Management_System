import { env } from '../config/env.js';
import { connectDb } from '../config/db.js';
import { seedDatabase } from './seedDatabase.js';

if (env.NODE_ENV === 'production') {
  console.error('Refusing to seed in production.');
  process.exit(1);
}

try {
  await connectDb(env.MONGODB_URI);
  const result = await seedDatabase();
  console.log('Seed complete.');
  console.log(`Admin: ${result.adminEmail} / Admin@123`);
  console.log(`Employee: ${result.employeeEmail} / Employee@123`);
  process.exit(0);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
