import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  createProductionRun,
  listApprovedFormulationOptions,
  listLibraryOptions,
  type LibraryRecord,
  type ProductionRunPayload,
  type SampleGenerationPayload,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { ManufacturingParametersForm } from './components/ManufacturingParametersForm';
import { SampleGenerationForm } from './components/SampleGenerationForm';
import { formatValue, runStyles } from './productionRunUi';

const today = new Date().toISOString().slice(0, 10);

export function CreateProductionRunWizard({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [formulations, setFormulations] = useState<LibraryRecord[]>([]);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<ProductionRunPayload>({
    coolingTimeUnit: 'sec',
    cureHoursBeforeTest: 72,
    cycleTimeUnit: 'sec',
    dateProduced: today,
    formulationId: '',
    injectionPressureUnit: 'psi',
    machineId: '',
    meltTemperatureUnit: 'C',
    moldId: '',
    sampleGeneration: { count: 5, startingSampleCode: '' },
    status: 'planned',
  });

  useEffect(() => {
    void Promise.all([listApprovedFormulationOptions(), listLibraryOptions('machines'), listLibraryOptions('molds')])
      .then(([formulationOptions, machineOptions, moldOptions]) => {
        setFormulations(formulationOptions);
        setMachines(machineOptions);
        setMolds(moldOptions);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const selectedFormulation = formulations.find((item) => item.id === payload.formulationId);
  const selectedMold = molds.find((item) => item.id === payload.moldId);
  const cavityCount = Number(selectedMold?.['cavityCount'] ?? 0);
  const samplePreview = useMemo(() => buildPreview(payload.sampleGeneration), [payload.sampleGeneration]);

  const update = (patch: Partial<ProductionRunPayload>) => setPayload((current) => ({ ...current, ...patch }));

  const save = async (status: 'planned' | 'molded') => {
    try {
      setError('');
      const record = await createProductionRun({ ...payload, status });
      onSaved(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={runStyles.header}>
          <div>
            <h1 style={runStyles.title}>New Production Run</h1>
            <p style={runStyles.subtitle}>Create a molded batch from an approved formulation and generate samples.</p>
          </div>
          <button onClick={onCancel} style={controlStyles.secondaryButton} type="button">Cancel</button>
        </div>
        <div style={styles.steps}>
          {['Select Formulation', 'Manufacturing Parameters', 'Generate Samples', 'Review'].map((label, index) => (
            <button key={label} onClick={() => setStep(index)} style={getTabButtonStyle(step === index)} type="button">{label}</button>
          ))}
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {step === 0 && (
          <div style={runStyles.formGrid}>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation</span>
              <select onChange={(event) => update({ formulationId: event.target.value })} style={controlStyles.input} value={payload.formulationId}>
                <option value="">Select approved formulation</option>
                {formulations.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
              </select>
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation Version</span>
              <input disabled style={controlStyles.input} value={String(selectedFormulation?.['versionNo'] ?? '')} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Target Benchmark</span>
              <input disabled style={controlStyles.input} value={String(selectedFormulation?.['targetBenchmark'] ?? '')} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Run Code</span>
              <input onChange={(event) => update({ runCode: event.target.value })} placeholder="Auto if blank" style={controlStyles.input} value={payload.runCode ?? ''} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Date Produced</span>
              <input onChange={(event) => update({ dateProduced: event.target.value })} style={controlStyles.input} type="date" value={payload.dateProduced} />
            </label>
          </div>
        )}
        {step === 1 && <ManufacturingParametersForm machines={machines} molds={molds} onChange={update} value={payload} />}
        {step === 2 && (
          <SampleGenerationForm
            cavityCount={cavityCount}
            onChange={(sampleGeneration) => update({ sampleGeneration })}
            value={payload.sampleGeneration as SampleGenerationPayload}
          />
        )}
        {step === 3 && (
          <div style={runStyles.stack}>
            <div style={runStyles.panel}>Selected formulation: <strong>{String(selectedFormulation?.['label'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Machine: <strong>{String(machines.find((item) => item.id === payload.machineId)?.['code'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Mold: <strong>{String(selectedMold?.['code'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Injection Pressure: {formatValue(payload.injectionPressure)} {payload.injectionPressureUnit}</div>
            <div style={runStyles.panel}>Melt Temperature: {formatValue(payload.meltTemperature)} {payload.meltTemperatureUnit}</div>
            <div style={runStyles.panel}>Cooling Time: {formatValue(payload.coolingTime)} {payload.coolingTimeUnit}</div>
            <div style={runStyles.panel}>Cycle Time: {formatValue(payload.cycleTime)} {payload.cycleTimeUnit}</div>
            <div style={runStyles.panel}>Cure Hours Before Test: {formatValue(payload.cureHoursBeforeTest)}</div>
            <div style={runStyles.panel}>
              Sample list:
              <ul style={styles.sampleList}>{samplePreview.map((sample) => <li key={sample}>{sample}</li>)}</ul>
            </div>
          </div>
        )}
        <Divider />
        <div style={runStyles.actions}>
          <button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} style={controlStyles.secondaryButton} type="button">Back</button>
          {step < 3 && <button onClick={() => setStep((current) => Math.min(3, current + 1))} style={controlStyles.primaryButton} type="button">Next</button>}
          {step === 3 && <button onClick={() => void save('planned')} style={controlStyles.primaryButton} type="button">Save Planned Run</button>}
          {step === 3 && <button onClick={() => void save('molded')} style={controlStyles.primaryButton} type="button">Save as Molded</button>}
        </div>
      </Card>
    </DashboardPage>
  );
}

function buildPreview(input?: SampleGenerationPayload): string[] {
  if (!input) return [];
  const match = input.startingSampleCode.match(/^(.*?)(\d+)$/);
  return Array.from({ length: input.count }, (_, index) => {
    if (!match) return index === 0 ? input.startingSampleCode : `${input.startingSampleCode}-${index + 1}`;
    return `${match[1] ?? ''}${String(Number(match[2]) + index).padStart((match[2] ?? '').length, '0')}`;
  });
}

const styles: Record<string, CSSProperties> = {
  sampleList: { margin: `${spacing.space2}px 0 0 ${spacing.space5}px` },
  steps: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
};
