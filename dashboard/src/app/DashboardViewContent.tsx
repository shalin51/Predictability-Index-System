import { DashboardLandingPage } from '../features/dashboard/DashboardLandingPage';
import { CreateFormulationWizard } from '../features/formulations/CreateFormulationWizard';
import { FormulationDetailPage } from '../features/formulations/FormulationDetailPage';
import { FormulationListPage } from '../features/formulations/FormulationListPage';
import { MasterDataPage } from '../features/library/MasterDataPage';
import { ImportsPage } from '../features/imports/ImportsPage';
import { ImportSubPage } from '../features/imports/ImportSubPage';
import { ExportsPage } from '../features/imports/ExportsPage';
import { CreateProductionRunWizard } from '../features/production-runs/CreateProductionRunWizard';
import { ProductionRunDetailPage } from '../features/production-runs/ProductionRunDetailPage';
import { ProductionRunListPage } from '../features/production-runs/ProductionRunListPage';
import { ImportSetupSheetPage } from '../features/production-runs/ImportSetupSheetPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LabTestingQueuePage } from '../pages/lab-testing/LabTestingQueuePage';
import { LabTestingRunPage } from '../pages/lab-testing/LabTestingRunPage';
import { ReportDetailPage } from '../pages/reports/ReportDetailPage';
import { ReportListPage } from '../pages/reports/ReportListPage';
import type { DashboardPreferences } from './dashboardPreferences';
import type { DashboardRouteState, DashboardView, ImportResource } from '../routing/dashboardRoute';
import { themeOptions, type ThemeName } from '../theme/tokens';

interface DashboardViewContentProps {
  onSettingsSave: (next: { preferences: DashboardPreferences; theme: ThemeName }) => Promise<void> | void;
  onThemeChange: (theme: ThemeName) => void;
  preferences: DashboardPreferences;
  setHasUnsavedChanges: (dirty: boolean) => void;
  theme: ThemeName;
  view: DashboardView;
  formulationId?: string;
  formulationMode?: DashboardRouteState['formulationMode'];
  importResource?: DashboardRouteState['importResource'];
  labRunId?: string;
  labTestingMode?: DashboardRouteState['labTestingMode'];
  libraryRecordId?: string;
  libraryRecordMode?: DashboardRouteState['libraryRecordMode'];
  librarySection?: DashboardRouteState['librarySection'];
  materialMode?: DashboardRouteState['materialMode'];
  productionRunId?: string;
  productionRunMode?: DashboardRouteState['productionRunMode'];
  reportId?: string;
  reportMode?: DashboardRouteState['reportMode'];
  reportRunId?: string;
  navigate: (route: DashboardRouteState, options?: { replace?: boolean; skipConfirm?: boolean }) => boolean;
  goBack: (fallback: DashboardRouteState) => void;
}

/** Maps an import resource to the dashboard route where its data is visible. */
function importViewRoute(resource: ImportResource): DashboardRouteState {
  switch (resource) {
    case 'material-suppliers': return { view: 'materials', librarySection: 'material-suppliers' };
    case 'materials':          return { view: 'materials', librarySection: 'materials' };
    case 'material-properties': return { view: 'materials', librarySection: 'material-properties' };
    case 'machines':           return { view: 'machines', librarySection: 'machines' };
    case 'machine-parameters': return { view: 'machines', librarySection: 'machine-parameters' };
    case 'molds':              return { view: 'molds', librarySection: 'molds' };
    case 'mold-zones':         return { view: 'molds', librarySection: 'molds' };
    case 'benchmarks':         return { view: 'benchmarks', librarySection: 'benchmarks' };
    case 'scoring-rules':      return { view: 'benchmarks', librarySection: 'scoring-rules' };
    case 'formulations':       return { view: 'formulations', formulationMode: 'list' };
    case 'production-runs':    return { view: 'production-runs', productionRunMode: 'list' };
  }
}

export function DashboardViewContent({
  onSettingsSave,
  onThemeChange,
  preferences,
  theme,
  view,
  formulationId,
  formulationMode,
  importResource,
  labRunId,
  labTestingMode,
  libraryRecordId,
  libraryRecordMode,
  librarySection,
  productionRunId,
  productionRunMode,
  reportId,
  reportMode,
  reportRunId,
  goBack,
  navigate,
}: DashboardViewContentProps) {
  if (view === 'exports') {
    return <ExportsPage />;
  }

  if (view === 'imports') {
    if (importResource) {
      return (
        <ImportSubPage
          resource={importResource}
          onBack={() => navigate({ view: 'imports' })}
          onViewImported={() => navigate(importViewRoute(importResource))}
        />
      );
    }
    return (
      <ImportsPage
        onSelectResource={(resource) => navigate({ importResource: resource, view: 'imports' })}
      />
    );
  }

  if (view === 'dashboard') {
    return (
      <DashboardLandingPage
        autoRefresh={preferences.autoRefresh}
        onOpenLabRun={(id) => navigate({ labRunId: id, labTestingMode: 'detail', view: 'lab-testing' })}
        onOpenProductionRun={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
        onOpenReport={(id) => navigate({ reportId: id, reportMode: 'detail', view: 'reports' })}
      />
    );
  }

  if (view === 'materials') {
    const section = librarySection ?? 'materials';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'materials' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'materials' })}
        recordId={libraryRecordId}
        sections={['materials', 'material-properties', 'material-suppliers']}
      />
    );
  }

  if (view === 'benchmarks') {
    const section = librarySection === 'scoring-rules' ? librarySection : 'benchmarks';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'benchmarks' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'benchmarks' })}
        recordId={libraryRecordId}
        sections={['benchmarks', 'scoring-rules']}
      />
    );
  }

  if (view === 'machines') {
    const section = librarySection === 'machine-parameters' ? librarySection : 'machines';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'machines' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'machines' })}
        recordId={libraryRecordId}
        sections={['machines', 'machine-parameters']}
      />
    );
  }

  if (view === 'molds') {
    return (
      <MasterDataPage
        activeSection="molds"
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: 'molds', view: 'molds' })}
        onSectionChange={() => undefined}
        recordId={libraryRecordId}
        sections={['molds']}
      />
    );
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
          onBack={() => goBack({ formulationMode: 'list', view: 'formulations' })}
          onCreateProductionRun={() => navigate({ productionRunMode: 'new', view: 'production-runs' })}
          onOpenLabRun={(id) => navigate({ labRunId: id, labTestingMode: 'detail', view: 'lab-testing' })}
          onOpenProductionRun={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
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
    if (productionRunMode === 'import') {
      return <ImportSetupSheetPage onCancel={() => navigate({ productionRunMode: 'list', view: 'production-runs' })} onSaved={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })} />;
    }
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
          onBack={() => goBack({ productionRunMode: 'list', view: 'production-runs' })}
          onOpenFormulation={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
          onOpenLabRun={(runId) => navigate({ labRunId: runId, labTestingMode: 'detail', view: 'lab-testing' })}
          onOpenReport={(runId) => navigate({ reportMode: 'run', reportRunId: runId, view: 'reports' })}
        />
      );
    }
    return (
      <ProductionRunListPage
        onCreate={() => navigate({ productionRunMode: 'new', view: 'production-runs' })}
        onImport={() => navigate({ productionRunMode: 'import', view: 'production-runs' })}
        onOpen={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
      />
    );
  }

  if (view === 'lab-testing') {
    if (labTestingMode === 'detail' && labRunId) {
      return (
        <LabTestingRunPage
          id={labRunId}
          onBack={() => goBack({ labTestingMode: 'list', view: 'lab-testing' })}
          onOpenFormulation={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
          onOpenProductionRun={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
        />
      );
    }
    return <LabTestingQueuePage onOpen={(id) => navigate({ labRunId: id, labTestingMode: 'detail', view: 'lab-testing' })} />;
  }

  if (view === 'reports') {
    if (reportMode === 'detail' && reportId) {
      return <ReportDetailPage reportId={reportId} onBack={() => goBack({ reportMode: 'list', view: 'reports' })} />;
    }
    if (reportMode === 'run' && reportRunId) {
      return <ReportDetailPage productionRunId={reportRunId} onBack={() => goBack({ productionRunId: reportRunId, productionRunMode: 'detail', view: 'production-runs' })} />;
    }
    return <ReportListPage
      onOpen={(id) => navigate({ reportId: id, reportMode: 'detail', view: 'reports' })}
      onOpenProductionRuns={() => navigate({ productionRunMode: 'list', view: 'production-runs' })}
    />;
  }

  return (
    <SettingsPage
      onSave={onSettingsSave}
      onThemeChange={onThemeChange}
      preferences={preferences}
      theme={theme}
      themeOptions={themeOptions}
    />
  );
}
