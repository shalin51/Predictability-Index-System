import type { Request, Response } from 'express';
import type { AuthService } from './auth.service';
import { LoginAttemptLimiter } from './login-attempt-limiter';

interface LoginBody {
  password?: unknown;
  userName?: unknown;
}

export class AuthController {
  private readonly limiter = new LoginAttemptLimiter();

  constructor(private readonly service: AuthService) {}

  login(req: Request, res: Response): void {
    const body = (req.body ?? {}) as LoginBody;
    const clientId = this.clientId(req);
    if (!this.limiter.isAllowed(clientId)) {
      res.setHeader('Retry-After', '900');
      res.status(429).json({ error: 'Too many sign-in attempts. Try again later.', code: 'LOGIN_RATE_LIMITED' });
      return;
    }
    if (typeof body.userName !== 'string' || typeof body.password !== 'string') {
      res.status(400).json({ error: 'Username and password are required', code: 'INVALID_LOGIN_REQUEST' });
      return;
    }

    const result = this.service.login(body.userName, body.password);
    if (!result) {
      this.limiter.recordFailure(clientId);
      res.status(401).json({ error: 'Invalid username or password', code: 'INVALID_CREDENTIALS' });
      return;
    }

    this.limiter.reset(clientId);
    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  }

  private clientId(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return forwardedValue?.split(',')[0]?.trim() || req.ip || 'unknown';
  }
}
