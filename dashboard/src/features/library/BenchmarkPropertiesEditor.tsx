import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { MessageBanner } from '../../components/ui/Page';
import {
  updateLibraryRecord,
  type LibraryFieldDefinition,
  type LibraryRecord,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { coerceLibraryPayload, LibraryRecordForm } from './LibraryRecordForm';

export function BenchmarkPropertiesEditor({
  fields,
  onSaved,
  options,
  properties,
}: {
  fields: LibraryFieldDefinition[];
  onSaved: (property: LibraryRecord) => void;
  options: Record<string, LibraryRecord[]>;
  properties: LibraryRecord[];
}) {
  const [editing, setEditing] = useState<LibraryRecord | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');
  const editableFields = fields.filter((field) => !['benchmarkProfileId', 'metricId'].includes(field.key));

  const startEdit = (property: LibraryRecord) => {
    setEditing(property);
    setForm(property);
    setError('');
  };

  const save = async () => {
    if (!editing) return;
    try {
      const updated = await updateLibraryRecord('scoring-rules', editing.id, coerceLibraryPayload(editableFields, form));
      onSaved(updated);
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save benchmark property');
    }
  };

  return (
    <section style={{ display: 'grid', gap: spacing.space4 }}>
      <h2 style={{ margin: 0 }}>Benchmark Properties</h2>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {properties.map((property) => (
        <div key={property.id} style={{ alignItems: 'center', display: 'flex', gap: spacing.space3, justifyContent: 'space-between' }}>
          <span>{String(property['metricName'] ?? property['metricKey'] ?? property.id)}</span>
          <Button onClick={() => startEdit(property)} size="sm" type="button" variant="secondary">Edit Property</Button>
        </div>
      ))}
      {properties.length === 0 && <div>No benchmark properties found.</div>}
      {editing && (
        <div style={{ display: 'grid', gap: spacing.space3 }}>
          <h3 style={{ margin: 0 }}>Edit {String(editing['metricName'] ?? editing['metricKey'] ?? 'Property')}</h3>
          <LibraryRecordForm
            fields={editableFields}
            form={form}
            onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
            options={options}
          />
          <div style={{ display: 'flex', gap: spacing.space3, justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel Property Edit</Button>
            <Button onClick={() => void save()} type="button" variant="primary">Save Property</Button>
          </div>
        </div>
      )}
    </section>
  );
}
