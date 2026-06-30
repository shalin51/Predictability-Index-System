import { useState, useEffect, useCallback } from 'react';
import type { HealthResponse, DbHealthResponse } from '@amfpi/shared';
import { checkHealth, checkDbHealth } from '../../services/api';

export type ApiStatus = 'checking' | 'online' | 'offline';
export type DbStatus = 'checking' | 'connected' | 'failed';

export interface HeartbeatState {
  apiStatus: ApiStatus;
  dbStatus: DbStatus;
  appEnv: string;
  serverTimestamp: string;
  apiError?: string;
  dbError?: string;
  lastChecked: Date | null;
}

const POLL_INTERVAL_MS = 10_000;

export function useHeartbeat() {
  const [state, setState] = useState<HeartbeatState>({
    apiStatus: 'checking',
    dbStatus: 'checking',
    appEnv: '—',
    serverTimestamp: '—',
    lastChecked: null,
  });

  const poll = useCallback(async () => {
    setState((prev) => ({ ...prev, apiStatus: 'checking', dbStatus: 'checking' }));

    let health: HealthResponse | null = null;
    let dbHealth: DbHealthResponse | null = null;
    let apiError: string | undefined;
    let dbError: string | undefined;

    try {
      health = await checkHealth();
    } catch (err) {
      apiError = err instanceof Error ? err.message : 'Connection refused';
    }

    try {
      dbHealth = await checkDbHealth();
    } catch (err) {
      dbError = err instanceof Error ? err.message : 'DB check failed';
    }

    setState({
      apiStatus: health?.status === 'ok' ? 'online' : 'offline',
      dbStatus: dbHealth?.connected === true ? 'connected' : 'failed',
      appEnv: health?.appEnv ?? '—',
      serverTimestamp: health?.timestamp ?? '—',
      apiError,
      dbError,
      lastChecked: new Date(),
    });
  }, []);

  useEffect(() => {
    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  return { ...state, refresh: poll };
}
