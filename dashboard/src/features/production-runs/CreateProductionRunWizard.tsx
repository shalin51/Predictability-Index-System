import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  createProductionRun,
  listApprovedFormulationOptions,
  listLibraryOptions,
  type LibraryRecord,
  type ProductionRunPayload,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { ManufacturingParametersForm } from './components/ManufacturingParametersForm';
import { formatValue, runStyles } from './productionRunUi';
import { createProductionRunDraft } from './productionRunDraft';

const today = new Date().toISOString().slice(0, 10);

export function CreateProductionRunWizard({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [formulations, setFormulations] = useState<LibraryRecord[]>([]);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [machineSetupProfiles, setMachineSetupProfiles] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<ProductionRunPayload>(() => createProductionRunDraft(today));

  useEffect(() => {
    setError('');
    setLoading(true);
    setPayload(createProductionRunDraft(today));
    void Promise.all([listApprovedFormulationOptions(), listLibraryOptions('machines'), listLibraryOptions('machine-setup-profiles'), listLibraryOptions('molds')])
      .then(([formulationOptions, machineOptions, profileOptions, moldOptions]) => {
        setFormulations(formulationOptions);
        setMachines(machineOptions);
        setMachineSetupProfiles(profileOptions);
        setMolds(moldOptions);
        setPayload((current) => withDefaultEquipment(current, machineOptions, moldOptions, profileOptions));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedFormulation = formulations.find((item) => item.id === payload.formulationId);

  const update = (patch: Partial<ProductionRunPayload>) => {
    setError('');
    setPayload((current) => ({ ...current, ...patch }));
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
            <h1 style={runStyles.title}>New Production Run</h1>
            <p style={runStyles.subtitle}>Create a molded batch from an approved formulation and generate samples.</p>
          </div>
          <div style={styles.headerActions}>
            <Button onClick={onCancel} type="button" variant="secondary">Back</Button>
          </div>
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
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation *</span>
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
              <input disabled placeholder="Generated from formulation code" style={controlStyles.input} value="" />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Date Produced *</span>
              <input onChange={(event) => update({ dateProduced: event.target.value })} style={controlStyles.input} type="date" value={payload.dateProduced} />
            </label>
          </div>
        )}
        {step === 1 && <ManufacturingParametersForm machineSetupProfiles={machineSetupProfiles} machines={machines} molds={molds} onChange={update} value={payload} />}
        {step === 2 && (
          <div style={runStyles.stack}>
            <div style={runStyles.panel}>Selected formulation: <strong>{String(selectedFormulation?.['label'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Machine: <strong>{String(machines.find((item) => item.id === payload.machineId)?.['code'] ?? '-')}</strong></div>
            <div style={runStyles.panel}>Machine Setup Profile: <strong>{String(machineSetupProfiles.find((item) => item.id === payload.machineSetupProfileId)?.['label'] ?? '-')}</strong></div>
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

function withDefaultEquipment(payload: ProductionRunPayload, machines: LibraryRecord[], molds: LibraryRecord[], profiles: LibraryRecord[]): ProductionRunPayload {
  const machineId = payload.machineId || machines[0]?.id || '';
  return {
    ...payload,
    machineId,
    machineSetupProfileId: payload.machineSetupProfileId || profiles.find((profile) => profile['machineId'] === machineId)?.id || null,
    moldId: payload.moldId || molds[0]?.id || '',
  };
}

const styles: Record<string, CSSProperties> = {
  headerActions: { display: 'flex', justifyContent: 'flex-end' },
  steps: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
};
