import type { ProductionRunStatus } from '../../../services/api';
import { runStyles, statusLabels, statusTone } from '../productionRunUi';

export function ProductionRunStatusBadge({ status }: { status: ProductionRunStatus }) {
  return <span style={{ ...runStyles.badge, ...statusTone(status) }}>{statusLabels[status]}</span>;
}
