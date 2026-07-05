import type { LabMetric, LabResultRecord, SampleRecord, TestConditionRecord } from '../../../services/api';
import { METRIC_ORDER, labStyles } from '../labTestingUi';
import { SampleResultInput } from './SampleResultInput';

export function EnvironmentalResultGrid({
  metrics,
  onSave,
  results,
  samples,
  testConditions,
}: {
  metrics: LabMetric[];
  onSave: (sample: SampleRecord, metric: LabMetric, value: number, testConditionId?: string | null) => void;
  results: LabResultRecord[];
  samples: SampleRecord[];
  testConditions: TestConditionRecord[];
}) {
  const environmental = metrics
    .filter((metric) => metric.category === 'environmental')
    .filter((metric) => METRIC_ORDER.environmental.includes(metric.metricKey))
    .sort((a, b) => METRIC_ORDER.environmental.indexOf(a.metricKey) - METRIC_ORDER.environmental.indexOf(b.metricKey));

  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            <th style={labStyles.th}>Sample</th>
            {environmental.map((metric) => (
              <th key={metric.id} style={labStyles.th}>{metric.displayName}<br /><span style={labStyles.muted}>{metric.defaultUnit ?? ''}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id}>
              <td style={labStyles.td}>{sample.sampleCode}</td>
              {environmental.map((metric) => {
                const condition = conditionForMetric(metric.metricKey, testConditions);
                const result = results.find((item) => item.sampleId === sample.id && item.metricId === metric.id && item['testConditionId'] === condition?.id);
                return (
                  <td key={metric.id} style={labStyles.td}>
                    <SampleResultInput
                      metric={metric}
                      onSave={(value) => onSave(sample, metric, value, condition?.id ?? null)}
                      result={result}
                      sample={sample}
                    />
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

function conditionForMetric(metricKey: string, conditions: TestConditionRecord[]): TestConditionRecord | undefined {
  if (metricKey.startsWith('hot_')) return conditions.find((item) => item.conditionCode === 'HOT');
  if (metricKey.startsWith('cold_')) return conditions.find((item) => item.conditionCode === 'COLD');
  if (metricKey.startsWith('humidity_')) return conditions.find((item) => item.conditionCode === 'HUMIDITY');
  return conditions.find((item) => item.conditionCode === 'AMBIENT');
}
