export type DashboardView =
  | 'dashboard'
  | 'formulations'
  | 'materials'
  | 'benchmarks'
  | 'machines'
  | 'molds'
  | 'production-runs'
  | 'lab-testing'
  | 'reports'
  | 'settings';

export type LibrarySection =
  | 'materials'
  | 'material-properties'
  | 'material-suppliers'
  | 'benchmarks'
  | 'scoring-rules'
  | 'machines'
  | 'machine-parameters'
  | 'molds'
  | 'mold-zones';

export interface DashboardRouteState {
  formulationId?: string;
  formulationMode?: 'list' | 'new' | 'detail';
  libraryRecordId?: string;
  libraryRecordMode?: 'view' | 'edit';
  librarySection?: LibrarySection;
  materialMode?: 'list' | 'import';
  labRunId?: string;
  labTestingMode?: 'list' | 'detail';
  productionRunId?: string;
  productionRunMode?: 'list' | 'new' | 'duplicate' | 'import' | 'detail';
  reportId?: string;
  reportMode?: 'list' | 'detail' | 'run';
  reportRunId?: string;
  view: DashboardView;
}

const libraryViewBySection: Record<LibrarySection, DashboardView> = {
  benchmarks: 'benchmarks',
  'scoring-rules': 'benchmarks',
  machines: 'machines',
  'machine-parameters': 'machines',
  materials: 'materials',
  'material-properties': 'materials',
  'material-suppliers': 'materials',
  molds: 'molds',
  'mold-zones': 'molds',
};

const librarySections = new Set<LibrarySection>(Object.keys(libraryViewBySection) as LibrarySection[]);

function parseLibraryRoute(section: LibrarySection, recordId?: string): DashboardRouteState {
  return {
    libraryRecordId: recordId,
    librarySection: section,
    materialMode: section === 'materials' ? 'list' : undefined,
    view: libraryViewBySection[section],
  };
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
    const legacy = segments[1] === 'suppliers' ? 'material-suppliers' : segments[1];
    return legacy && librarySections.has(legacy as LibrarySection)
      ? parseLibraryRoute(legacy as LibrarySection, segments[2])
      : parseLibraryRoute('materials');
  }

  if (segments[0] === 'materials') {
    if (segments[1] === 'import') return { librarySection: 'materials', materialMode: 'import', view: 'materials' };
    return parseLibraryRoute('materials', segments[1]);
  }

  if (segments[0] === 'suppliers') {
    return parseLibraryRoute('material-suppliers', segments[1]);
  }

  if (librarySections.has(segments[0] as LibrarySection)) {
    return parseLibraryRoute(segments[0] as LibrarySection, segments[1]);
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
    if (segments[1] === 'import') {
      return { productionRunMode: 'import', view: 'production-runs' };
    }
    if (segments[1] && segments[2] === 'duplicate') {
      return { productionRunId: segments[1], productionRunMode: 'duplicate', view: 'production-runs' };
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

export function buildDashboardPath({ formulationId, formulationMode, labRunId, labTestingMode, libraryRecordId, librarySection, materialMode, productionRunId, productionRunMode, reportId, reportMode, reportRunId, view }: DashboardRouteState): string {
  if (view === 'materials') {
    if (materialMode === 'import') return '/materials/import';
    const section = librarySection ?? 'materials';
    return `/${section}${libraryRecordId ? `/${encodeURIComponent(libraryRecordId)}` : ''}`;
  }

  if (view === 'benchmarks') {
    const section = librarySection === 'scoring-rules' ? librarySection : 'benchmarks';
    return `/${section}${libraryRecordId ? `/${encodeURIComponent(libraryRecordId)}` : ''}`;
  }

  if (view === 'machines') {
    const section = librarySection === 'machine-parameters' ? librarySection : 'machines';
    return `/${section}${libraryRecordId ? `/${encodeURIComponent(libraryRecordId)}` : ''}`;
  }

  if (view === 'molds') {
    const section = librarySection === 'mold-zones' ? librarySection : 'molds';
    return `/${section}${libraryRecordId ? `/${encodeURIComponent(libraryRecordId)}` : ''}`;
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
    if (productionRunMode === 'import') {
      return '/production-runs/import';
    }
    if (productionRunMode === 'duplicate' && productionRunId) {
      return `/production-runs/${encodeURIComponent(productionRunId)}/duplicate`;
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
