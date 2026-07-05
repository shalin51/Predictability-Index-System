import type { ClientConfig } from 'pg';
import { DefaultAzureCredential } from '@azure/identity';
import { config } from '../../config/env';

const credential = new DefaultAzureCredential();

function buildSslConfig(): ClientConfig['ssl'] {
  if (config.db.sslMode !== 'require') {
    return false;
  }

  return {
    rejectUnauthorized: false,
  };
}

async function getEntraPassword(): Promise<string> {
  const token = await credential.getToken(config.db.azurePostgresScope);

  if (!token?.token) {
    throw new Error('Failed to acquire Microsoft Entra token for PostgreSQL');
  }

  return token.token;
}

export function createPgClientConfig(overrides: Partial<ClientConfig> = {}): ClientConfig {
  return {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.authMode === 'entra' ? getEntraPassword : config.db.password,
    ssl: buildSslConfig(),
    connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    ...overrides,
  };
}
