import { DashboardLandingPage } from '../features/dashboard/DashboardLandingPage';
import { CreateFormulationWizard } from '../features/formulations/CreateFormulationWizard';
import { FormulationDetailPage } from '../features/formulations/FormulationDetailPage';
import { FormulationListPage } from '../features/formulations/FormulationListPage';
import { MasterDataPage } from '../features/library/MasterDataPage';
import { MaterialImportPage } from '../features/materials/MaterialImportPage';
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
import type { DashboardRouteState, DashboardView } from '../routing/dashboardRoute';
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
}

export function DashboardViewContent({
  onSettingsSave,
  onThemeChange,
  preferences,
  theme,
  view,
  formulationId,
  formulationMode,
  labRunId,
  labTestingMode,
  libraryRecordId,
  libraryRecordMode,
  librarySection,
  materialMode,
  productionRunId,
  productionRunMode,
  reportId,
  reportMode,
  reportRunId,
  navigate,
}: DashboardViewContentProps) {
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
    if (materialMode === 'import') {
      return <MaterialImportPage onCancel={() => navigate({ materialMode: 'list', view: 'materials' })} onCommitted={() => navigate({ materialMode: 'list', view: 'materials' })} />;
    }
    const section = librarySection ?? 'materials';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onImport={() => navigate({ librarySection: 'materials', materialMode: 'import', view: 'materials' })}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'materials' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'materials' })}
        recordId={libraryRecordId}
        sections={['materials', 'material-properties', 'material-suppliers']}
      />
    );
  }

  if (view === 'benchmarks') {
    const section = 'benchmarks';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'benchmarks' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'benchmarks' })}
        recordId={libraryRecordId}
        sections={['benchmarks']}
      />
    );
  }

  if (view === 'machines') {
    const section = 'machines';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'machines' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'machines' })}
        recordId={libraryRecordId}
        sections={['machines']}
      />
    );
  }

  if (view === 'molds') {
    const section = 'molds';
    return (
      <MasterDataPage
        activeSection={section}
        editRecordId={libraryRecordMode === 'edit' ? libraryRecordId : undefined}
        onOpenRecord={(id) => navigate({ libraryRecordId: id, libraryRecordMode: 'view', librarySection: section, view: 'molds' })}
        onSectionChange={(nextSection) => navigate({ librarySection: nextSection as DashboardRouteState['librarySection'], view: 'molds' })}
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
          onBack={() => navigate({ formulationMode: 'list', view: 'formulations' })}
          onCreateProductionRun={() => navigate({ productionRunMode: 'new', view: 'production-runs' })}
          onOpen={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
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
    if (productionRunMode === 'duplicate' && productionRunId) {
      return (
        <CreateProductionRunWizard
          duplicateSourceId={productionRunId}
          onCancel={() => navigate({ productionRunId, productionRunMode: 'detail', view: 'production-runs' })}
          onSaved={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
        />
      );
    }
    if (productionRunMode === 'detail' && productionRunId) {
      return (
        <ProductionRunDetailPage
          id={productionRunId}
          onBack={() => navigate({ productionRunMode: 'list', view: 'production-runs' })}
          onDuplicate={(id) => navigate({ productionRunId: id, productionRunMode: 'duplicate', view: 'production-runs' })}
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
          onBack={() => navigate({ labTestingMode: 'list', view: 'lab-testing' })}
          onOpenFormulation={(id) => navigate({ formulationId: id, formulationMode: 'detail', view: 'formulations' })}
          onOpenProductionRun={(id) => navigate({ productionRunId: id, productionRunMode: 'detail', view: 'production-runs' })}
        />
      );
    }
    return <LabTestingQueuePage onOpen={(id) => navigate({ labRunId: id, labTestingMode: 'detail', view: 'lab-testing' })} />;
  }

  if (view === 'reports') {
    if (reportMode === 'detail' && reportId) {
      return <ReportDetailPage reportId={reportId} onBack={() => navigate({ reportMode: 'list', view: 'reports' })} />;
    }
    if (reportMode === 'run' && reportRunId) {
      return <ReportDetailPage productionRunId={reportRunId} onBack={() => navigate({ productionRunId: reportRunId, productionRunMode: 'detail', view: 'production-runs' })} />;
    }
    return <ReportListPage onOpen={(id) => navigate({ reportId: id, reportMode: 'detail', view: 'reports' })} />;
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
