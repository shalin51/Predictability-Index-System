import { controlStyles } from '../../../components/ui/controls';
import type { LabMetric, LabResultRecord, SampleRecord } from '../../../services/api';
import { METRIC_ORDER, labStyles } from '../labTestingUi';
import { SampleResultInput } from './SampleResultInput';

export function SubjectiveRatingForm({
  metrics,
  onFeedbackSave,
  onRatingSave,
  ratings,
  samples,
}: {
  metrics: LabMetric[];
  onFeedbackSave: (sample: SampleRecord, feedbackText: string) => void;
  onRatingSave: (sample: SampleRecord, metric: LabMetric, value: number) => void;
  ratings: LabResultRecord[];
  samples: SampleRecord[];
}) {
  const subjective = metrics
    .filter((metric) => metric.category === 'subjective')
    .filter((metric) => METRIC_ORDER.subjective.includes(metric.metricKey))
    .sort((a, b) => METRIC_ORDER.subjective.indexOf(a.metricKey) - METRIC_ORDER.subjective.indexOf(b.metricKey));

  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            <th style={labStyles.th}>Sample</th>
            {subjective.map((metric) => <th key={metric.id} style={labStyles.th}>{metric.displayName}</th>)}
            <th style={labStyles.th}>Player Feedback</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id}>
              <td style={labStyles.td}>{sample.sampleCode}</td>
              {subjective.map((metric) => {
                const result = ratings.find((item) => item.sampleId === sample.id && item.metricId === metric.id);
                return (
                  <td key={metric.id} style={labStyles.td}>
                    <SampleResultInput metric={metric} onSave={(value) => onRatingSave(sample, metric, value)} result={resultValue(result)} sample={sample} />
                  </td>
                );
              })}
              <td style={labStyles.td}>
                <textarea
                  defaultValue={String(ratings.find((item) => item.sampleId === sample.id && !item.metricId)?.['feedbackText'] ?? '')}
                  onBlur={(event) => {
                    const value = event.currentTarget.value.trim();
                    if (value) onFeedbackSave(sample, value);
                  }}
                  style={{ ...controlStyles.textarea, minHeight: 72, width: '100%' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function resultValue(result?: LabResultRecord): LabResultRecord | undefined {
  return result ? { ...result, valueNumeric: result['ratingValue'] } : undefined;
}
