import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import { env } from '../../config/env';

export const entraEnabled = env.authMode === 'entra';

if (entraEnabled && (!env.entraClientId || !env.entraTenantId || !env.entraApiScope)) {
  throw new Error('Microsoft sign-in requires VITE_ENTRA_CLIENT_ID, VITE_ENTRA_TENANT_ID, and VITE_ENTRA_API_SCOPE');
}

export const entraClient = entraEnabled
  ? new PublicClientApplication({
      auth: {
        clientId: env.entraClientId,
        authority: `https://login.microsoftonline.com/${env.entraTenantId}`,
        redirectUri: `${window.location.origin}/redirect.html`,
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
  : null;

export async function initializeEntra(): Promise<void> {
  if (!entraClient) return;
  await entraClient.initialize();
}

export function currentEntraAccount(): AccountInfo | null {
  if (!entraClient) return null;
  return entraClient.getActiveAccount() ?? entraClient.getAllAccounts()[0] ?? null;
}

export async function signInEntra(): Promise<AccountInfo> {
  if (!entraClient) throw new Error('Microsoft sign-in is not configured');
  const result = await entraClient.loginPopup({ scopes: [env.entraApiScope] });
  entraClient.setActiveAccount(result.account);
  return result.account;
}

export async function getEntraAccessToken(): Promise<string | null> {
  const account = currentEntraAccount();
  if (!entraClient || !account) return null;
  try {
    const result = await entraClient.acquireTokenSilent({ account, scopes: [env.entraApiScope] });
    return result.accessToken;
  } catch {
    const result = await entraClient.acquireTokenPopup({ account, scopes: [env.entraApiScope] });
    return result.accessToken;
  }
}

export async function signOutEntra(): Promise<void> {
  if (!entraClient) return;
  await entraClient.logoutPopup({ account: currentEntraAccount() ?? undefined });
}
