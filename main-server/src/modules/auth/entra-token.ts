import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../../config/env';

let keys: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifyEntraAccessToken(token: string): Promise<string | null> {
  const { entraTenantId, entraClientId, entraScope } = config.auth;
  if (!entraTenantId || !entraClientId) return null;
  const issuer = `https://login.microsoftonline.com/${entraTenantId}/v2.0`;
  keys ??= createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${entraTenantId}/discovery/v2.0/keys`));
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: entraClientId,
      algorithms: ['RS256'],
    });
    if (payload.tid !== entraTenantId || typeof payload.oid !== 'string') return null;
    if (typeof payload.scp !== 'string' || !payload.scp.split(' ').includes(entraScope)) return null;
    return payload.oid;
  } catch {
    return null;
  }
}
