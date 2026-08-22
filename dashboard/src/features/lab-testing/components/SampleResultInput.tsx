import { useEffect, useState } from 'react';
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
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return undefined;
    const timeoutId = window.setTimeout(() => setSaved(false), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [saved]);
  return (
    <div>
      <input
        aria-label={`${sample.sampleCode} ${metric.displayName}`}
        defaultValue={result?.['valueNumeric'] == null ? '' : String(result['valueNumeric'])}
        onBlur={(event) => {
          const value = event.currentTarget.value;
          if (value === '') return;
          setSaved(true);
          onSave(Number(value));
        }}
        onChange={() => setSaved(false)}
        placeholder={metric.defaultUnit ?? ''}
        style={{ ...controlStyles.input, ...labStyles.input }}
        type="number"
      />
      {saved && <div style={labStyles.saved}>Saved</div>}
    </div>
  );
}
