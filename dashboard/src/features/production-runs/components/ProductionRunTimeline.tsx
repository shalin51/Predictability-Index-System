import type { ProductionRunStatus } from '../../../services/api';
import { spacing } from '../../../theme/tokens';
import { runStyles, statusLabels } from '../productionRunUi';
import { ProductionRunStatusBadge } from './ProductionRunStatusBadge';

const flow: ProductionRunStatus[] = ['planned', 'molded', 'curing', 'ready_for_testing', 'testing', 'completed', 'scored'];

export function ProductionRunTimeline({ status }: { status: ProductionRunStatus }) {
  return (
    <div style={{ ...runStyles.actions, gap: spacing.space2 }}>
      {flow.map((item) => item === status ? <ProductionRunStatusBadge key={item} status={item} /> : <span key={item} style={runStyles.muted}>{statusLabels[item]}</span>)}
    </div>
  );
}
