import { useEffect, useState } from 'react';
import { controlStyles } from '../../../components/ui/controls';
import type { LabMetric, LabResultRecord, SampleRecord } from '../../../services/api';
import { convertDropTestHeight } from '../dropTestUnits';
import { labStyles } from '../labTestingUi';

export function DropTestResultCells({ metric, onSave, result, sample }: {
  metric: LabMetric;
  onSave: (value: number) => void;
  result?: LabResultRecord;
  sample: SampleRecord;
}) {
  // Keep storage in the metric's configured unit so scoring and imports retain their scale.
  const storageUnit = metric.defaultUnit || 'in';
  const resultUnit = String(result?.unit || storageUnit);
  const savedValue = result?.valueNumeric == null ? '' : String(Number(
    convertDropTestHeight(Number(result.valueNumeric), resultUnit, 'cm').toFixed(6),
  ));
  const [value, setValue] = useState(savedValue);
  useEffect(() => setValue(savedValue), [savedValue, sample.id]);
  const centimeters = value === '' ? null : Number(value);
  const valid = centimeters !== null && Number.isFinite(centimeters) && centimeters >= 0;

  return (
    <>
      <td style={labStyles.td}>
        <input
          aria-label={`${sample.sampleCode} ${metric.displayName} (cm)`}
          min="0"
          onBlur={() => {
            if (valid && value !== savedValue) onSave(convertDropTestHeight(centimeters, 'cm', storageUnit));
          }}
          onChange={(event) => setValue(event.currentTarget.value)}
          placeholder="cm"
          step="any"
          style={{ ...controlStyles.input, ...labStyles.input }}
          type="number"
          value={value}
        />
      </td>
      <td style={labStyles.td}>
        <output aria-label={`${sample.sampleCode} ${metric.displayName} (in)`}>
          {valid ? convertDropTestHeight(centimeters, 'cm', 'in').toFixed(2) : '—'}
        </output>
      </td>
    </>
  );
}
