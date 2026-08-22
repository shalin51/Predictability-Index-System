import { controlStyles } from '../../components/ui/controls';
import type { LibraryFieldDefinition, LibraryRecord } from '../../services/api';
import { labelize } from './LibrarySectionNav';
import { COMPARISON_MODES, CRITICALITY_LEVELS, RECORD_STATUSES } from '@amfpi/shared';

const enumOptions: Record<string, readonly string[]> = {
  category: ['physical', 'performance', 'durability', 'environmental', 'subjective'],
  comparisonMode: COMPARISON_MODES,
  criticality: CRITICALITY_LEVELS,
  dataType: ['numeric', 'text', 'boolean', 'rating'],
  status: RECORD_STATUSES,
};

export const optionResourceByField: Record<string, string> = {
  benchmarkProfileId: 'benchmarks',
  materialId: 'materials',
  materialSupplierId: 'material-suppliers',
  machineId: 'machines',
  metricId: 'metrics',
  moldId: 'molds',
  supplierId: 'suppliers',
};

export const libraryOptionResources = ['benchmarks', 'machines', 'materials', 'material-suppliers', 'metrics', 'molds'] as const;

export function LibraryRecordForm({
  fields,
  form,
  onChange,
  options,
}: {
  fields: LibraryFieldDefinition[];
  form: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  options: Record<string, LibraryRecord[]>;
}) {
  return (
    <>
      {fields.map((field) => (
        <label key={field.key} style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>{field.label}</span>
          <Field
            field={field}
            onChange={(value) => onChange(field.key, value)}
            options={options[optionResourceByField[field.key] ?? ''] ?? []}
            value={form[field.key]}
          />
        </label>
      ))}
    </>
  );
}

export function coerceLibraryPayload(fields: LibraryFieldDefinition[], form: Record<string, unknown>) {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'number' && form[field.key] !== '' ? Number(form[field.key]) : form[field.key]]));
}

function Field({ field, onChange, options, value }: { field: LibraryFieldDefinition; onChange: (value: unknown) => void; options: LibraryRecord[]; value: unknown }) {
  if (field.type === 'textarea') return <textarea onChange={(event) => onChange(event.target.value)} style={controlStyles.textarea} value={String(value ?? '')} />;
  if (field.type === 'boolean') return <input checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} type="checkbox" />;
  if (field.type === 'select') {
    return (
      <select onChange={(event) => onChange(event.target.value)} style={controlStyles.input} value={String(value ?? '')}>
        <option value="">Select</option>
        {(enumOptions[field.key] ?? []).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
        {options.map((item) => <option key={item.id} value={item.id}>{String(item['label'] ?? item['code'] ?? item.id)}</option>)}
      </select>
    );
  }
  return <input onChange={(event) => onChange(event.target.value)} style={controlStyles.input} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(value ?? '')} />;
}
