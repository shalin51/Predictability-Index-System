import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildDashboardPath,
  parseDashboardLocation,
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
      ? { view: defaultView }
      : parseDashboardLocation(window.location, defaultView),
  );
  const [view, setView] = useState<DashboardView>(() => initialRouteRef.current.view);
  const [librarySection, setLibrarySection] = useState<string>(() => initialRouteRef.current.librarySection ?? 'materials');
  const [labTestingMode, setLabTestingMode] = useState<DashboardRouteState['labTestingMode']>(() => initialRouteRef.current.labTestingMode ?? 'list');
  const [labRunId, setLabRunId] = useState<string | undefined>(() => initialRouteRef.current.labRunId);
  const [formulationMode, setFormulationMode] = useState<DashboardRouteState['formulationMode']>(() => initialRouteRef.current.formulationMode ?? 'list');
  const [formulationId, setFormulationId] = useState<string | undefined>(() => initialRouteRef.current.formulationId);
  const [productionRunMode, setProductionRunMode] = useState<DashboardRouteState['productionRunMode']>(() => initialRouteRef.current.productionRunMode ?? 'list');
  const [productionRunId, setProductionRunId] = useState<string | undefined>(() => initialRouteRef.current.productionRunId);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const currentPathRef = useRef(buildDashboardPath(initialRouteRef.current));
  const hasUnsavedChangesRef = useRef(false);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (hasUnsavedChanges) {
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
    setLibrarySection(route.librarySection ?? 'materials');
    setLabTestingMode(route.labTestingMode ?? 'list');
    setLabRunId(route.labRunId);
    setFormulationMode(route.formulationMode ?? 'list');
    setFormulationId(route.formulationId);
    setProductionRunMode(route.productionRunMode ?? 'list');
    setProductionRunId(route.productionRunId);

    const nextPath = buildDashboardPath(route);
    currentPathRef.current = nextPath;

    if (typeof window === 'undefined') {
      return;
    }

    if (window.location.pathname === nextPath && !window.location.hash) {
      return;
    }

    const nextUrl = `${nextPath}${window.location.search}`;

    if (replace) {
      window.history.replaceState(null, '', nextUrl);
      return;
    }

    window.history.pushState(null, '', nextUrl);
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

    const initialRoute = parseDashboardLocation(window.location, defaultView);
    const canonicalPath = buildDashboardPath(initialRoute);
    currentPathRef.current = canonicalPath;

    if (window.location.pathname !== canonicalPath || window.location.hash) {
      window.history.replaceState(null, '', `${canonicalPath}${window.location.search}`);
    }

    const handleLocationChange = () => {
      const nextRoute = parseDashboardLocation(window.location, defaultView);

      if (!confirmLeave()) {
        window.history.pushState(null, '', `${currentPathRef.current}${window.location.search}`);
        return;
      }

      setView(nextRoute.view);
      setLibrarySection(nextRoute.librarySection ?? 'materials');
      setLabTestingMode(nextRoute.labTestingMode ?? 'list');
      setLabRunId(nextRoute.labRunId);
      setFormulationMode(nextRoute.formulationMode ?? 'list');
      setFormulationId(nextRoute.formulationId);
      setProductionRunMode(nextRoute.productionRunMode ?? 'list');
      setProductionRunId(nextRoute.productionRunId);
      currentPathRef.current = buildDashboardPath(nextRoute);

      if (window.location.pathname !== currentPathRef.current || window.location.hash) {
        window.history.replaceState(null, '', `${currentPathRef.current}${window.location.search}`);
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
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
    formulationId,
    formulationMode,
    labRunId,
    labTestingMode,
    librarySection,
    navigate,
    productionRunId,
    productionRunMode,
    setHasUnsavedChanges,
    view,
  };
}
