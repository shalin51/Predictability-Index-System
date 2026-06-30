/**
 * index.ts — Main server entry point
 *
 * IMPORTANT: config/env MUST be the first import.
 * It loads process.env from the env file before any other module reads it.
 */
import { config } from './config/env';

import { createApp } from './app';
import { closePool } from './infrastructure/database/pg-pool';

const app = createApp();

// ─── Start ──────────────────────────────────────────────────────────────────

const server = app.listen(config.port, () => {
  console.log('');
  console.log('[main-server] ─────────────────────────────────────');
  console.log(`[main-server] Running on port ${config.port}`);
  console.log(`[main-server] APP_ENV    : ${config.appEnv}`);
  console.log(`[main-server] CORS origin: ${config.corsOrigin}`);
  console.log(`[main-server] Database   : ${config.db.host}:${config.db.port}/${config.db.name}`);
  console.log('[main-server] ─────────────────────────────────────');
  console.log('');
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`[main-server] ${signal} received — shutting down gracefully`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export default app;
