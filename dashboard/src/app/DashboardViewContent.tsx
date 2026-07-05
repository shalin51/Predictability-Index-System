import { DashboardLandingPage } from '../features/dashboard/DashboardLandingPage';
import { CreateFormulationWizard } from '../features/formulations/CreateFormulationWizard';
import { FormulationDetailPage } from '../features/formulations/FormulationDetailPage';
import { FormulationListPage } from '../features/formulations/FormulationListPage';
import { LibraryPage } from '../features/library/LibraryPage';
import { CreateProductionRunWizard } from '../features/production-runs/CreateProductionRunWizard';
import { ProductionRunDetailPage } from '../features/production-runs/ProductionRunDetailPage';
import { ProductionRunListPage } from '../features/production-runs/ProductionRunListPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WorkspacePlaceholderPage } from '../features/workspace/WorkspacePlaceholderPage';
import type { DashboardPreferences } from './dashboardPreferences';
import type { DashboardRouteState, DashboardView } from '../routing/dashboardRoute';
import { themeOptions, type ThemeName } from '../theme/tokens';

interface DashboardViewContentProps {
  onSettingsSave: (next: { preferences: DashboardPreferences; theme: ThemeName }) => Promise<void> | void;
  preferences: DashboardPreferences;
  setHasUnsavedChanges: (dirty: boolean) => void;
  theme: ThemeName;
  view: DashboardView;
  formulationId?: string;
  formulationMode?: DashboardRouteState['formulationMode'];
  librarySection: string;
  productionRunId?: string;
  productionRunMode?: DashboardRouteState['productionRunMode'];
  navigate: (route: DashboardRouteState, options?: { replace?: boolean; skipConfirm?: boolean }) => boolean;
}

const PLACEHOLDER_CONTENT = {
  library: {
    description: 'Ready for the reference data and assets you want to add next.',
    highlights: [
      'Reference documents and source files',
      'Shared datasets and reusable assets',
      'Import and curation workflows',
    ],
    title: 'Library',
  },
  'production-runs': {
    description: 'Ready for manufacturing run records, status tracking, and execution history.',
    highlights: [
      'Run schedules and batch tracking',
      'Manufacturing status and outcomes',
      'Operator notes and process context',
    ],
    title: 'Production Runs',
  },
  'lab-testing': {
    description: 'Ready for sample queues, result entry, and validation review workflows.',
    highlights: [
      'Sample intake and test queues',
      'Result capture and review states',
      'Validation summaries and comparisons',
    ],
    title: 'Lab Testing',
  },
  reports: {
    description: 'Ready for generated summaries, report history, and export workflows.',
    highlights: [
      'Generated report history',
      'Scheduled and manual exports',
      'Distribution and approval workflow',
    ],
    title: 'Reports',
  },
} as const;

export function DashboardViewContent({
  onSettingsSave,
  preferences,
  theme,
  view,
  formulationId,
  formulationMode,
  librarySection,
  productionRunId,
  productionRunMode,
  navigate,
}: DashboardViewContentProps) {
  if (view === 'dashboard') {
    return <DashboardLandingPage />;
  }

  if (view === 'library') {
    return <LibraryPage activeSection={librarySection} onSectionChange={(section) => navigate({ librarySection: section, view: 'library' })} />;
  }

  if (view === 'formulations') {
    if (formulationMode === 'new') {
      return (
        <CreateFormulationWizard
          onCancel={() => navigate({ formulationMode: 'list', view: 'formulations' })}
          onSaved={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
        />
      );
    }
    if (formulationMode === 'detail' && formulationId) {
      return (
        <FormulationDetailPage
          id={formulationId}
          onBack={() => navigate({ formulationMode: 'list', view: 'formulations' })}
          onOpen={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
        />
      );
    }
    return (
      <FormulationListPage
        onCreate={() => navigate({ formulationMode: 'new', view: 'formulations' })}
        onOpen={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
      />
    );
  }

  if (view === 'production-runs') {
    if (productionRunMode === 'new') {
      return (
        <CreateProductionRunWizard
          onCancel={() => navigate({ productionRunMode: 'list', view: 'production-runs' })}
          onSaved={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
        />
      );
    }
    if (productionRunMode === 'detail' && productionRunId) {
      return (
        <ProductionRunDetailPage
          id={productionRunId}
          onBack={() => navigate({ productionRunMode: 'list', view: 'production-runs' })}
        />
      );
    }
    return (
      <ProductionRunListPage
        onCreate={() => navigate({ productionRunMode: 'new', view: 'production-runs' })}
        onOpen={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
      />
    );
  }

  if (view === 'lab-testing' || view === 'reports') {
    const content = PLACEHOLDER_CONTENT[view];
    return (
      <WorkspacePlaceholderPage
        description={content.description}
        highlights={content.highlights}
        title={content.title}
      />
    );
  }

  return (
    <SettingsPage
      onSave={onSettingsSave}
      preferences={preferences}
      theme={theme}
      themeOptions={themeOptions}
    />
  );
}
