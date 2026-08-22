import type { SampleRecord } from '../../../services/api';
import { controlStyles } from '../../../components/ui/controls';
import { formatValue, runStyles } from '../productionRunUi';

export function SampleTable({ canDelete = false, onDelete, samples }: { canDelete?: boolean; onDelete?: (id: string) => void; samples: SampleRecord[] }) {
  return (
    <div style={runStyles.tableWrap}>
      <table style={runStyles.table}>
        <thead>
          <tr>
            <th style={runStyles.th}>Sample Code</th>
            <th style={runStyles.th}>Cavity Assignment</th>
            <th style={runStyles.th}>Sample Status</th>
            {canDelete && <th style={runStyles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {samples.map((sample) => (
            <tr key={sample.id ?? sample.sampleCode}>
              <td style={runStyles.td}>{sample.sampleCode}</td>
              <td style={runStyles.td}>{formatValue(sample.cavityNumber)}</td>
              <td style={runStyles.td}>{formatValue(sample.status)}</td>
              {canDelete && <td style={runStyles.td}><button onClick={() => sample.id && onDelete?.(sample.id)} style={controlStyles.subtleButton} type="button">Delete</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
