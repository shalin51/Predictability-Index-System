import { AnalysisPage } from '../features/analysis/AnalysisPage';
import { BenchmarkPage } from '../features/benchmarks/BenchmarkPage';
import { DashboardLandingPage } from '../features/dashboard/DashboardLandingPage';
import { FormulationDetailPage } from '../features/formulations/FormulationDetailPage';
import { FormulationEditorPage } from '../features/formulations/FormulationEditorPage';
import { FormulationListPage } from '../features/formulations/FormulationListPage';
import { ReportPage } from '../features/reports/ReportPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TestResultsPage } from '../features/test-results/TestResultsPage';
import type { DashboardPreferences } from './dashboardPreferences';
import type { DashboardRouteState, DashboardView } from '../routing/dashboardRoute';
import { themeOptions, type ThemeName } from '../theme/tokens';

interface DashboardViewContentProps {
  onPreferenceChange: (next: DashboardPreferences) => void;
  onThemeChange: (theme: ThemeName) => void;
  preferences: DashboardPreferences;
  selectedFormulationId: string;
  setHasUnsavedChanges: (dirty: boolean) => void;
  theme: ThemeName;
  view: DashboardView;
  navigate: (route: DashboardRouteState, options?: { replace?: boolean; skipConfirm?: boolean }) => boolean;
}

export function DashboardViewContent({
  onPreferenceChange,
  onThemeChange,
  preferences,
  selectedFormulationId,
  setHasUnsavedChanges,
  theme,
  view,
  navigate,
}: DashboardViewContentProps) {
  const handleFormSelect = (id: string) => {
    void navigate({ formulationId: id, view: 'formulation-detail' });
  };

  if (view === 'dashboard') {
    return (
      <DashboardLandingPage
        onOpenAnalysis={() => {
          void navigate({ formulationId: selectedFormulationId, view: 'analysis' });
        }}
        onOpenBenchmarks={() => {
          void navigate({ formulationId: '', view: 'benchmarks' });
        }}
        onOpenFormulations={() => {
          void navigate({ formulationId: '', view: 'formulations' });
        }}
      />
    );
  }

  if (view === 'formulations') {
    return (
      <FormulationListPage
        onCreate={() => {
          void navigate({ formulationId: '', view: 'formulation-create' });
        }}
        onSelect={handleFormSelect}
      />
    );
  }

  if (view === 'formulation-create') {
    return (
      <FormulationEditorPage
        mode="create"
        onBack={() => {
          void navigate({ formulationId: '', view: 'formulations' });
        }}
        onDirtyChange={setHasUnsavedChanges}
        onSaved={(id) => {
          setHasUnsavedChanges(false);
          void navigate({ formulationId: id, view: 'formulation-detail' }, { replace: true, skipConfirm: true });
        }}
      />
    );
  }

  if (view === 'formulation-detail' && selectedFormulationId) {
    return (
      <FormulationDetailPage
        formulationId={selectedFormulationId}
        onAnalyse={(id) => {
          void navigate({ formulationId: id, view: 'analysis' });
        }}
        onBack={() => {
          void navigate({ formulationId: '', view: 'formulations' });
        }}
        onEdit={(id) => {
          void navigate({ formulationId: id, view: 'formulation-edit' });
        }}
        onReport={(id) => {
          void navigate({ formulationId: id, view: 'report' });
        }}
        onTestResults={(id) => {
          void navigate({ formulationId: id, view: 'formulation-results' });
        }}
      />
    );
  }

  if (view === 'formulation-edit' && selectedFormulationId) {
    return (
      <FormulationEditorPage
        formulationId={selectedFormulationId}
        mode="edit"
        onBack={() => {
          void navigate({ formulationId: selectedFormulationId, view: 'formulation-detail' });
        }}
        onDirtyChange={setHasUnsavedChanges}
        onSaved={(id) => {
          setHasUnsavedChanges(false);
          void navigate({ formulationId: id, view: 'formulation-detail' }, { replace: true, skipConfirm: true });
        }}
      />
    );
  }

  if (view === 'formulation-results' && selectedFormulationId) {
    return (
      <TestResultsPage
        formulationId={selectedFormulationId}
        onAnalyse={(id) => {
          void navigate({ formulationId: id, view: 'analysis' });
        }}
        onBack={() => {
          void navigate({ formulationId: selectedFormulationId, view: 'formulation-detail' });
        }}
      />
    );
  }

  if (view === 'benchmarks') {
    return <BenchmarkPage />;
  }

  if (view === 'analysis') {
    return (
      <AnalysisPage
        initialFormulationId={selectedFormulationId}
        onViewReport={(id) => {
          void navigate({ formulationId: id, view: 'report' });
        }}
      />
    );
  }

  if (view === 'report' && selectedFormulationId) {
    return (
      <ReportPage
        formulationId={selectedFormulationId}
        onBack={() => {
          void navigate({ formulationId: selectedFormulationId, view: 'formulation-detail' });
        }}
      />
    );
  }

  return (
    <SettingsPage
      onPreferencesChange={onPreferenceChange}
      onThemeChange={onThemeChange}
      preferences={preferences}
      theme={theme}
      themeOptions={themeOptions}
    />
  );
}
