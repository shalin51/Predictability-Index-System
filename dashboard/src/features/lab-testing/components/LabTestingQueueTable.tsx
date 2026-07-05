import type { CSSProperties } from 'react';
import { controlStyles } from '../../../components/ui/controls';
import type { LabTestingQueueRecord } from '../../../services/api';
import { spacing } from '../../../theme/tokens';
import { LabTestingProgressBar } from './LabTestingProgressBar';
import { formatLabValue, labStyles } from '../labTestingUi';

export function LabTestingQueueTable({ onOpen, records }: { onOpen: (id: string) => void; records: LabTestingQueueRecord[] }) {
  return (
    <div style={labStyles.tableWrap}>
      <table style={labStyles.table}>
        <thead>
          <tr>
            {['Run Code', 'Formulation', 'Target Benchmark', 'Status', 'Sample Count', 'Completed Results', 'Missing Required Metrics', 'Cure Hours', 'Actions'].map((column) => (
              <th key={column} style={labStyles.th}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td style={labStyles.td}>{record.runCode}</td>
              <td style={labStyles.td}>{record.formulation}</td>
              <td style={labStyles.td}>{record.targetBenchmark ?? '-'}</td>
              <td style={labStyles.td}>{record.status === 'ready_for_testing' ? 'Ready for Testing' : 'Testing'}</td>
              <td style={labStyles.td}>{record.sampleCount}</td>
              <td style={labStyles.td}><LabTestingProgressBar completed={record.completedResults} total={record.requiredResultCount} /></td>
              <td style={labStyles.td}>{record.missingRequiredMetrics}</td>
              <td style={labStyles.td}>{formatLabValue(record.cureHoursBeforeTest)}</td>
              <td style={labStyles.td}>
                <div style={styles.actions}>
                  <button onClick={() => onOpen(record.id)} style={controlStyles.subtleButton} type="button">Enter Results</button>
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
  actions: { display: 'flex', gap: spacing.space2 },
};
