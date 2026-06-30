import type { HealthResponse, DbHealthResponse } from '@amfpi/shared';
import { config } from '../../config/env';
import { testConnection } from '../../infrastructure/database/pg-pool';

/**
 * HealthService — business logic for health/liveness checks.
 * Controllers must not contain this logic.
 */
export class HealthService {
  /**
   * Returns the server liveness status.
   * Always synchronous — no I/O involved.
   */
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'main-server',
      appEnv: config.appEnv,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Probes the PostgreSQL connection and returns DB health status.
   * Returns a DTO with connected=false (not thrown) on failure.
   */
  async getDbHealth(): Promise<DbHealthResponse> {
    const result = await testConnection();
    return {
      status: result.connected ? 'ok' : 'error',
      database: config.db.name,
      connected: result.connected,
      timestamp: new Date().toISOString(),
      ...(result.error !== undefined && { error: result.error }),
    };
  }
}
