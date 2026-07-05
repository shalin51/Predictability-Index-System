import type { LabMetric, LabResultRecord, SampleRecord } from '../../../services/api';
import { labStyles } from '../labTestingUi';

export function MissingRequiredMetricsPanel({
  metrics,
  results,
  samples,
}: {
  metrics: LabMetric[];
  results: LabResultRecord[];
  samples: SampleRecord[];
}) {
  const required = metrics.filter((metric) => metric.requiredForScoring);
  const missing = samples.flatMap((sample) => required
    .filter((metric) => !results.some((result) => result.sampleId === sample.id && result.metricId === metric.id))
    .map((metric) => `${sample.sampleCode}: ${metric.displayName}`));

  return (
    <div style={labStyles.panel}>
      <strong>Missing Required Metrics</strong>
      {missing.length === 0 ? (
        <div style={labStyles.muted}>None</div>
      ) : (
        <ul>
          {missing.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
