export type DashboardView =
  | 'dashboard'
  | 'formulations'
  | 'imports'
  | 'formulation-create'
  | 'formulation-detail'
  | 'formulation-edit'
  | 'formulation-results'
  | 'benchmarks'
  | 'analysis'
  | 'report'
  | 'settings';

export interface DashboardRouteState {
  formulationId: string;
  view: DashboardView;
}

export function parseDashboardHash(
  hash: string,
  defaultView: DashboardView,
): DashboardRouteState {
  const normalized = hash.replace(/^#/, '').replace(/^\/+/, '');
  const segments = normalized
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean);

  if (segments.length === 0) {
    return { formulationId: '', view: defaultView };
  }

  if (segments[0] === 'dashboard' || segments[0] === 'heartbeat') {
    return { formulationId: '', view: 'dashboard' };
  }

  if (segments[0] === 'benchmarks') {
    return { formulationId: '', view: 'benchmarks' };
  }

  if (segments[0] === 'imports') {
    return { formulationId: '', view: 'dashboard' };
  }

  if (segments[0] === 'analysis') {
    return { formulationId: '', view: 'dashboard' };
  }

  if (segments[0] === 'settings') {
    return { formulationId: '', view: 'settings' };
  }

  if (segments[0] === 'formulations') {
    if (segments[1] === 'new') {
      return { formulationId: '', view: 'formulation-create' };
    }

    if (!segments[1]) {
      return { formulationId: '', view: 'formulations' };
    }

    if (segments[2] === 'edit') {
      return { formulationId: segments[1], view: 'formulation-edit' };
    }

    if (segments[2] === 'results') {
      return { formulationId: segments[1], view: 'formulation-results' };
    }

    if (segments[2] === 'report') {
      return { formulationId: segments[1], view: 'report' };
    }

    return { formulationId: segments[1], view: 'formulation-detail' };
  }

  return { formulationId: '', view: defaultView };
}

export function buildDashboardHash({
  formulationId,
  view,
}: DashboardRouteState): string {
  if (view === 'dashboard') {
    return '#/dashboard';
  }

  if (view === 'benchmarks') {
    return '#/benchmarks';
  }

  if (view === 'imports') {
    return '#/dashboard';
  }

  if (view === 'analysis') {
    return '#/dashboard';
  }

  if (view === 'settings') {
    return '#/settings';
  }

  if (view === 'formulation-create') {
    return '#/formulations/new';
  }

  if (view === 'formulation-detail' && formulationId) {
    return `#/formulations/${encodeURIComponent(formulationId)}`;
  }

  if (view === 'formulation-edit' && formulationId) {
    return `#/formulations/${encodeURIComponent(formulationId)}/edit`;
  }

  if (view === 'formulation-results' && formulationId) {
    return `#/formulations/${encodeURIComponent(formulationId)}/results`;
  }

  if (view === 'report' && formulationId) {
    return `#/formulations/${encodeURIComponent(formulationId)}/report`;
  }

  return '#/formulations';
}
