import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  completeLabTesting,
  generateSamples,
  getLabTestingResults,
  saveEnvironmentalResult,
  saveObservation,
  saveSampleResult,
  saveSubjectiveRating,
  startLabTesting,
  type LabMetric,
  type LabTestingResultsResponse,
  type SampleRecord,
} from '../../services/api';
import { EnvironmentalResultGrid } from '../../features/lab-testing/components/EnvironmentalResultGrid';
import { LabResultGrid } from '../../features/lab-testing/components/LabResultGrid';
import { LabRunHeader } from '../../features/lab-testing/components/LabRunHeader';
import { MissingRequiredMetricsPanel } from '../../features/lab-testing/components/MissingRequiredMetricsPanel';
import { ObservationPanel } from '../../features/lab-testing/components/ObservationPanel';
import { SubjectiveRatingForm } from '../../features/lab-testing/components/SubjectiveRatingForm';
import { LAB_RESULT_CATEGORIES, labStyles } from '../../features/lab-testing/labTestingUi';

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
  const [selectedCategory, setSelectedCategory] = useState<LabMetric['category'] | 'observations'>('physical');

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

  const saveEnvironmental = async (sample: SampleRecord, metric: LabMetric, value: number, testConditionId?: string | null) => {
    try {
      await saveEnvironmentalResult({
        metricId: metric.id,
        sampleId: sample.id,
        testConditionId: testConditionId ?? null,
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
  const resultMetricIdsBySample = new Map<string, Set<string>>();
  [...data.numericResults, ...data.environmentalResults, ...data.subjectiveRatings].forEach((result) => {
    if (!result.metricId || !requiredMetricIds.has(result.metricId)) return;
    const ids = resultMetricIdsBySample.get(result.sampleId) ?? new Set<string>();
    ids.add(result.metricId);
    resultMetricIdsBySample.set(result.sampleId, ids);
  });
  const sampleProgress = data.samples.map((sample) => ({ completed: resultMetricIdsBySample.get(sample.id)?.size ?? 0, sampleCode: sample.sampleCode, total: requiredMetricIds.size }));
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
                <strong style={styles.categoryHeading}>Categories</strong>
                {LAB_RESULT_CATEGORIES.map((category) => <button key={category.id} onClick={() => setSelectedCategory(category.id)} style={{ ...styles.navButton, ...(selectedCategory === category.id ? styles.selectedNavButton : {}) }} type="button">{category.label}</button>)}
                <button onClick={() => setSelectedCategory('observations')} style={{ ...styles.navButton, ...(selectedCategory === 'observations' ? styles.selectedNavButton : {}) }} type="button">Observations</button>
              </aside>
              <Card>
                <h2 style={labStyles.title}>{selectedSample.sampleCode} — {selectedCategory === 'observations' ? 'Observations' : LAB_RESULT_CATEGORIES.find((category) => category.id === selectedCategory)?.label}</h2>
                {selectedCategory === 'physical' && <LabResultGrid category="physical" hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[selectedSample]} />}
                {selectedCategory === 'performance' && <LabResultGrid category="performance" hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[selectedSample]} />}
                {selectedCategory === 'durability' && <div style={labStyles.stack}><LabResultGrid category="durability" hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[selectedSample]} /><ObservationPanel observations={data.observations.filter((item) => item.sampleId === selectedSample.id && item['observationType'] === 'crack_propagation')} onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))} sample={selectedSample} samples={[selectedSample]} /></div>}
                {selectedCategory === 'environmental' && <EnvironmentalResultGrid hideSampleColumn metrics={data.metrics} onSave={saveEnvironmental} results={data.environmentalResults} samples={[selectedSample]} testConditions={data.testConditions} />}
                {selectedCategory === 'subjective' && <SubjectiveRatingForm hideSampleColumn metrics={data.metrics} onFeedbackSave={(item, feedbackText) => void saveSubjectiveRating({ feedbackText, sampleId: item.id }).then(load).catch((err: Error) => setError(err.message))} onRatingSave={(item, metric, value) => void saveSubjectiveRating({ metricId: metric.id, ratingValue: value, sampleId: item.id }).then(load).catch((err: Error) => setError(err.message))} ratings={data.subjectiveRatings} samples={[selectedSample]} />}
                {selectedCategory === 'observations' && <ObservationPanel observations={data.observations.filter((item) => item.sampleId === selectedSample.id)} onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))} sample={selectedSample} samples={[selectedSample]} />}
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
  categoryHeading: { marginTop: 16 },
  navButton: { ...controlStyles.secondaryButton, textAlign: 'left', width: '100%' },
  selectedNavButton: { ...controlStyles.primaryButton },
  sidebar: { display: 'grid', alignContent: 'start', gap: 8 },
  workspace: { display: 'grid', gap: 16, gridTemplateColumns: '220px minmax(0, 1fr)' },
};
