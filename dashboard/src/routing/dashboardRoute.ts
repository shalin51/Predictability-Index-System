export type DashboardView =
  | 'dashboard'
  | 'formulations'
  | 'library'
  | 'production-runs'
  | 'lab-testing'
  | 'reports'
  | 'settings';

export interface DashboardRouteState {
  formulationId?: string;
  formulationMode?: 'list' | 'new' | 'detail';
  librarySection?: string;
  labRunId?: string;
  labTestingMode?: 'list' | 'detail';
  productionRunId?: string;
  productionRunMode?: 'list' | 'new' | 'detail';
  reportId?: string;
  reportMode?: 'list' | 'detail' | 'run';
  reportRunId?: string;
  view: DashboardView;
}

function normalizeRouteSegments(routeSource: string): string[] {
  const normalized = routeSource
    .replace(/^#/, '')
    .replace(/^\/+/, '')
    .replace(/[?#].*$/, '');

  return normalized
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean);
}

function parseRouteSegments(segments: string[]): DashboardRouteState | null {
  if (segments.length === 0) {
    return null;
  }

  if (segments[0] === 'dashboard' || segments[0] === 'heartbeat') {
    return { view: 'dashboard' };
  }

  if (segments[0] === 'library') {
    return { librarySection: segments[1] || 'materials', view: 'library' };
  }

  if (segments[0] === 'formulations') {
    if (segments[1] === 'new') {
      return { formulationMode: 'new', view: 'formulations' };
    }
    if (segments[1]) {
      return { formulationId: segments[1], formulationMode: 'detail', view: 'formulations' };
    }
    return { formulationMode: 'list', view: 'formulations' };
  }

  if (segments[0] === 'production-runs') {
    if (segments[1] === 'new') {
      return { productionRunMode: 'new', view: 'production-runs' };
    }
    if (segments[1] && segments[2] === 'report') {
      return { reportMode: 'run', reportRunId: segments[1], view: 'reports' };
    }
    if (segments[1]) {
      return { productionRunId: segments[1], productionRunMode: 'detail', view: 'production-runs' };
    }
    return { productionRunMode: 'list', view: 'production-runs' };
  }

  if (segments[0] === 'lab-testing') {
    if (segments[1] === 'runs' && segments[2]) {
      return { labRunId: segments[2], labTestingMode: 'detail', view: 'lab-testing' };
    }
    return { labTestingMode: 'list', view: 'lab-testing' };
  }

  if (segments[0] === 'reports') {
    if (segments[1]) {
      return { reportId: segments[1], reportMode: 'detail', view: 'reports' };
    }
    return { reportMode: 'list', view: 'reports' };
  }

  if (segments[0] === 'settings') {
    return { view: 'settings' };
  }

  return null;
}

export function parseDashboardLocation(
  location: Pick<Location, 'hash' | 'pathname'>,
  defaultView: DashboardView,
): DashboardRouteState {
  const pathnameRoute = parseRouteSegments(normalizeRouteSegments(location.pathname));

  if (pathnameRoute) {
    return pathnameRoute;
  }

  const hashRoute = parseRouteSegments(normalizeRouteSegments(location.hash));

  if (hashRoute) {
    return hashRoute;
  }

  return { view: defaultView };
}

export function buildDashboardPath({ formulationId, formulationMode, labRunId, labTestingMode, librarySection, productionRunId, productionRunMode, reportId, reportMode, reportRunId, view }: DashboardRouteState): string {
  if (view === 'library') {
    return `/library/${encodeURIComponent(librarySection || 'materials')}`;
  }

  if (view === 'formulations') {
    if (formulationMode === 'new') {
      return '/formulations/new';
    }
    if (formulationMode === 'detail' && formulationId) {
      return `/formulations/${encodeURIComponent(formulationId)}`;
    }
    return '/formulations';
  }

  if (view === 'production-runs') {
    if (productionRunMode === 'new') {
      return '/production-runs/new';
    }
    if (productionRunMode === 'detail' && productionRunId) {
      return `/production-runs/${encodeURIComponent(productionRunId)}`;
    }
    return '/production-runs';
  }

  if (view === 'lab-testing') {
    if (labTestingMode === 'detail' && labRunId) {
      return `/lab-testing/runs/${encodeURIComponent(labRunId)}`;
    }
    return '/lab-testing';
  }

  if (view === 'reports') {
    if (reportMode === 'detail' && reportId) {
      return `/reports/${encodeURIComponent(reportId)}`;
    }
    if (reportMode === 'run' && reportRunId) {
      return `/production-runs/${encodeURIComponent(reportRunId)}/report`;
    }
    return '/reports';
  }

  if (view === 'settings') {
    return '/settings';
  }

  return '/dashboard';
}
