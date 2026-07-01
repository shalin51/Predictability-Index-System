import type { ShellNavItem } from '../components/shell/AppShell';
import type { DashboardView } from '../routing/dashboardRoute';

export const NAV: ReadonlyArray<ShellNavItem<DashboardView>> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'High-level record counts.',
    group: 'Operations',
    icon: 'grid',
  },
  {
    id: 'formulations',
    label: 'Formulations',
    description: 'Formulation records and production details.',
    group: 'Workspace',
    icon: 'flask',
  },
  {
    id: 'benchmarks',
    label: 'Benchmarks',
    description: 'Target envelopes and scoring weights.',
    group: 'Workspace',
    icon: 'layers',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Theme, alerts, and startup preferences.',
    group: 'System',
    icon: 'settings',
  },
] as const;

export const VIEW_META: Record<DashboardView, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'See current formulation and benchmark counts.',
  },
  formulations: {
    title: 'Formulations',
    subtitle: 'Browse and maintain formulation records.',
  },
  'formulation-create': {
    title: 'Create formulation',
    subtitle: 'Add a new formulation record.',
  },
  'formulation-detail': {
    title: 'Formulation detail',
    subtitle: 'Review the selected formulation record.',
  },
  'formulation-edit': {
    title: 'Edit formulation',
    subtitle: 'Update the current formulation record.',
  },
  'formulation-results': {
    title: 'Test results',
    subtitle: 'Review stored test result data.',
  },
  benchmarks: {
    title: 'Benchmark control',
    subtitle: 'Maintain benchmark envelopes, metric weights, and validation balance.',
  },
  imports: {
    title: 'Workbook imports',
    subtitle: 'Import is currently unavailable.',
  },
  analysis: {
    title: 'Analysis',
    subtitle: 'Analysis is currently unavailable.',
  },
  report: {
    title: 'Report output',
    subtitle: 'Export the current executive summary, benchmark breakdown, and recommendations.',
  },
  settings: {
    title: 'Shell settings',
    subtitle: 'Switch themes and local dashboard behavior without touching application data.',
  },
};

export function getActiveNavView(view: DashboardView): DashboardView {
  if (
    view === 'formulation-create'
    || view === 'formulation-detail'
    || view === 'formulation-edit'
    || view === 'formulation-results'
    || view === 'report'
  ) {
    return 'formulations';
  }

  return view;
}
