import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  completeLabTesting,
  generateSamples,
  getLabTestingResults,
  saveSampleResult,
  startLabTesting,
  type LabMetric,
  type LabTestingResultsResponse,
  type SampleRecord,
} from '../../services/api';
import { LabResultGrid } from '../../features/lab-testing/components/LabResultGrid';
import { LabRunHeader } from '../../features/lab-testing/components/LabRunHeader';
import { MissingRequiredMetricsPanel } from '../../features/lab-testing/components/MissingRequiredMetricsPanel';
import { labStyles } from '../../features/lab-testing/labTestingUi';

export function LabTestingRunPage({
  id,
  onBack,
  onOpenFormulation,
  onOpenProductionRun,
}: {
  id: string;
  onBack: () => void;
  onOpenFormulation: (formulationId: string) => void;
  onOpenProductionRun: (productionRunId: string) => void;
}) {
  const [data, setData] = useState<LabTestingResultsResponse | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSampleId, setSelectedSampleId] = useState('');

  const load = () => {
    setError('');
    void getLabTestingResults(id).then(setData).catch((err: Error) => setError(err.message));
  };

  useEffect(load, [id]);

  const saveNumeric = async (sample: SampleRecord, metric: LabMetric, value: number) => {
    try {
      await saveSampleResult({
        metricId: metric.id,
        sampleId: sample.id,
        testMethodId: metric.testMethodId ?? null,
        unit: metric.defaultUnit ?? '',
        valueNumeric: value,
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  if (!data) {
    return (
      <DashboardPage maxWidth="100%">
        <Card>{error ? <MessageBanner tone="danger">{error}</MessageBanner> : <div style={labStyles.muted}>Loading...</div>}</Card>
      </DashboardPage>
    );
  }

  const run = data.run;
  const selectedSample = data.samples.find((sample) => sample.id === selectedSampleId) ?? data.samples[0];
  const requiredMetricIds = new Set(data.metrics.filter((metric) => metric.requiredForScoring).map((metric) => metric.id));
  const progressMetricIds = requiredMetricIds.size > 0 ? requiredMetricIds : new Set(data.metrics.map((metric) => metric.id));
  const perSampleTotal = progressMetricIds.size || (data.samples.length ? Math.ceil(run.requiredResultCount / data.samples.length) : 0);
  const resultMetricIdsBySample = new Map<string, Set<string>>();
  [...data.numericResults, ...data.environmentalResults, ...data.subjectiveRatings].forEach((result) => {
    if (!result.metricId || (progressMetricIds.size > 0 && !progressMetricIds.has(result.metricId))) return;
    const ids = resultMetricIdsBySample.get(result.sampleId) ?? new Set<string>();
    ids.add(result.metricId);
    resultMetricIdsBySample.set(result.sampleId, ids);
  });
  const sampleProgress = data.samples.map((sample) => ({ completed: resultMetricIdsBySample.get(sample.id)?.size ?? 0, sampleCode: sample.sampleCode, total: perSampleTotal }));
  const overallProgress = { completed: sampleProgress.reduce((total, sample) => total + sample.completed, 0), total: run.requiredResultCount || sampleProgress.reduce((total, sample) => total + sample.total, 0) };
  const disabledComplete = data.samples.length === 0 || run.missingRequiredMetrics > 0;
  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <LabRunHeader
          onBack={onBack}
          onComplete={() => {
            if (disabledComplete) {
              setError(data.samples.length === 0 ? 'Cannot complete testing without samples' : `Cannot complete testing with ${run.missingRequiredMetrics} required metrics missing`);
              return;
            }
            void completeLabTesting(id).then(() => { setMessage('Testing completed'); load(); }).catch((err: Error) => setError(err.message));
          }}
          onOpenFormulation={onOpenFormulation}
          onOpenProductionRun={onOpenProductionRun}
          overallProgress={overallProgress}
          onStart={() => void startLabTesting(id).then(() => { setMessage('Testing started'); load(); }).catch((err: Error) => setError(err.message))}
          run={run}
          sampleProgress={sampleProgress}
        />
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        {data.samples.length === 0 && (
          <EmptyState>
            No samples on this run.
            {(run.status === 'ready_for_testing' || run.status === 'testing') && <div style={labStyles.actions}><button onClick={() => void generateSamples(id, { count: 5, startingSampleCode: `${run.runCode}-S01` }).then(() => { setMessage('Samples generated'); load(); }).catch((err: Error) => setError(err.message))} style={controlStyles.primaryButton} type="button">Generate Samples</button></div>}
          </EmptyState>
        )}
        {data.samples.length > 0 && (
          <>
            <p style={labStyles.muted}>Enter test results for each sample below. Values save when you leave a field.</p>
            {selectedSample && <div style={styles.workspace}>
              <aside style={styles.sidebar}>
                <strong>Samples</strong>
                {data.samples.map((sample) => <button key={sample.id} onClick={() => setSelectedSampleId(sample.id)} style={{ ...styles.navButton, ...(sample.id === selectedSample.id ? styles.selectedNavButton : {}) }} type="button">{sample.sampleCode}</button>)}
              </aside>
              <Card>
                <h2 style={labStyles.title}>{selectedSample.sampleCode}</h2>
                <LabResultGrid hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[selectedSample]} />
              </Card>
            </div>}
            <MissingRequiredMetricsPanel metrics={data.metrics} results={data.numericResults} samples={data.samples} />
          </>
        )}
      </Card>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  navButton: { ...controlStyles.secondaryButton, textAlign: 'left', width: '100%' },
  selectedNavButton: { ...controlStyles.primaryButton },
  sidebar: { display: 'grid', alignContent: 'start', gap: 8 },
  workspace: { display: 'grid', gap: 16, gridTemplateColumns: '220px minmax(0, 1fr)' },
};
