import { colors } from '../../../theme/tokens';
import { labStyles } from '../labTestingUi';

export function LabTestingProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div style={{ minWidth: 140 }}>
      <div style={labStyles.progressTrack}>
        <div style={{ backgroundColor: colors.brand.primary, height: '100%', width: `${pct}%` }} />
      </div>
      <div style={labStyles.muted}>{completed} / {total}</div>
    </div>
  );
}
