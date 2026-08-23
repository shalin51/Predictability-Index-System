/**
 * index.ts — Main server entry point
 *
 * IMPORTANT: config/env MUST be the first import.
 */
import { config, initializeConfig } from './config/env';

import { createApp } from './app';
import { closePool } from './infrastructure/database/pg-pool';

async function start(): Promise<void> {
  await initializeConfig();
  const app = createApp();

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
  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[main-server] ${signal} received — shutting down gracefully`);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePool().catch((error: unknown) => console.error('[main-server] Pool close failed:', error));
    process.exitCode = 0;
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void start().catch((error: unknown) => {
  console.error('[main-server] Failed to start:', error);
  process.exit(1);
});
