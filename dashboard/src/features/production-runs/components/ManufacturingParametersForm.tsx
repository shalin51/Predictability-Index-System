import { controlStyles } from '../../../components/ui/controls';
import type { LibraryRecord, ProductionRunPayload } from '../../../services/api';
import { runStyles } from '../productionRunUi';

export function ManufacturingParametersForm({
  machines,
  molds,
  onChange,
  readOnly = false,
  value,
}: {
  machines: LibraryRecord[];
  molds: LibraryRecord[];
  onChange: (patch: Partial<ProductionRunPayload>) => void;
  readOnly?: boolean;
  value: ProductionRunPayload;
}) {
  return (
    <div style={runStyles.formGrid}>
      <label style={controlStyles.field}>
        <span style={controlStyles.fieldLabel}>Machine Used</span>
        <select disabled={readOnly} onChange={(event) => onChange({ machineId: event.target.value })} style={controlStyles.input} value={value.machineId}>
          <option value="">Select</option>
          {machines.map((item) => <option key={item.id} value={item.id}>{String(item['code'] ?? item['label'])}</option>)}
        </select>
      </label>
      <label style={controlStyles.field}>
        <span style={controlStyles.fieldLabel}>Mold Used</span>
        <select disabled={readOnly} onChange={(event) => onChange({ moldId: event.target.value })} style={controlStyles.input} value={value.moldId}>
          <option value="">Select</option>
          {molds.map((item) => <option key={item.id} value={item.id}>{String(item['code'] ?? item['label'])}</option>)}
        </select>
      </label>
      <NumberField label="Injection Pressure" onChange={(injectionPressure) => onChange({ injectionPressure })} readOnly={readOnly} value={value.injectionPressure} />
      <TextField label="Injection Pressure Unit" onChange={(injectionPressureUnit) => onChange({ injectionPressureUnit })} readOnly={readOnly} value={value.injectionPressureUnit ?? 'psi'} />
      <NumberField label="Melt Temperature" onChange={(meltTemperature) => onChange({ meltTemperature })} readOnly={readOnly} value={value.meltTemperature} />
      <TextField label="Melt Temperature Unit" onChange={(meltTemperatureUnit) => onChange({ meltTemperatureUnit })} readOnly={readOnly} value={value.meltTemperatureUnit ?? 'C'} />
      <NumberField label="Cooling Time" onChange={(coolingTime) => onChange({ coolingTime })} readOnly={readOnly} value={value.coolingTime} />
      <TextField label="Cooling Time Unit" onChange={(coolingTimeUnit) => onChange({ coolingTimeUnit })} readOnly={readOnly} value={value.coolingTimeUnit ?? 'sec'} />
      <NumberField label="Cycle Time" onChange={(cycleTime) => onChange({ cycleTime })} readOnly={readOnly} value={value.cycleTime} />
      <TextField label="Cycle Time Unit" onChange={(cycleTimeUnit) => onChange({ cycleTimeUnit })} readOnly={readOnly} value={value.cycleTimeUnit ?? 'sec'} />
      <NumberField label="Cure Hours Before Test" onChange={(cureHoursBeforeTest) => onChange({ cureHoursBeforeTest: cureHoursBeforeTest ?? 72 })} readOnly={readOnly} value={value.cureHoursBeforeTest ?? 72} />
    </div>
  );
}

function NumberField({ label, onChange, readOnly, value }: { label: string; onChange: (value: number | null) => void; readOnly: boolean; value?: number | null }) {
  return (
    <label style={controlStyles.field}>
      <span style={controlStyles.fieldLabel}>{label}</span>
      <input disabled={readOnly} min={0} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} style={controlStyles.input} type="number" value={value ?? ''} />
    </label>
  );
}

function TextField({ label, onChange, readOnly, value }: { label: string; onChange: (value: string) => void; readOnly: boolean; value: string }) {
  return (
    <label style={controlStyles.field}>
      <span style={controlStyles.fieldLabel}>{label}</span>
      <input disabled={readOnly} onChange={(event) => onChange(event.target.value)} style={controlStyles.input} value={value} />
    </label>
  );
}
