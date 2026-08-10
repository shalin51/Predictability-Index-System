import { describe, expect, it } from 'vitest';
import { issueJwt, verifyJwt } from '../jwt';

const secret = 'test-secret-that-is-long-enough-for-hmac-signing';

describe('JWT authentication', () => {
  it('issues and validates a signed token', () => {
    const issued = issueJwt('dashboard-user', secret, 300);
    expect(verifyJwt(issued.token, secret)?.sub).toBe('dashboard-user');
  });

  it('rejects a changed signature', () => {
    const issued = issueJwt('dashboard-user', secret, 300);
    expect(verifyJwt(`${issued.token.slice(0, -1)}x`, secret)).toBeNull();
  });

  it('rejects expired tokens', () => {
    const issued = issueJwt('dashboard-user', secret, -1);
    expect(verifyJwt(issued.token, secret)).toBeNull();
  });
});
