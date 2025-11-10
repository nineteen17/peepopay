import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient } from './index.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  console.log('⏳ Running migrations...');

  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: './drizzle' });

  console.log('✅ Migrations completed!');

  await migrationClient.end();
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed!');
  console.error(err);
  process.exit(1);
});
