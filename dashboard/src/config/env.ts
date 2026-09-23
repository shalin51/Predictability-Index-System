function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`[dashboard-config] Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  apiBaseUrl: requireEnv('VITE_API_BASE_URL'),
  appEnv: requireEnv('VITE_APP_ENV'),
  authMode: import.meta.env.VITE_AUTH_MODE ?? 'password',
  entraClientId: import.meta.env.VITE_ENTRA_CLIENT_ID ?? '',
  entraTenantId: import.meta.env.VITE_ENTRA_TENANT_ID ?? '',
  entraApiScope: import.meta.env.VITE_ENTRA_API_SCOPE ?? '',
} as const;
