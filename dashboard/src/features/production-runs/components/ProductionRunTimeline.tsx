import type { ProductionRunStatus } from '../../../services/api';
import type { CSSProperties } from 'react';
import { colors, font, radius, spacing } from '../../../theme/tokens';
import { statusLabels } from '../productionRunUi';
import { ProductionRunStatusBadge } from './ProductionRunStatusBadge';

const flow: ProductionRunStatus[] = ['planned', 'molded', 'curing', 'ready_for_testing', 'testing', 'completed', 'scored'];

export function ProductionRunTimeline({ status }: { status: ProductionRunStatus }) {
  const currentIndex = flow.indexOf(status);

  if (status === 'archived') {
    return <div style={styles.currentStatus}><span style={styles.label}>Current Status:</span><ProductionRunStatusBadge status={status} /></div>;
  }

  return (
    <div style={styles.wrapper}>      
      <div aria-label={`Production run progress: ${statusLabels[status]}`} style={styles.flow}>
        {flow.map((item, index) => (
          <div key={item} style={styles.stepWrap}>
            {index > 0 && <span aria-hidden="true" style={{ ...styles.arrow, ...(index <= currentIndex ? styles.arrowComplete : {}) }}>→</span>}
            <span style={{ ...styles.step, ...(index < currentIndex ? styles.complete : {}), ...(index === currentIndex ? styles.current : {}), ...(index > currentIndex ? styles.upcoming : {}) }}>
              {index < currentIndex && <span aria-hidden="true" style={styles.check}>✓</span>}
              {statusLabels[item]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  arrow: { color: colors.text.muted, fontSize: font.size.xs, lineHeight: 1, margin: `0 ${spacing.space1}px` },
  arrowComplete: { color: colors.text.muted, fontWeight: font.weight.bold },
  check: { color: colors.status.ok, fontWeight: font.weight.bold, marginRight: spacing.space1 },
  complete: { color: colors.text.primary },
  current: { boxShadow: `0 0 0 2px ${colors.focusRingSoft}` },
  currentStatus: { alignItems: 'center', display: 'flex', gap: spacing.space2 },
  flow: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: spacing.space0, justifyContent: 'flex-end', marginTop: spacing.space2 },
  label: { color: colors.text.secondary, fontSize: font.size.small, fontWeight: font.weight.semibold },
  step: { border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 11, padding: `3px ${spacing.space2}px`, whiteSpace: 'nowrap' },
  stepWrap: { alignItems: 'center', display: 'flex' },
  upcoming: { backgroundColor: colors.surfaceMuted, color: colors.text.muted },
  wrapper: { display: 'grid' },
};
