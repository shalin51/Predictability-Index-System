import { controlStyles } from '../../../components/ui/controls';
import type { LabTestingQueueRecord } from '../../../services/api';
import { spacing } from '../../../theme/tokens';
import { LabTestingProgressBar } from './LabTestingProgressBar';
import { labStyles } from '../labTestingUi';

export function LabRunHeader({
  onBack,
  onComplete,
  onStart,
  run,
}: {
  onBack: () => void;
  onComplete: () => void;
  onStart: () => void;
  run: LabTestingQueueRecord;
}) {
  return (
    <div style={labStyles.header}>
      <div>
        <button onClick={onBack} style={controlStyles.subtleButton} type="button">Back</button>
        <h1 style={{ ...labStyles.title, marginTop: spacing.space4 }}>{run.runCode}</h1>
        <p style={labStyles.subtitle}>{run.formulation} | {run.targetBenchmark ?? '-'} | Samples: {run.sampleCount}</p>
      </div>
      <div style={labStyles.actions}>
        <LabTestingProgressBar completed={run.completedResults} total={run.requiredResultCount} />
        {run.status === 'ready_for_testing' && <button onClick={onStart} style={controlStyles.primaryButton} type="button">Start Testing</button>}
        <button disabled={run.status !== 'testing'} onClick={onComplete} style={controlStyles.primaryButton} type="button">Complete Testing</button>
      </div>
    </div>
  );
}
