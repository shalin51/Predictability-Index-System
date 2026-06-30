import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildDashboardHash,
  parseDashboardHash,
  type DashboardRouteState,
  type DashboardView,
} from '../routing/dashboardRoute';

interface NavigateOptions {
  replace?: boolean;
  skipConfirm?: boolean;
}

export function useDashboardRoute(defaultView: DashboardView) {
  const initialRouteRef = useRef<DashboardRouteState>(
    typeof window === 'undefined'
      ? { formulationId: '', view: defaultView }
      : parseDashboardHash(window.location.hash, defaultView),
  );
  const [view, setView] = useState<DashboardView>(() => initialRouteRef.current.view);
  const [selectedFormulationId, setSelectedFormulationId] = useState<string>(
    () => initialRouteRef.current.formulationId,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const currentHashRef = useRef(buildDashboardHash(initialRouteRef.current));
  const ignoreHashChangeRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (view !== 'formulation-create' && view !== 'formulation-edit' && hasUnsavedChanges) {
      setHasUnsavedChanges(false);
    }
  }, [hasUnsavedChanges, view]);

  const confirmLeave = useCallback(() => {
    if (!hasUnsavedChangesRef.current) {
      return true;
    }

    return window.confirm('You have unsaved changes. Leave this page?');
  }, []);

  const commitRoute = useCallback((route: DashboardRouteState, replace = false) => {
    setView(route.view);
    setSelectedFormulationId(route.formulationId);

    const nextHash = buildDashboardHash(route);
    currentHashRef.current = nextHash;

    if (typeof window === 'undefined' || window.location.hash === nextHash) {
      return;
    }

    if (replace) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
      return;
    }

    ignoreHashChangeRef.current = true;
    window.location.hash = nextHash;
  }, []);

  const navigate = useCallback((route: DashboardRouteState, options?: NavigateOptions) => {
    if (!options?.skipConfirm && !confirmLeave()) {
      return false;
    }

    commitRoute(route, options?.replace);
    return true;
  }, [commitRoute, confirmLeave]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.location.hash) {
      commitRoute(initialRouteRef.current, true);
    } else {
      currentHashRef.current = buildDashboardHash(
        parseDashboardHash(window.location.hash, defaultView),
      );
    }

    const handleHashChange = () => {
      if (ignoreHashChangeRef.current) {
        ignoreHashChangeRef.current = false;
        currentHashRef.current = window.location.hash;
        return;
      }

      const nextRoute = parseDashboardHash(window.location.hash, defaultView);

      if (!confirmLeave()) {
        ignoreHashChangeRef.current = true;
        window.location.hash = currentHashRef.current;
        return;
      }

      setView(nextRoute.view);
      setSelectedFormulationId(nextRoute.formulationId);
      currentHashRef.current = buildDashboardHash(nextRoute);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [commitRoute, confirmLeave, defaultView]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    navigate,
    selectedFormulationId,
    setHasUnsavedChanges,
    view,
  };
}
