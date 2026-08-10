const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptState {
  failures: number;
  startedAt: number;
}

export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  isAllowed(clientId: string, now = Date.now()): boolean {
    const state = this.attempts.get(clientId);
    if (!state) return true;
    if (now - state.startedAt >= WINDOW_MS) {
      this.attempts.delete(clientId);
      return true;
    }
    return state.failures < MAX_FAILURES;
  }

  recordFailure(clientId: string, now = Date.now()): void {
    const state = this.attempts.get(clientId);
    if (!state || now - state.startedAt >= WINDOW_MS) {
      this.attempts.set(clientId, { failures: 1, startedAt: now });
      return;
    }
    state.failures += 1;
  }

  reset(clientId: string): void {
    this.attempts.delete(clientId);
  }
}
