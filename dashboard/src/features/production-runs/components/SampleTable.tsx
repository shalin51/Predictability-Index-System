import type { SampleRecord } from '../../../services/api';
import { formatValue, runStyles } from '../productionRunUi';

export function SampleTable({ samples }: { samples: SampleRecord[] }) {
  return (
    <div style={runStyles.tableWrap}>
      <table style={runStyles.table}>
        <thead>
          <tr>
            <th style={runStyles.th}>Sample Code</th>
            <th style={runStyles.th}>Cavity Assignment</th>
            <th style={runStyles.th}>Sample Status</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id ?? sample.sampleCode}>
              <td style={runStyles.td}>{sample.sampleCode}</td>
              <td style={runStyles.td}>{formatValue(sample.cavityNumber)}</td>
              <td style={runStyles.td}>{formatValue(sample.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
