import type { LabMetric, LabResultRecord, SampleRecord } from '../../../services/api';
import { LAB_TEST_METRIC_KEYS, labStyles } from '../labTestingUi';
import { SampleResultInput } from './SampleResultInput';

export function LabResultGrid({
  metrics,
  onSave,
  results,
  hideSampleColumn = false,
  samples,
}: {
  metrics: LabMetric[];
  onSave: (sample: SampleRecord, metric: LabMetric, value: number) => void;
  results: LabResultRecord[];
  hideSampleColumn?: boolean;
  samples: SampleRecord[];
}) {
  const ordered = metrics
    .filter((metric) => LAB_TEST_METRIC_KEYS.includes(metric.metricKey as typeof LAB_TEST_METRIC_KEYS[number]))
    .sort((a, b) => LAB_TEST_METRIC_KEYS.indexOf(a.metricKey as typeof LAB_TEST_METRIC_KEYS[number]) - LAB_TEST_METRIC_KEYS.indexOf(b.metricKey as typeof LAB_TEST_METRIC_KEYS[number]));

  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            {!hideSampleColumn && <th style={labStyles.th}>Sample</th>}
            {ordered.map((metric) => (
              <th key={metric.id} style={labStyles.th}>{metric.displayName}<br /><span style={labStyles.muted}>{metric.defaultUnit ?? ''}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id}>
              {!hideSampleColumn && <td style={labStyles.td}>{sample.sampleCode}</td>}
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
