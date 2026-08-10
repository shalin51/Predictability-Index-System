import { env } from '../../config/env';

const STORAGE_KEY = 'predictability-index-auth';
export const AUTH_CHANGED_EVENT = 'predictability-index-auth-changed';

export interface AuthSession {
  expiresAt: string;
  token: string;
  userName: string;
}

function emitAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getAuthSession(): AuthSession | null {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof session.token !== 'string' ||
      typeof session.userName !== 'string' ||
      typeof session.expiresAt !== 'string' ||
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      clearAuthSession();
      return null;
    }
    return session as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getAccessToken(): string | null {
  return getAuthSession()?.token ?? null;
}

export function clearAuthSession(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
  emitAuthChanged();
}

export async function login(userName: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${env.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password }),
  });

  const body = await response.json().catch(() => ({})) as Partial<AuthSession> & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? 'Unable to sign in');
  }
  if (!body.token || !body.userName || !body.expiresAt) {
    throw new Error('Invalid authentication response');
  }

  const session: AuthSession = {
    expiresAt: body.expiresAt,
    token: body.token,
    userName: body.userName,
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emitAuthChanged();
  return session;
}
