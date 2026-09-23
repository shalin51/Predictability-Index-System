import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getLibraryRecord,
  getMaterialCatalog,
  listLibraryOptions,
  listLibraryRecords,
  regenerateBenchmarkGlobally,
  updateLibraryRecord,
  type LibraryFieldDefinition,
  type LibraryRecord,
  type MaterialCatalogDetail,
} from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';
import { coerceLibraryPayload, LibraryRecordForm, libraryOptionResources } from './LibraryRecordForm';
import { labelize, LibrarySectionNav } from './LibrarySectionNav';
import { MachineParametersAccordion } from './MachineParametersAccordion';
import { SetupProfileParametersTable, type SetupProfileParameter } from '../production-runs/components/SetupProfileParametersTable';
import { RelatedMaterialsTable } from './RelatedMaterialsTable';
import { MaterialPropertiesEditor } from './MaterialPropertiesEditor';
import { ScoringProfileWeightsEditor } from './ScoringProfileWeightsEditor';
import { BenchmarkPropertiesEditor } from './BenchmarkPropertiesEditor';
import { CorFormula } from './CorFormula';

export function LibraryRecordDetailPage({
  id,
  initialEditing = false,
  onBack,
  onSectionChange,
  resource,
  sections,
}: {
  id: string;
  initialEditing?: boolean;
  onBack: () => void;
  onSectionChange: (section: string) => void;
  resource: string;
  sections: readonly string[];
}) {
  const [record, setRecord] = useState<LibraryRecord | null>(null);
  const [fields, setFields] = useState<LibraryFieldDefinition[]>([]);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [options, setOptions] = useState<Record<string, LibraryRecord[]>>({});
  const [editing, setEditing] = useState(initialEditing);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [machineParameters, setMachineParameters] = useState<LibraryRecord[]>([]);
  const [benchmarkProperties, setBenchmarkProperties] = useState<LibraryRecord[]>([]);
  const [scoringProfileWeights, setScoringProfileWeights] = useState<LibraryRecord[]>([]);
  const [rerunningBenchmark, setRerunningBenchmark] = useState(false);
  const [relatedMaterials, setRelatedMaterials] = useState<LibraryRecord[]>([]);
  const [relatedError, setRelatedError] = useState('');
  const [benchmarkPropertiesError, setBenchmarkPropertiesError] = useState('');

  useEffect(() => {
    let active = true;
    setRecord(null);
    setError('');
    setMessage('');
    setMachineParameters([]);
    setBenchmarkProperties([]);
    setScoringProfileWeights([]);
    setRelatedMaterials([]);
    setRelatedError('');
    setBenchmarkPropertiesError('');

    const detailRequest = getLibraryRecord(resource, id);
    const recordRequest = resource === 'materials'
      ? getMaterialCatalog(id)
      : detailRequest.then((response) => response.data);

    void Promise.all([detailRequest, recordRequest])
      .then(([detail, loadedRecord]) => {
        if (!active) return;
        setFields(detail.fields);
        setForm(detail.data);
        setRecord(loadedRecord);
      })
      .catch((reason: unknown) => {
        if (active) setError(getErrorMessage(reason, 'Unable to load record'));
      });

    void Promise.all(libraryOptionResources.map((optionResource) =>
      listLibraryOptions(optionResource).then((items) => [optionResource, items] as const)
    ))
      .then((entries) => {
        if (active) setOptions(Object.fromEntries(entries));
      })
      .catch(() => undefined);

    if (resource === 'machines') {
      void listLibraryRecords('machine-parameters', { category: id, status: 'all' })
        .then((response) => {
          if (active) setMachineParameters(response.data);
        })
        .catch((reason: unknown) => {
          if (active) setRelatedError(getErrorMessage(reason, 'Unable to load machine parameters'));
        });
    }

    if (resource === 'material-suppliers') {
      void listLibraryRecords('materials', { category: id, status: 'all' })
        .then((response) => {
          if (active) setRelatedMaterials(response.data);
        })
        .catch((reason: unknown) => {
          if (active) setRelatedError(getErrorMessage(reason, 'Unable to load related materials'));
        });
    }

    if (resource === 'benchmarks') {
      void listLibraryRecords('scoring-rules', { category: id })
        .then((response) => {
          if (!active) return;
          setBenchmarkProperties(response.data);
        })
        .catch((reason: unknown) => {
          if (active) setBenchmarkPropertiesError(getErrorMessage(reason, 'Unable to load benchmark properties'));
        });
    }

    if (resource === 'scoring-profiles') {
      void listLibraryRecords('scoring-profile-weights', { category: id })
        .then((response) => { if (active) setScoringProfileWeights(response.data); })
        .catch((reason: unknown) => { if (active) setRelatedError(getErrorMessage(reason, 'Unable to load scoring weights')); });
    }

    return () => {
      active = false;
    };
  }, [id, resource]);

  useEffect(() => setEditing(initialEditing), [id, initialEditing]);

  const save = async () => {
    try {
      const updated = await updateLibraryRecord(resource, id, coerceLibraryPayload(fields, form));
      setForm(updated);
      setRecord(resource === 'materials' ? await getMaterialCatalog(id) : updated);
      setEditing(false);
      setMessage('Saved');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Save failed');
    }
  };

  const rerunBenchmark = async () => {
    if (resource !== 'benchmarks') return;
    setRerunningBenchmark(true);
    setError('');
    try {
      const result = await regenerateBenchmarkGlobally(id);
      setMessage(`Regenerated ${result.benchmarkName} for ${result.runsScored} runs; ${result.runsSkipped} skipped.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Global benchmark regeneration failed');
    } finally {
      setRerunningBenchmark(false);
    }
  };

  const title = record ? getRecordTitle(record, resource) : labelize(resource);
  const details = record ? Object.entries(record).filter(([key]) => key !== 'id' && key !== 'properties' && !(resource === 'machine-setup-profiles' && key === 'parameters')) : [];

  return (
    <DashboardPage maxWidth="100%">
      <div style={styles.page}>
        <LibrarySectionNav activeSection={resource} onSectionChange={onSectionChange} sections={sections} />
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardSubtitle>{labelize(resource)} record</CardSubtitle>
            </div>
            <div style={styles.actions}>
              {resource === 'benchmarks' && record && (
                <Button disabled={rerunningBenchmark} onClick={() => void rerunBenchmark()} type="button" variant="secondary">
                  {rerunningBenchmark ? 'Rerunning…' : 'Rerun Benchmark Globally'}
                </Button>
              )}
              {record && fields.length > 0 && !editing && <Button onClick={() => setEditing(true)} type="button" variant="primary">Edit</Button>}
              <Button onClick={onBack} type="button" variant="secondary">Back</Button>
            </div>
          </CardHeader>
          <Divider />
          {resource === 'metrics' && record?.metricKey === 'cor_78in' && <CorFormula />}
          {error && <MessageBanner tone="danger">{error}</MessageBanner>}
          {message && <MessageBanner tone="success">{message}</MessageBanner>}
          {!record && !error && <div style={styles.muted}>Loading...</div>}
          {record && editing && (
            <div style={styles.editor}>
              <LibraryRecordForm
                fields={fields}
                form={form}
                onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
                options={options}
              />
              <div style={styles.actions}>
                <Button onClick={() => { setForm(record); setEditing(false); }} type="button" variant="secondary">Cancel</Button>
                <Button onClick={() => void save()} type="button" variant="primary">Save</Button>
              </div>
            </div>
          )}
          {record && !editing && (
            <>
              {resource === 'machines' && <h2 style={styles.sectionTitle}>Machine Overview</h2>}
              <div style={styles.summary}>
                {details.map(([key, value]) => (
                  <div key={key} style={styles.detail}>
                    <div style={styles.label}>{labelize(key)}</div>
                    <div>{formatValue(value)}</div>
                  </div>
                ))}
              </div>
              {resource === 'machines' && (
                <section style={styles.machineParameters}>
                  <h2 style={styles.sectionTitle}>Machine Parameters</h2>
                  <MachineParametersAccordion parameters={machineParameters} />
                </section>
              )}
              {resource === 'machine-setup-profiles' && (
                <section style={styles.machineParameters}>
                  <h2 style={styles.sectionTitle}>Setup Values</h2>
                  <SetupProfileParametersTable parameters={record.parameters as SetupProfileParameter[] | undefined} />
                </section>
              )}
              {resource === 'material-suppliers' && (
                <RelatedMaterialsTable error={relatedError} materials={relatedMaterials} />
              )}
              {resource === 'materials' && (
                <MaterialPropertiesEditor
                  materialId={id}
                  onChanged={async () => setRecord(await getMaterialCatalog(id))}
                  properties={(record as MaterialCatalogDetail).properties ?? []}
                />
              )}
              {resource === 'benchmarks' && (
                <>
                  {benchmarkPropertiesError && <MessageBanner tone="danger">{benchmarkPropertiesError}</MessageBanner>}
                  <BenchmarkPropertiesEditor
                    benchmarkProfileId={id}
                    onSaved={(property, isNew) => setBenchmarkProperties((current) => isNew ? [...current, property] : current.map((item) => item.id === property.id ? property : item))}
                    options={options}
                    properties={benchmarkProperties}
                  />
                </>
              )}
              {resource === 'scoring-profiles' && (
                <ScoringProfileWeightsEditor onSaved={(weight) => setScoringProfileWeights((current) => current.map((item) => item.id === weight.id ? weight : item))} options={options} weights={scoringProfileWeights} />
              )}
            </>
          )}
        </Card>
      </div>
    </DashboardPage>
  );
}

function getRecordTitle(record: LibraryRecord, resource: string) {
  const titleKeys = ['benchmarkName', 'scoringCode', 'profileName', 'profileCode', 'materialName', 'propertyName', 'supplierName', 'machineName', 'displayName', 'moldName', 'zoneName', 'name', 'code'];
  const value = titleKeys.map((key) => record[key]).find((item) => item !== null && item !== undefined && item !== '');
  return value ? String(value) : `${labelize(resource)} ${record.id}`;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value);
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

const styles: Record<string, CSSProperties> = {
  actions: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3, justifyContent: 'flex-end' },
  detail: { minWidth: 0 },
  editor: { display: 'grid', gap: spacing.space4, maxWidth: 760 },
  label: { color: colors.text.muted, fontSize: font.size.small, marginBottom: spacing.space1 },
  muted: { color: colors.text.muted },
  page: { display: 'flex', flexDirection: 'column', gap: spacing.space5, minHeight: '100%' },
  machineParameters: { display: 'grid', gap: spacing.space3, marginTop: spacing.space5, minWidth: 0 },
  sectionTitle: { color: colors.text.primary, fontSize: font.size.h2, margin: 0 },
  summary: { display: 'grid', gap: spacing.space5, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
};
