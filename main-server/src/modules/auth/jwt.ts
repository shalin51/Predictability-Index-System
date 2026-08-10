import { createHmac, timingSafeEqual } from 'crypto';

const ALGORITHM = 'HS256';
const ISSUER = 'predictability-index-main-server';
const AUDIENCE = 'predictability-index-dashboard';

interface JwtClaims {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(value: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(value).digest();
}

export function issueJwt(subject: string, secret: string, expiresSeconds: number): { token: string; expiresAt: string } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresSeconds;
  const header = encodeJson({ alg: ALGORITHM, typ: 'JWT' });
  const payload = encodeJson({
    aud: AUDIENCE,
    exp: expiresAt,
    iat: issuedAt,
    iss: ISSUER,
    sub: subject,
  } satisfies JwtClaims);
  const unsignedToken = `${header}.${payload}`;
  const signature = sign(unsignedToken, secret).toString('base64url');

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifyJwt(token: string, secret: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader = '', encodedPayload = '', encodedSignature = ''] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  let providedSignature: Buffer;

  try {
    providedSignature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    return null;
  }

  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as Record<string, unknown>;
    const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<JwtClaims>;
    const now = Math.floor(Date.now() / 1000);

    if (
      header['alg'] !== ALGORITHM ||
      header['typ'] !== 'JWT' ||
      claims.iss !== ISSUER ||
      claims.aud !== AUDIENCE ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      claims.iat > now + 30 ||
      claims.exp <= now
    ) {
      return null;
    }

    return claims as JwtClaims;
  } catch {
    return null;
  }
}
