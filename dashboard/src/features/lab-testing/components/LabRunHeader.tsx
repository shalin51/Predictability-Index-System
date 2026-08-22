import { controlStyles } from '../../../components/ui/controls';
import type { LabTestingQueueRecord } from '../../../services/api';
import { spacing } from '../../../theme/tokens';
import { LabTestingProgressBar } from './LabTestingProgressBar';
import { labStyles } from '../labTestingUi';

export function LabRunHeader({
  onBack,
  onComplete,
  onOpenFormulation,
  onOpenProductionRun,
  onStart,
  run,
  sampleProgress,
}: {
  onBack: () => void;
  onComplete: () => void;
  onOpenFormulation: (formulationId: string) => void;
  onOpenProductionRun: (productionRunId: string) => void;
  onStart: () => void;
  run: LabTestingQueueRecord;
  sampleProgress: Array<{ completed: number; sampleCode: string; total: number }>;
}) {
  return (
    <div style={labStyles.centeredHeader}>
      <div>
        <button onClick={onBack} style={controlStyles.subtleButton} type="button">Back</button>
        <h1 style={{ ...labStyles.title, marginTop: spacing.space4 }}>{run.runCode}</h1>
        <p style={labStyles.subtitle}>{run.formulation} | {run.targetBenchmark ?? '-'} | Samples: {run.sampleCount}</p>
      </div>
      <div style={labStyles.progressSummary}>
        <LabTestingProgressBar completed={run.completedResults} label="Overall" total={run.requiredResultCount} />
        {sampleProgress.map((sample) => <LabTestingProgressBar key={sample.sampleCode} completed={sample.completed} label={sample.sampleCode} total={sample.total} />)}
      </div>
      <div style={{ ...labStyles.actions, justifySelf: 'end' }}>
        <button onClick={() => onOpenFormulation(run.formulationId)} style={controlStyles.secondaryButton} type="button">View Formulation</button>
        <button onClick={() => onOpenProductionRun(run.id)} style={controlStyles.secondaryButton} type="button">View Production Run</button>
        {run.status === 'ready_for_testing' && <button onClick={onStart} style={controlStyles.primaryButton} type="button">Start Testing</button>}
        <button disabled={run.status !== 'testing'} onClick={onComplete} style={controlStyles.primaryButton} type="button">Complete Testing</button>
      </div>
    </div>
  );
}
