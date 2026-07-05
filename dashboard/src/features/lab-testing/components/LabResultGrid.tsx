import type { LabMetric, LabMetricCategory, LabResultRecord, SampleRecord } from '../../../services/api';
import { METRIC_ORDER, labStyles } from '../labTestingUi';
import { SampleResultInput } from './SampleResultInput';

export function LabResultGrid({
  category,
  metrics,
  onSave,
  results,
  samples,
}: {
  category: LabMetricCategory;
  metrics: LabMetric[];
  onSave: (sample: SampleRecord, metric: LabMetric, value: number) => void;
  results: LabResultRecord[];
  samples: SampleRecord[];
}) {
  const ordered = metrics
    .filter((metric) => metric.category === category)
    .filter((metric) => METRIC_ORDER[category].includes(metric.metricKey))
    .sort((a, b) => METRIC_ORDER[category].indexOf(a.metricKey) - METRIC_ORDER[category].indexOf(b.metricKey));

  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            <th style={labStyles.th}>Sample</th>
            {ordered.map((metric) => (
              <th key={metric.id} style={labStyles.th}>{metric.displayName}<br /><span style={labStyles.muted}>{metric.defaultUnit ?? ''}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id}>
              <td style={labStyles.td}>{sample.sampleCode}</td>
              {ordered.map((metric) => {
                const result = results.find((item) => item.sampleId === sample.id && item.metricId === metric.id);
                return (
                  <td key={metric.id} style={labStyles.td}>
                    <SampleResultInput metric={metric} onSave={(value) => onSave(sample, metric, value)} result={result} sample={sample} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
