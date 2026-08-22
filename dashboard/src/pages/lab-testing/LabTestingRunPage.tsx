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
import { LabResultSampleAccordion } from '../../features/lab-testing/components/LabResultSampleAccordion';
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
  const resultCount = (category: LabMetric['category'], sampleId?: string) => {
    const metricIds = new Set(data.metrics.filter((metric) => metric.category === category).map((metric) => metric.id));
    return [...data.numericResults, ...data.environmentalResults, ...data.subjectiveRatings]
      .filter((result) => result.metricId && metricIds.has(result.metricId) && (!sampleId || result.sampleId === sampleId)).length;
  };
  const sampleSections = data.samples.map((sample) => ({
    content: (
      <LabResultCategoryAccordion
        sections={[
          { content: <LabResultGrid category="physical" hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[sample]} />, count: resultCount('physical', sample.id), id: `${sample.id}-physical`, label: 'Physical' },
          { content: <LabResultGrid category="performance" hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[sample]} />, count: resultCount('performance', sample.id), id: `${sample.id}-performance`, label: 'Performance' },
          {
            content: (
              <div style={labStyles.stack}>
                <LabResultGrid category="durability" hideSampleColumn metrics={data.metrics} onSave={saveNumeric} results={data.numericResults} samples={[sample]} />
                <ObservationPanel
                  observations={data.observations.filter((item) => item.sampleId === sample.id && item['observationType'] === 'crack_propagation')}
                  onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))}
                  sample={sample}
                  samples={[sample]}
                />
              </div>
            ),
            count: resultCount('durability', sample.id), id: `${sample.id}-durability`, label: 'Durability',
          },
          { content: <EnvironmentalResultGrid hideSampleColumn metrics={data.metrics} onSave={saveEnvironmental} results={data.environmentalResults} samples={[sample]} testConditions={data.testConditions} />, count: resultCount('environmental', sample.id), id: `${sample.id}-environmental`, label: 'Environmental' },
          {
            content: <SubjectiveRatingForm hideSampleColumn metrics={data.metrics} onFeedbackSave={(item, feedbackText) => void saveSubjectiveRating({ feedbackText, sampleId: item.id }).then(load).catch((err: Error) => setError(err.message))} onRatingSave={(item, metric, value) => void saveSubjectiveRating({ metricId: metric.id, ratingValue: value, sampleId: item.id }).then(load).catch((err: Error) => setError(err.message))} ratings={data.subjectiveRatings} samples={[sample]} />,
            count: resultCount('subjective', sample.id), id: `${sample.id}-subjective`, label: 'Subjective',
          },
          {
            content: <ObservationPanel observations={data.observations.filter((item) => item.sampleId === sample.id)} onSave={(sampleId, observationType, observationText) => void saveObservation({ observationText, observationType, sampleId }).then(load).catch((err: Error) => setError(err.message))} sample={sample} samples={[sample]} />,
            count: data.observations.filter((item) => item.sampleId === sample.id).length, id: `${sample.id}-observations`, label: 'Observations',
          },
        ].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))}
      />
    ),
    count: resultCount('physical', sample.id) + resultCount('performance', sample.id) + resultCount('durability', sample.id) + resultCount('environmental', sample.id) + resultCount('subjective', sample.id),
    id: sample.id,
    label: sample.sampleCode,
  })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

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
          <>
            <LabResultSampleAccordion sections={sampleSections} />
            <MissingRequiredMetricsPanel metrics={data.metrics} results={data.numericResults} samples={data.samples} />
          </>
        )}
      </Card>
    </DashboardPage>
  );
}
