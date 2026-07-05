/**
 * migrate.ts — Runs SQL migration files against the AMFPI database.
 *
 * Run: npm run db:migrate:dev
 * With seed: npm run db:seed:dev
 */

import { config, initializeConfig } from '../config/env';
import {
  applyMigrations,
  applySeeds,
  createDatabaseClient,
  resetDatabase,
} from './migration-runner';

const withSeed = process.argv.includes('--seed');
const resetDb = process.argv.includes('--reset');

async function run(): Promise<void> {
  await initializeConfig();
  const client = createDatabaseClient();

  await client.connect();
  console.log(`[migrate] Connected to ${config.db.name}`);

  try {
    if (resetDb) {
      console.log('[migrate] ⚠ RESET requested — dropping all tables...');
      await resetDatabase(client);
      console.log('[migrate] All tables dropped');
    }
    await applyMigrations(client);
    console.log('[migrate] ✓ Migrations complete');

    if (withSeed) {
      await applySeeds(client);
      console.log('[migrate] ✓ Seed complete');
    }
  } finally {
    await client.end();
  }
}

run().catch((err: unknown) => {
  console.error('[migrate] Error:', err);
  process.exit(1);
});
