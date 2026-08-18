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
import { LabResultCategoryAccordion } from '../../features/lab-testing/components/LabResultCategoryAccordion';
import { LabResultGrid } from '../../features/lab-testing/components/LabResultGrid';
import { LabRunHeader } from '../../features/lab-testing/components/LabRunHeader';
import { MissingRequiredMetricsPanel } from '../../features/lab-testing/components/MissingRequiredMetricsPanel';
import { ObservationPanel } from '../../features/lab-testing/components/ObservationPanel';
import { SubjectiveRatingForm } from '../../features/lab-testing/components/SubjectiveRatingForm';
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
  const metricCount = (category: LabMetric['category']) => data.metrics.filter((metric) => metric.category === category).length;
  const resultCount = (category: LabMetric['category']) => {
    const metricIds = new Set(data.metrics.filter((metric) => metric.category === category).map((metric) => metric.id));
    return [...data.numericResults, ...data.environmentalResults, ...data.subjectiveRatings]
      .filter((result) => result.metricId && metricIds.has(result.metricId)).length;
  };

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
          onOpenFormulation={onOpenFormulation}
          onOpenProductionRun={onOpenProductionRun}
          onStart={() => void startLabTesting(id).then(() => { setMessage('Testing started'); load(); }).catch((err: Error) => setError(err.message))}
          run={run}
        />
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        {data.samples.length === 0 && <EmptyState>No samples on this run.</EmptyState>}
        {data.samples.length > 0 && (
          <LabResultCategoryAccordion
            sections={[
              {
                content: <LabResultGrid category="physical" metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={data.samples} />,
                count: resultCount('physical'),
                id: 'physical',
                label: `Physical (${metricCount('physical')} metrics)`,
              },
              {
                content: <LabResultGrid category="performance" metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={data.samples} />,
                count: resultCount('performance'),
                id: 'performance',
                label: `Performance (${metricCount('performance')} metrics)`,
              },
              {
                content: (
                  <div style={labStyles.stack}>
                    <LabResultGrid category="durability" metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={data.samples} />
                    <ObservationPanel
                      observations={data.observations.filter((item) => item['observationType'] === 'crack_propagation')}
                      onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))}
                      samples={data.samples}
                    />
                  </div>
                ),
                count: resultCount('durability'),
                id: 'durability',
                label: `Durability (${metricCount('durability')} metrics)`,
              },
              {
                content: (
                  <EnvironmentalResultGrid
                    metrics={data.metrics}
                    onSave={saveEnvironmental}
                    results={data.environmentalResults}
                    samples={data.samples}
                    testConditions={data.testConditions}
                  />
                ),
                count: resultCount('environmental'),
                id: 'environmental',
                label: `Environmental (${metricCount('environmental')} metrics)`,
              },
              {
                content: (
                  <SubjectiveRatingForm
                    metrics={data.metrics}
                    onFeedbackSave={(sample, feedbackText) => void saveSubjectiveRating({ feedbackText, sampleId: sample.id }).then(load).catch((err: Error) => setError(err.message))}
                    onRatingSave={(sample, metric, value) => void saveSubjectiveRating({ metricId: metric.id, ratingValue: value, sampleId: sample.id }).then(load).catch((err: Error) => setError(err.message))}
                    ratings={data.subjectiveRatings}
                    samples={data.samples}
                  />
                ),
                count: resultCount('subjective'),
                id: 'subjective',
                label: `Subjective (${metricCount('subjective')} metrics)`,
              },
              {
                content: (
                  <ObservationPanel
                    observations={data.observations}
                    onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))}
                    samples={data.samples}
                  />
                ),
                count: data.observations.length,
                id: 'observations',
                label: 'Observations',
              },
              {
                content: <MissingRequiredMetricsPanel metrics={data.metrics} results={data.numericResults} samples={data.samples} />,
                count: run.missingRequiredMetrics,
                id: 'review',
                label: 'Review Missing Results',
              },
            ]}
          />
        )}
      </Card>
    </DashboardPage>
  );
}
