import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../../../config/env';
import { AuthService } from '../auth.service';
import { verifyJwt } from '../jwt';

const originalAuth = { ...config.auth };

describe('AuthService', () => {
  beforeEach(() => {
    Object.assign(config.auth, {
      userName: 'dashboard-user',
      userPassword: 'correct-password',
      jwtSecret: 'test-secret-that-is-long-enough-for-hmac-signing',
      jwtExpiresSeconds: 300,
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    Object.assign(config.auth, originalAuth);
  });

  it('returns a JWT for the configured credentials', () => {
    const result = new AuthService().login('dashboard-user', 'correct-password');
    expect(result?.userName).toBe('dashboard-user');
    expect(verifyJwt(result?.token ?? '', config.auth.jwtSecret)?.sub).toBe('dashboard-user');
  });

  it('rejects invalid credentials', () => {
    expect(new AuthService().login('dashboard-user', 'wrong-password')).toBeNull();
  });
});
