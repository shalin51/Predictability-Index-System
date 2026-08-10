import { createHash, timingSafeEqual } from 'crypto';
import { config } from '../../config/env';
import { issueJwt } from './jwt';

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = createHash('sha256').update(left).digest();
  const rightBuffer = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export interface LoginResult {
  expiresAt: string;
  token: string;
  userName: string;
}

export class AuthService {
  login(userName: string, password: string): LoginResult | null {
    if (!config.auth.userName || !config.auth.userPassword || !config.auth.jwtSecret) {
      throw new Error('Authentication is not configured');
    }

    if (!secureEqual(userName, config.auth.userName) || !secureEqual(password, config.auth.userPassword)) {
      return null;
    }

    return {
      ...issueJwt(config.auth.userName, config.auth.jwtSecret, config.auth.jwtExpiresSeconds),
      userName: config.auth.userName,
    };
  }
}
