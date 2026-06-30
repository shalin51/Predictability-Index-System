import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../health.service';

// Mock infrastructure and config — no real DB or env needed for unit tests
vi.mock('../../../infrastructure/database/pg-pool', () => ({
  testConnection: vi.fn().mockResolvedValue({ connected: true }),
}));

vi.mock('../../../config/env', () => ({
  config: {
    appEnv: 'dev',
    db: { name: 'AMFPI' },
  },
}));

describe('HealthService', () => {
  let svc: HealthService;

  beforeEach(() => {
    svc = new HealthService();
  });

  describe('getHealth()', () => {
    it('returns status ok', () => {
      const result = svc.getHealth();
      expect(result.status).toBe('ok');
    });

    it('returns service name', () => {
      const result = svc.getHealth();
      expect(result.service).toBe('main-server');
    });

    it('returns appEnv from config', () => {
      const result = svc.getHealth();
      expect(result.appEnv).toBe('dev');
    });

    it('returns a valid ISO timestamp', () => {
      const result = svc.getHealth();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('getDbHealth()', () => {
    it('returns connected: true when DB probe succeeds', async () => {
      const result = await svc.getDbHealth();
      expect(result.connected).toBe(true);
      expect(result.status).toBe('ok');
      expect(result.database).toBe('AMFPI');
    });

    it('returns connected: false when DB probe fails', async () => {
      const { testConnection } = await import('../../../infrastructure/database/pg-pool');
      vi.mocked(testConnection).mockResolvedValueOnce({ connected: false, error: 'ECONNREFUSED' });

      const result = await svc.getDbHealth();
      expect(result.connected).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toBe('ECONNREFUSED');
    });
  });
});
