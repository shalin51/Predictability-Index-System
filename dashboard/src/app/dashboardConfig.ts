import type { ShellNavItem } from '../components/shell/AppShell';
import type { DashboardView } from '../routing/dashboardRoute';

export const NAV: ReadonlyArray<ShellNavItem<DashboardView>> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Workspace overview.',
    group: 'Operations',
    icon: 'grid',
  },
  {
    id: 'materials',
    label: 'Materials',
    description: 'Material properties, processing guidance, and source data.',
    group: 'Operations',
    icon: 'upload',
  },
  {
    id: 'machines',
    label: 'Machines',
    description: 'Machine models, specifications, and capabilities.',
    group: 'Operations',
    icon: 'scan',
  },
  {
    id: 'molds',
    label: 'Molds',
    description: 'Mold configuration and hot-runner zones.',
    group: 'Operations',
    icon: 'grid',
  },
  {
    id: 'formulations',
    label: 'Formulations',
    description: 'Recipe workflow and version history.',
    group: 'Workspace',
    icon: 'flask',
  },
  {
    id: 'production-runs',
    label: 'Production Runs',
    description: 'Manufacturing run workspace.',
    group: 'Workspace',
    icon: 'scan',
  },
  {
    id: 'lab-testing',
    label: 'Lab Testing',
    description: 'Testing workflow workspace.',
    group: 'Workspace',
    icon: 'pulse',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Reporting workspace.',
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
    subtitle: 'Workspace overview.',
  },
  materials: {
    title: 'Materials',
    subtitle: 'Material properties, processing guidance, and source data.',
  },
  machines: {
    title: 'Machines',
    subtitle: 'Machine identity, specifications, and parameter capabilities.',
  },
  molds: {
    title: 'Molds',
    subtitle: 'Mold identity, cavities, and hot-runner zone configuration.',
  },
  formulations: {
    title: 'Formulations',
    subtitle: 'Recipe composition, approval, and version workflow.',
  },
  'production-runs': {
    title: 'Production Runs',
    subtitle: 'Manufacturing run workspace.',
  },
  'lab-testing': {
    title: 'Lab Testing',
    subtitle: 'Testing workflow workspace.',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Reporting workspace.',
  },
  settings: {
    title: 'Shell settings',
    subtitle: 'Switch themes and local dashboard behavior without touching application data.',
  },
};

export function getActiveNavView(view: DashboardView): DashboardView {
  return view;
}
