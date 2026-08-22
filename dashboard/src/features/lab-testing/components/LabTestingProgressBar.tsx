import { getProgressFillColor } from '../../../theme/semantic';
import { labStyles } from '../labTestingUi';

export function LabTestingProgressBar({ completed, label, total }: { completed: number; label?: string; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div style={{ minWidth: 140 }}>
      <div style={labStyles.progressTrack}>
        <div style={{ backgroundColor: getProgressFillColor('brand'), height: '100%', width: `${pct}%` }} />
      </div>
      <div style={labStyles.muted}>{label ? `${label}: ` : ''}{completed} / {total} ({pct}%)</div>
    </div>
  );
}
