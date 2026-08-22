import type { SamplePayload, SampleRecord } from '../../../services/api';
import { controlStyles } from '../../../components/ui/controls';
import { formatValue, runStyles } from '../productionRunUi';

export function SampleTable({ canDelete = false, editable = false, onDelete, onUpdate, samples }: { canDelete?: boolean; editable?: boolean; onDelete?: (id: string) => void; onUpdate?: (sample: SampleRecord, patch: Partial<SamplePayload>) => void; samples: SampleRecord[] }) {
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
              <td style={runStyles.td}>{editable ? <input defaultValue={sample.sampleCode} onBlur={(event) => event.target.value !== sample.sampleCode && onUpdate?.(sample, { sampleCode: event.target.value })} style={controlStyles.input} /> : sample.sampleCode}</td>
              <td style={runStyles.td}>{editable ? <input defaultValue={sample.cavityNumber == null ? '' : String(sample.cavityNumber)} min={1} onBlur={(event) => onUpdate?.(sample, { cavityNumber: event.target.value === '' ? null : Number(event.target.value) })} style={controlStyles.input} type="number" /> : formatValue(sample.cavityNumber)}</td>
              <td style={runStyles.td}>{editable ? <select defaultValue={sample.status} onChange={(event) => onUpdate?.(sample, { status: event.target.value as SamplePayload['status'] })} style={controlStyles.input}><option value="created">Created</option><option value="testing">Testing</option><option value="tested">Tested</option></select> : formatValue(sample.status)}</td>
              {canDelete && <td style={runStyles.td}><button onClick={() => sample.id && onDelete?.(sample.id)} style={controlStyles.subtleButton} type="button">Delete</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
