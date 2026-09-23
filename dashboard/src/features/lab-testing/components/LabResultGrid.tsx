import { Fragment } from 'react';
import type { LabMetric, LabResultRecord, SampleRecord } from '../../../services/api';
import { LAB_TEST_METRIC_KEYS, labStyles } from '../labTestingUi';
import { SampleResultInput } from './SampleResultInput';
import { DropTestResultCells } from './DropTestResultCells';

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
              <Fragment key={metric.id}>
                <th style={labStyles.th}>{metric.displayName}<br /><span style={labStyles.muted}>{metric.metricKey === 'drop_test' ? 'cm' : metric.defaultUnit ?? ''}</span></th>
                {metric.metricKey === 'drop_test' && <th style={labStyles.th}>Drop Test (in)<br /><span style={labStyles.muted}>Calculated</span></th>}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id}>
              {!hideSampleColumn && <td style={labStyles.td}>{sample.sampleCode}</td>}
              {ordered.map((metric) => {
                const result = results.find((item) => item.sampleId === sample.id && item.metricId === metric.id);
                if (metric.metricKey === 'drop_test') {
                  return <DropTestResultCells key={metric.id} metric={metric} onSave={(value) => onSave(sample, metric, value)} result={result} sample={sample} />;
                }
                return (
                  <td key={metric.id} style={labStyles.td}>
                    {metric.metricKey === 'cor_78in' ? (
                      <div>
                        <strong>{result?.valueNumeric == null ? '—' : Number(result.valueNumeric).toFixed(3)}</strong>
                        <div style={labStyles.muted}>Calculated from rebound height: √(H₂ ÷ 78)</div>
                      </div>
                    ) : <SampleResultInput metric={metric} onSave={(value) => onSave(sample, metric, value)} result={result} sample={sample} />}
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
