import type { ShellNavItem } from '../components/shell/AppShell';
import type { DashboardView } from '../routing/dashboardRoute';

export const NAV: ReadonlyArray<ShellNavItem<DashboardView>> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Landing overview for workflow, benchmarks, and activity.',
    group: 'Operations',
    icon: 'grid',
  },
  {
    id: 'formulations',
    label: 'Formulations',
    description: 'Records, materials, and production details.',
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
    id: 'analysis',
    label: 'Analysis',
    description: 'Comparisons, risks, and historical scores.',
    group: 'Workspace',
    icon: 'scan',
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
    title: 'Landing dashboard',
    subtitle: 'See formulation volume, benchmark coverage, success ratio, and live operational activity in one place.',
  },
  formulations: {
    title: 'Formulation workspace',
    subtitle: 'Browse active recipes, open records, and stage new formulations without leaving the dashboard.',
  },
  'formulation-create': {
    title: 'Create formulation',
    subtitle: 'Capture a new formulation record and move directly into test and reporting flows.',
  },
  'formulation-detail': {
    title: 'Formulation detail',
    subtitle: 'Review metadata, materials, and downstream actions for the selected formulation.',
  },
  'formulation-edit': {
    title: 'Edit formulation',
    subtitle: 'Update record details while keeping the surrounding workflow context visible.',
  },
  'formulation-results': {
    title: 'Test results',
    subtitle: 'Manage the 72-hour validation inputs before running comparative analysis.',
  },
  benchmarks: {
    title: 'Benchmark control',
    subtitle: 'Maintain benchmark envelopes, metric weights, and validation balance.',
  },
  analysis: {
    title: 'Analysis command',
    subtitle: 'Compare formulations against benchmark profiles and surface the highest-risk deltas.',
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
