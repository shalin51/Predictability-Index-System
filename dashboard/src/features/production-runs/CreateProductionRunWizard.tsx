import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  createProductionRun,
  getProductionRun,
  listApprovedFormulationOptions,
  listLibraryOptions,
  listProductionRuns,
  type LibraryRecord,
  type ProductionRunPayload,
  type ProductionRunRecord,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { ManufacturingParametersForm } from './components/ManufacturingParametersForm';
import { formatValue, runStyles } from './productionRunUi';
import { createProductionRunDraft, duplicateProductionRunDraft } from './duplicateProductionRun';

const today = new Date().toISOString().slice(0, 10);

export function CreateProductionRunWizard({ duplicateSourceId, onCancel, onSaved }: { duplicateSourceId?: string; onCancel: () => void; onSaved: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [formulations, setFormulations] = useState<LibraryRecord[]>([]);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [priorRuns, setPriorRuns] = useState<ProductionRunRecord[]>([]);
  const [selectedPriorRunId, setSelectedPriorRunId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(duplicateSourceId));
  const [sourceRunCode, setSourceRunCode] = useState('');
  const [payload, setPayload] = useState<ProductionRunPayload>(() => createProductionRunDraft(today));

  useEffect(() => {
    setError('');
    setLoading(Boolean(duplicateSourceId));
    setPayload(createProductionRunDraft(today));
    setSourceRunCode('');
    setSelectedPriorRunId(duplicateSourceId ?? '');
    const sourceRequest = duplicateSourceId ? getProductionRun(duplicateSourceId) : Promise.resolve(null);
    void Promise.all([listApprovedFormulationOptions(), listLibraryOptions('machines'), listLibraryOptions('molds'), listProductionRuns(), sourceRequest])
      .then(([formulationOptions, machineOptions, moldOptions, runOptions, source]) => {
        setFormulations(formulationOptions);
        setMachines(machineOptions);
        setMolds(moldOptions);
        setPriorRuns(runOptions);
        if (source) {
          const draft = duplicateProductionRunDraft(source, today);
          const sourceFormulationIsApproved = formulationOptions.some((formulation) => formulation.id === source.formulationId);
          setPayload({ ...draft, formulationId: sourceFormulationIsApproved ? source.formulationId : '' });
          setSourceRunCode(source.runCode);
          if (!sourceFormulationIsApproved) {
            setError(`The formulation used by ${source.runCode} is no longer approved. Select an approved formulation version before saving.`);
          }
        } else {
          setPayload((current) => withDefaultEquipment(current, machineOptions, moldOptions));
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [duplicateSourceId]);

  const selectedFormulation = formulations.find((item) => item.id === payload.formulationId);

  const update = (patch: Partial<ProductionRunPayload>) => {
    setError('');
    setPayload((current) => ({ ...current, ...patch }));
  };

  const importPriorRun = async (id: string) => {
    if (!id) {
      setError('');
      setPayload(withDefaultEquipment(createProductionRunDraft(today), machines, molds));
      setSourceRunCode('');
      setSelectedPriorRunId('');
      return;
    }
    try {
      setError('');
      const source = await getProductionRun(id);
      const draft = duplicateProductionRunDraft(source, today);
      const sourceFormulationIsApproved = formulations.some((formulation) => formulation.id === source.formulationId);
      setPayload({ ...draft, formulationId: sourceFormulationIsApproved ? source.formulationId : '' });
      setSourceRunCode(source.runCode);
      setSelectedPriorRunId(id);
      if (!sourceFormulationIsApproved) {
        setError(`Imported settings from ${source.runCode}. Select an approved formulation version before saving.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the selected production run');
    }
  };

  const save = async (status: 'planned' | 'molded') => {
    try {
      setError('');
      const { sampleGeneration: _sampleGeneration, ...runPayload } = payload;
      const record = await createProductionRun({ ...runPayload, status });
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
            <h1 style={runStyles.title}>{duplicateSourceId ? 'Duplicate Production Run' : 'New Production Run'}</h1>
            <p style={runStyles.subtitle}>{duplicateSourceId ? `Create a new run from ${sourceRunCode || 'the selected run'}.` : 'Create a molded batch from an approved formulation and generate samples.'}</p>
          </div>
          <button onClick={onCancel} style={controlStyles.secondaryButton} type="button">Cancel</button>
        </div>
        <div style={styles.steps}>
          {['Select Formulation', 'Manufacturing Parameters', 'Review'].map((label, index) => (
            <button key={label} onClick={() => setStep(index)} style={getTabButtonStyle(step === index)} type="button">{label}</button>
          ))}
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading && <div style={runStyles.muted}>Loading source run...</div>}
        {!loading && (
          <>
        {step === 0 && (
          <div style={runStyles.formGrid}>
            {!duplicateSourceId && (
              <label style={controlStyles.field}>
                <span style={controlStyles.fieldLabel}>Copy a Previous Production Run</span>
                <select
                  onChange={(event) => void importPriorRun(event.target.value)}
                  style={controlStyles.input}
                  value={selectedPriorRunId}
                >
                  <option value="">Start with a blank production run</option>
                  {priorRuns.map((run) => (
                    <option key={run.id} value={run.id}>{run.runCode} — {run.formulation} ({formatValue(run.dateProduced)})</option>
                  ))}
                </select>
              </label>
            )}
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
              <span style={controlStyles.fieldLabel}>Benchmarks</span>
              <input disabled style={controlStyles.input} value="All active benchmarks" />
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
          <div style={runStyles.stack}>
            <div style={runStyles.panel}>Selected formulation: <strong>{String(selectedFormulation?.['label'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Machine: <strong>{String(machines.find((item) => item.id === payload.machineId)?.['code'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Mold: <strong>{String(molds.find((item) => item.id === payload.moldId)?.['code'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Injection Pressure: {formatValue(payload.injectionPressure)} {payload.injectionPressureUnit}</div>
            <div style={runStyles.panel}>Melt Temperature: {formatValue(payload.meltTemperature)} {payload.meltTemperatureUnit}</div>
            <div style={runStyles.panel}>Cooling Time: {formatValue(payload.coolingTime)} {payload.coolingTimeUnit}</div>
            <div style={runStyles.panel}>Cycle Time: {formatValue(payload.cycleTime)} {payload.cycleTimeUnit}</div>
            <div style={runStyles.panel}>Cure Hours Before Test: {formatValue(payload.cureHoursBeforeTest)}</div>
            <div style={runStyles.panel}>Samples will be generated automatically when the run is marked Ready for Testing.</div>
          </div>
        )}
        <Divider />
        <div style={runStyles.actions}>
          <button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} style={controlStyles.secondaryButton} type="button">Back</button>
          {step < 2 && <button onClick={() => setStep((current) => Math.min(2, current + 1))} style={controlStyles.primaryButton} type="button">Next</button>}
          {step === 2 && <button onClick={() => void save('planned')} style={controlStyles.primaryButton} type="button">Save Planned Run</button>}
          {step === 2 && <button onClick={() => void save('molded')} style={controlStyles.primaryButton} type="button">Save as Molded</button>}
        </div>
          </>
        )}
      </Card>
    </DashboardPage>
  );
}

function withDefaultEquipment(payload: ProductionRunPayload, machines: LibraryRecord[], molds: LibraryRecord[]): ProductionRunPayload {
  return {
    ...payload,
    machineId: payload.machineId || machines[0]?.id || '',
    moldId: payload.moldId || molds[0]?.id || '',
  };
}

const styles: Record<string, CSSProperties> = {
  steps: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
};
