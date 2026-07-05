import { controlStyles } from '../../../components/ui/controls';
import type { LabMetric, LabResultRecord, SampleRecord } from '../../../services/api';
import { labStyles } from '../labTestingUi';

export function SampleResultInput({
  metric,
  onSave,
  result,
  sample,
}: {
  metric: LabMetric;
  onSave: (value: number) => void;
  result?: LabResultRecord;
  sample: SampleRecord;
}) {
  return (
    <input
      aria-label={`${sample.sampleCode} ${metric.displayName}`}
      defaultValue={result?.['valueNumeric'] == null ? '' : String(result['valueNumeric'])}
      onBlur={(event) => {
        const value = event.currentTarget.value;
        if (value === '') return;
        onSave(Number(value));
      }}
      placeholder={metric.defaultUnit ?? ''}
      style={{ ...controlStyles.input, ...labStyles.input }}
      type="number"
    />
  );
}
