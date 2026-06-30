import { useEffect, useState } from 'react';
import {
  DASHBOARD_PREFERENCES_KEY,
  getStoredPreferences,
  type DashboardPreferences,
} from '../app/dashboardPreferences';

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => getStoredPreferences());

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  return [preferences, setPreferences] as const;
}
