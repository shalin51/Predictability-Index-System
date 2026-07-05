import { controlStyles } from '../../../components/ui/controls';
import type { SampleGenerationPayload } from '../../../services/api';
import { runStyles } from '../productionRunUi';

export function SampleGenerationForm({
  cavityCount,
  onChange,
  value,
}: {
  cavityCount: number;
  onChange: (value: SampleGenerationPayload) => void;
  value: SampleGenerationPayload;
}) {
  const assignments = Array.from({ length: value.count }, (_, index) => value.cavityAssignments?.[index] ?? null);
  return (
    <div style={runStyles.stack}>
      <div style={runStyles.formGrid}>
        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Number of Samples</span>
          <input min={1} onChange={(event) => onChange({ ...value, count: Number(event.target.value), cavityAssignments: [] })} style={controlStyles.input} type="number" value={value.count} />
        </label>
        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Starting Sample Code</span>
          <input onChange={(event) => onChange({ ...value, startingSampleCode: event.target.value })} style={controlStyles.input} value={value.startingSampleCode} />
        </label>
      </div>
      {cavityCount > 0 && (
        <div style={runStyles.formGrid}>
          {assignments.map((assignment, index) => (
            <label key={index} style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Sample {index + 1} Cavity</span>
              <select
                onChange={(event) => {
                  const next = [...assignments];
                  next[index] = event.target.value ? Number(event.target.value) : null;
                  onChange({ ...value, cavityAssignments: next });
                }}
                style={controlStyles.input}
                value={assignment ?? ''}
              >
                <option value="">Optional</option>
                {Array.from({ length: cavityCount }, (_, cavity) => <option key={cavity + 1} value={cavity + 1}>{cavity + 1}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
