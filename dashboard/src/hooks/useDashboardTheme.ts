import { useEffect, useState } from 'react';
import {
  applyTheme,
  getStoredTheme,
  type ThemeName,
} from '../theme/tokens';

export function useDashboardTheme() {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem('dashboard-theme', theme);
  }, [theme]);

  return [theme, setTheme] as const;
}
