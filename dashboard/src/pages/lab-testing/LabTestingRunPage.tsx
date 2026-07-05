import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  completeLabTesting,
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
import { MetricCategoryTabs } from '../../features/lab-testing/components/MetricCategoryTabs';
import { MissingRequiredMetricsPanel } from '../../features/lab-testing/components/MissingRequiredMetricsPanel';
import { ObservationPanel } from '../../features/lab-testing/components/ObservationPanel';
import { SubjectiveRatingForm } from '../../features/lab-testing/components/SubjectiveRatingForm';
import { labStyles } from '../../features/lab-testing/labTestingUi';

type LabTab = 'physical' | 'performance' | 'durability' | 'environmental' | 'subjective' | 'observations' | 'review';

export function LabTestingRunPage({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<LabTestingResultsResponse | null>(null);
  const [tab, setTab] = useState<LabTab>('physical');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
      setMessage('Saved');
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
      setMessage('Saved');
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
  const disabledComplete = run.missingRequiredMetrics > 0;

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <LabRunHeader
          onBack={onBack}
          onComplete={() => {
            if (disabledComplete) {
              setError(`Cannot complete testing with ${run.missingRequiredMetrics} required metrics missing`);
              return;
            }
            void completeLabTesting(id).then(() => { setMessage('Testing completed'); load(); }).catch((err: Error) => setError(err.message));
          }}
          onStart={() => void startLabTesting(id).then(() => { setMessage('Testing started'); load(); }).catch((err: Error) => setError(err.message))}
          run={run}
        />
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        <MetricCategoryTabs active={tab} onChange={(next) => setTab(next as LabTab)} />
        {data.samples.length === 0 && <EmptyState>No samples on this run.</EmptyState>}
        {data.samples.length > 0 && tab === 'physical' && <LabResultGrid category="physical" metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={data.samples} />}
        {data.samples.length > 0 && tab === 'performance' && <LabResultGrid category="performance" metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={data.samples} />}
        {data.samples.length > 0 && tab === 'durability' && (
          <div style={labStyles.stack}>
            <LabResultGrid category="durability" metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={data.samples} />
            <ObservationPanel
              observations={data.observations.filter((item) => item['observationType'] === 'crack_propagation')}
              onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))}
              samples={data.samples}
            />
          </div>
        )}
        {data.samples.length > 0 && tab === 'environmental' && (
          <EnvironmentalResultGrid
            metrics={data.metrics}
            onSave={saveEnvironmental}
            results={data.environmentalResults}
            samples={data.samples}
            testConditions={data.testConditions}
          />
        )}
        {data.samples.length > 0 && tab === 'subjective' && (
          <SubjectiveRatingForm
            metrics={data.metrics}
            onFeedbackSave={(sample, feedbackText) => void saveSubjectiveRating({ feedbackText, sampleId: sample.id }).then(load).catch((err: Error) => setError(err.message))}
            onRatingSave={(sample, metric, value) => void saveSubjectiveRating({ metricId: metric.id, ratingValue: value, sampleId: sample.id }).then(load).catch((err: Error) => setError(err.message))}
            ratings={data.subjectiveRatings}
            samples={data.samples}
          />
        )}
        {data.samples.length > 0 && tab === 'observations' && (
          <ObservationPanel
            observations={data.observations}
            onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))}
            samples={data.samples}
          />
        )}
        {tab === 'review' && <MissingRequiredMetricsPanel metrics={data.metrics} results={data.numericResults} samples={data.samples} />}
      </Card>
    </DashboardPage>
  );
}
