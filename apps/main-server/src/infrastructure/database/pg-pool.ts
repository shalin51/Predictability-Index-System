import { Pool, PoolClient } from 'pg';
import { config } from '../../config/env';

let pool: Pool | null = null;

/**
 * Returns the singleton pg connection pool.
 * Initialised lazily on first call.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err: Error) => {
      console.error('[pg-pool] Unexpected client error:', err.message);
    });

    console.log(`[pg-pool] Initialised → ${config.db.host}:${config.db.port}/${config.db.name}`);
  }
  return pool;
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  let client: PoolClient | undefined;
  try {
    client = await getPool().connect();
    await client.query('SELECT 1');
    return { connected: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { connected: false, error };
  } finally {
    client?.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[pg-pool] Closed');
  }
}
