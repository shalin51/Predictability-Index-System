import { describe, expect, it } from 'vitest';
import { LoginAttemptLimiter } from '../login-attempt-limiter';

describe('LoginAttemptLimiter', () => {
  it('blocks after five failures and resets after the window', () => {
    const limiter = new LoginAttemptLimiter();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.recordFailure('client', 1_000);
    }
    expect(limiter.isAllowed('client', 1_000)).toBe(false);
    expect(limiter.isAllowed('client', 1_000 + 15 * 60 * 1000)).toBe(true);
  });

  it('clears failures after a successful login', () => {
    const limiter = new LoginAttemptLimiter();
    limiter.recordFailure('client');
    limiter.reset('client');
    expect(limiter.isAllowed('client')).toBe(true);
  });
});
