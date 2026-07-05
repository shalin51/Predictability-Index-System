import type { CSSProperties } from 'react';
import { controlStyles } from '../../../components/ui/controls';
import type { ProductionRunRecord } from '../../../services/api';
import { spacing } from '../../../theme/tokens';
import { formatValue, runStyles } from '../productionRunUi';
import { ProductionRunStatusBadge } from './ProductionRunStatusBadge';

export function ProductionRunTable({
  onArchive,
  onOpen,
  records,
}: {
  onArchive: (id: string) => void;
  onOpen: (id: string) => void;
  records: ProductionRunRecord[];
}) {
  return (
    <div style={runStyles.tableWrap}>
      <table style={runStyles.table}>
        <thead>
          <tr>
            {['Run Code', 'Formulation', 'Target Benchmark', 'Date Produced', 'Machine', 'Mold', 'Cure Hours', 'Status', 'Sample Count', 'Actions'].map((column) => (
              <th key={column} style={runStyles.th}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td style={runStyles.td}>{record.runCode}</td>
              <td style={runStyles.td}>{record.formulation}</td>
              <td style={runStyles.td}>{record.targetBenchmark ?? '-'}</td>
              <td style={runStyles.td}>{formatValue(record.dateProduced)}</td>
              <td style={runStyles.td}>{record.machine}</td>
              <td style={runStyles.td}>{record.mold}</td>
              <td style={runStyles.td}>{formatValue(record.cureHoursBeforeTest)}</td>
              <td style={runStyles.td}><ProductionRunStatusBadge status={record.status} /></td>
              <td style={runStyles.td}>{record.sampleCount}</td>
              <td style={runStyles.td}>
                <div style={styles.rowActions}>
                  <button onClick={() => onOpen(record.id)} style={controlStyles.subtleButton} type="button">View</button>
                  <button onClick={() => onOpen(record.id)} style={controlStyles.subtleButton} type="button">Edit</button>
                  <button onClick={() => onArchive(record.id)} style={controlStyles.subtleButton} type="button">Archive</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  rowActions: { display: 'flex', flexWrap: 'wrap', gap: spacing.space2 },
};
