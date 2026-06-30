/**
 * migrate.ts — Runs SQL migration files against the AMFPI database.
 *
 * Run: node scripts/load-env.js env.dev tsx apps/main-server/src/database/migrate.ts
 * With seed: node scripts/load-env.js env.dev tsx apps/main-server/src/database/migrate.ts --seed
 */

import { config } from '../config/env';
import {
  applyMigrations,
  applySeeds,
  createDatabaseClient,
  resetDatabase,
} from './migration-runner';

const withSeed = process.argv.includes('--seed');
const resetDb = process.argv.includes('--reset');

async function run(): Promise<void> {
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
