/**
 * Health endpoint response contracts — single source of truth.
 * Both main-server and dashboard import from here via @amfpi/shared.
 * Types are never duplicated across apps.
 */

export interface HealthResponse {
  status: 'ok' | 'error';
  service: string;
  appEnv: string;
  timestamp: string;
  error?: string;
}

export interface DbHealthResponse {
  status: 'ok' | 'error';
  database: string;
  connected: boolean;
  timestamp: string;
  error?: string;
}

export interface VersionResponse {
  version: string;
  appEnv: string;
  service: string;
}
