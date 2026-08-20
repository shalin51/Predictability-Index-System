import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { controlStyles } from '../../components/ui/controls';
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '../../components/ui/DataTable';
import { MessageBanner } from '../../components/ui/Page';
import {
  createMaterialProperty,
  createMaterialPropertyDefinition,
  getMaterialPropertyOptions,
  updateMaterialProperty,
  type MaterialCatalogDetail,
  type MaterialPropertyDefinitionOption,
  type MaterialPropertyDefinitionInput,
  type MaterialPropertyInput,
} from '../../services/api';
import { spacing } from '../../theme/tokens';

type MaterialProperty = MaterialCatalogDetail['properties'][number];

const emptyForm: MaterialPropertyInput = {
  propertyDefinitionId: '', testCondition: '', testMethod: 'Manual entry', unit: '', valueNumeric: '', valueText: '',
};
const emptyDefinition: MaterialPropertyDefinitionInput = { category: '', commonUnits: '', propertyKey: '', propertyName: '', valueType: 'Numeric' };

export function MaterialPropertiesEditor({ materialId, onChanged, properties }: {
  materialId: string;
  onChanged: () => Promise<void>;
  properties: MaterialProperty[];
}) {
  const [definitions, setDefinitions] = useState<MaterialPropertyDefinitionOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialPropertyInput>(emptyForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingDefinition, setCreatingDefinition] = useState(false);
  const [definitionForm, setDefinitionForm] = useState<MaterialPropertyDefinitionInput>(emptyDefinition);

  useEffect(() => {
    void getMaterialPropertyOptions(materialId).then(setDefinitions).catch((reason: Error) => setError(reason.message));
  }, [materialId]);

  const visibleProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return properties;
    return properties.filter((item) => [item.category, item.propertyName, item.testMethod, item.testCondition, item.sourceFilename]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [properties, search]);

  const startAdd = () => {
    setEditingId('');
    setForm(emptyForm);
    setError('');
  };

  const startEdit = (property: MaterialProperty) => {
    setEditingId(property.id);
    setForm({
      notes: property.notes ?? '',
      propertyDefinitionId: property.propertyDefinitionId ?? '',
      qualifier: property.qualifier ?? '',
      testCondition: property.testCondition ?? '',
      testMethod: property.testMethod,
      unit: property.unit ?? '',
      valueNumeric: property.valueNumeric ?? '',
      valueText: property.valueText ?? '',
    });
    setError('');
  };

  const save = async () => {
    if (editingId === null) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) await updateMaterialProperty(materialId, editingId, form);
      else await createMaterialProperty(materialId, form);
      await onChanged();
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save material property');
    } finally {
      setSaving(false);
    }
  };

  const saveDefinition = async () => {
    setSaving(true);
    setError('');
    try {
      const created = await createMaterialPropertyDefinition(definitionForm);
      setDefinitions((current) => [...current, created].sort((left, right) => `${left.category}/${left.propertyName}`.localeCompare(`${right.category}/${right.propertyName}`)));
      setForm((current) => ({ ...current, propertyDefinitionId: created.id }));
      setCreatingDefinition(false);
      setEditingId('');
      setDefinitionForm(emptyDefinition);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create property definition');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: spacing.space4 }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: spacing.space3, justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Material Properties</h2>
        <div style={{ display: 'flex', gap: spacing.space3 }}>
          <Button onClick={() => { setCreatingDefinition(true); setDefinitionForm(emptyDefinition); setError(''); }} type="button" variant="secondary">Create New Property</Button>
          <Button onClick={startAdd} type="button" variant="primary">Attach Property</Button>
        </div>
      </div>
      {error && <MessageBanner tone="danger">{error}</MessageBanner>}
      {creatingDefinition && (
        <div style={{ display: 'grid', gap: spacing.space3 }}>
          <h3 style={{ margin: 0 }}>Create Property Definition</h3>
          <Field label="Property Name"><input onChange={(event) => setDefinitionForm((current) => ({ ...current, propertyName: event.target.value }))} style={controlStyles.input} value={definitionForm.propertyName} /></Field>
          <Field label="Property Key"><input onChange={(event) => setDefinitionForm((current) => ({ ...current, propertyKey: event.target.value }))} placeholder="Generated from name when blank" style={controlStyles.input} value={definitionForm.propertyKey ?? ''} /></Field>
          <Field label="Category"><input onChange={(event) => setDefinitionForm((current) => ({ ...current, category: event.target.value }))} style={controlStyles.input} value={definitionForm.category} /></Field>
          <Field label="Common Units"><input onChange={(event) => setDefinitionForm((current) => ({ ...current, commonUnits: event.target.value }))} style={controlStyles.input} value={definitionForm.commonUnits ?? ''} /></Field>
          <Field label="Value Type"><select onChange={(event) => setDefinitionForm((current) => ({ ...current, valueType: event.target.value }))} style={controlStyles.input} value={definitionForm.valueType}><option value="Numeric">Numeric</option><option value="Text">Text</option><option value="Boolean">Boolean</option></select></Field>
          <Field label="Notes"><textarea onChange={(event) => setDefinitionForm((current) => ({ ...current, implementationNotes: event.target.value }))} style={controlStyles.textarea} value={definitionForm.implementationNotes ?? ''} /></Field>
          <div style={{ display: 'flex', gap: spacing.space3, justifyContent: 'flex-end' }}><Button onClick={() => setCreatingDefinition(false)} type="button" variant="secondary">Cancel</Button><Button disabled={saving} onClick={() => void saveDefinition()} type="button" variant="primary">Create Property</Button></div>
        </div>
      )}
      {editingId !== null && (
        <div style={{ display: 'grid', gap: spacing.space3 }}>
          {!editingId && <Field label="Property"><select onChange={(event) => setForm((current) => ({ ...current, propertyDefinitionId: event.target.value }))} style={controlStyles.input} value={form.propertyDefinitionId}><option value="">Select property</option>{definitions.map((item) => <option key={item.id} value={item.id}>{item.category} / {item.propertyName}</option>)}</select></Field>}
          <Field label="Numeric Value"><input onChange={(event) => setForm((current) => ({ ...current, valueNumeric: event.target.value }))} style={controlStyles.input} type="number" value={String(form.valueNumeric ?? '')} /></Field>
          <Field label="Text Value"><input onChange={(event) => setForm((current) => ({ ...current, valueText: event.target.value }))} style={controlStyles.input} value={String(form.valueText ?? '')} /></Field>
          <Field label="Qualifier"><input onChange={(event) => setForm((current) => ({ ...current, qualifier: event.target.value }))} placeholder="e.g. >, <, approximately" style={controlStyles.input} value={String(form.qualifier ?? '')} /></Field>
          <Field label="Unit"><input onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} style={controlStyles.input} value={String(form.unit ?? '')} /></Field>
          <Field label="Test Method"><input onChange={(event) => setForm((current) => ({ ...current, testMethod: event.target.value }))} style={controlStyles.input} value={String(form.testMethod ?? '')} /></Field>
          <Field label="Test Condition"><input onChange={(event) => setForm((current) => ({ ...current, testCondition: event.target.value }))} style={controlStyles.input} value={String(form.testCondition ?? '')} /></Field>
          <Field label="Notes"><textarea onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={controlStyles.textarea} value={String(form.notes ?? '')} /></Field>
          <div style={{ display: 'flex', gap: spacing.space3, justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditingId(null)} type="button" variant="secondary">Cancel</Button>
            <Button disabled={saving} onClick={() => void save()} type="button" variant="primary">{saving ? 'Saving…' : 'Save Property'}</Button>
          </div>
        </div>
      )}
      <input onChange={(event) => setSearch(event.target.value)} placeholder="Search properties, methods, conditions, or source files" style={controlStyles.input} value={search} />
      <DataTable compact minWidth={1080}>
        <DataTableHeader><tr><DataTableHead>Category</DataTableHead><DataTableHead>Property</DataTableHead><DataTableHead>Value</DataTableHead><DataTableHead>Unit</DataTableHead><DataTableHead>Method</DataTableHead><DataTableHead>Condition</DataTableHead><DataTableHead>Source</DataTableHead><DataTableHead>Action</DataTableHead></tr></DataTableHeader>
        <DataTableBody>{visibleProperties.map((item) => <DataTableRow key={item.id}><DataTableCell>{item.category}</DataTableCell><DataTableCell>{item.propertyName}</DataTableCell><DataTableCell>{item.qualifier ? `${item.qualifier} ${item.valueNumeric ?? item.valueText ?? '-'}` : String(item.valueNumeric ?? item.valueText ?? '-')}</DataTableCell><DataTableCell>{item.unit || '-'}</DataTableCell><DataTableCell>{item.testMethod || '-'}</DataTableCell><DataTableCell>{item.testCondition || '-'}</DataTableCell><DataTableCell>{item.sourceFilename || 'Manual'}</DataTableCell><DataTableCell><Button onClick={() => startEdit(item)} size="sm" type="button" variant="secondary">Edit Value</Button></DataTableCell></DataTableRow>)}</DataTableBody>
      </DataTable>
      {visibleProperties.length === 0 && <div>No material properties found.</div>}
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label style={controlStyles.field}><span style={controlStyles.fieldLabel}>{label}</span>{children}</label>;
}
