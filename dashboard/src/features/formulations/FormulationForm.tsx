import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from '../../components/ui/controls';
import { MessageBanner } from '../../components/ui/Page';
import type {
  CreateFormulationDto,
  FormulationDetail,
  UpdateFormulationDto,
} from '../../services/api';
import { font, spacing } from '../../theme/tokens';

interface FormulationFormProps {
  error?: string;
  initialValue?: Partial<FormulationDetail>;
  onChange?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (payload: CreateFormulationDto | UpdateFormulationDto) => Promise<void> | void;
  submitState?: 'idle' | 'saving' | 'saved';
  submitLabel: string;
}

interface ResinComponentState {
  lotNumber: string;
  materialSupplier: string;
  percentComposition: string;
  resinComponent: string;
}

interface ManufacturingState {
  coolingTime: string;
  cycleTime: string;
  injectionPressure: string;
  machineUsed: string;
  meltTemperature: string;
  moldUsed: string;
}

interface FormState {
  formulationCode: string;
  manufacturingData: ManufacturingState;
  producedDate: string;
  resinComponents: ResinComponentState[];
}

function createEmptyComponent(): ResinComponentState {
  return {
    lotNumber: '',
    materialSupplier: '',
    percentComposition: '',
    resinComponent: '',
  };
}

function toInitialState(initialValue?: Partial<FormulationDetail>): FormState {
  return {
    formulationCode: initialValue?.formulationCode ?? '',
    manufacturingData: {
      coolingTime: initialValue?.manufacturingData?.coolingTime != null ? String(initialValue.manufacturingData.coolingTime) : '',
      cycleTime: initialValue?.manufacturingData?.cycleTime != null ? String(initialValue.manufacturingData.cycleTime) : '',
      injectionPressure: initialValue?.manufacturingData?.injectionPressure != null ? String(initialValue.manufacturingData.injectionPressure) : '',
      machineUsed: initialValue?.manufacturingData?.machineUsed ?? '',
      meltTemperature: initialValue?.manufacturingData?.meltTemperature != null ? String(initialValue.manufacturingData.meltTemperature) : '',
      moldUsed: initialValue?.manufacturingData?.moldUsed ?? '',
    },
    producedDate: initialValue?.producedDate ?? '',
    resinComponents: initialValue?.resinComponents?.length
      ? initialValue.resinComponents.map((component) => ({
          lotNumber: component.lotNumber ?? '',
          materialSupplier: component.materialSupplier,
          percentComposition: String(component.percentComposition),
          resinComponent: component.resinComponent,
        }))
      : [createEmptyComponent()],
  };
}

function toOptionalNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

function buildManufacturingData(state: ManufacturingState): CreateFormulationDto['manufacturingData'] {
  const payload = {
    coolingTime: toOptionalNumber(state.coolingTime),
    cycleTime: toOptionalNumber(state.cycleTime),
    injectionPressure: toOptionalNumber(state.injectionPressure),
    machineUsed: state.machineUsed.trim() || undefined,
    meltTemperature: toOptionalNumber(state.meltTemperature),
    moldUsed: state.moldUsed.trim() || undefined,
  };

  return Object.values(payload).some((value) => value !== undefined) ? payload : undefined;
}

export function FormulationForm({
  error,
  initialValue,
  onChange,
  onCancel,
  onDirtyChange,
  onSubmit,
  submitState = 'idle',
  submitLabel,
}: FormulationFormProps) {
  const [form, setForm] = useState<FormState>(() => toInitialState(initialValue));
  const initialState = useMemo(() => toInitialState(initialValue), [initialValue]);
  const isEdit = Boolean(initialValue?.id);
  const loading = submitState === 'saving';

  useEffect(() => {
    setForm(initialState);
  }, [initialState]);

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(form) !== JSON.stringify(initialState));
  }, [form, initialState, onDirtyChange]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      manufacturingData: buildManufacturingData(form.manufacturingData),
      producedDate: form.producedDate || undefined,
      resinComponents: form.resinComponents.map((component) => ({
        lotNumber: component.lotNumber.trim() || undefined,
        materialSupplier: component.materialSupplier.trim(),
        percentComposition: Number(component.percentComposition),
        resinComponent: component.resinComponent.trim(),
      })),
    };

    await onSubmit(
      isEdit
        ? payload
        : {
            formulationCode: form.formulationCode.trim(),
            ...payload,
          },
    );
  };

  const updateForm = (updater: (current: FormState) => FormState) => {
    onChange?.();
    setForm((current) => updater(current));
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={styles.form}>
      <div style={styles.grid}>
        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Formulation ID</span>
          <input
            disabled={loading || isEdit}
            onChange={(event) => updateForm((current) => ({ ...current, formulationCode: event.target.value }))}
            style={controlStyles.input}
            value={form.formulationCode}
          />
        </label>

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Date Produced</span>
          <input
            disabled={loading}
            onChange={(event) => updateForm((current) => ({ ...current, producedDate: event.target.value }))}
            style={controlStyles.input}
            type="date"
            value={form.producedDate}
          />
        </label>
      </div>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Resin Components</h2>
          <button
            disabled={loading}
            onClick={() => updateForm((current) => ({
              ...current,
              resinComponents: [...current.resinComponents, createEmptyComponent()],
            }))}
            style={controlStyles.secondaryButton}
            type="button"
          >
            Add Component
          </button>
        </div>

        <div style={styles.componentList}>
          {form.resinComponents.map((component, index) => (
            <div key={index} style={styles.componentCard}>
              <div style={styles.grid}>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Resin Component</span>
                  <input
                    disabled={loading}
                    onChange={(event) => updateForm((current) => ({
                      ...current,
                      resinComponents: current.resinComponents.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, resinComponent: event.target.value } : item
                      )),
                    }))}
                    style={controlStyles.input}
                    value={component.resinComponent}
                  />
                </label>

                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Percent Composition</span>
                  <input
                    disabled={loading}
                    min="0"
                    onChange={(event) => updateForm((current) => ({
                      ...current,
                      resinComponents: current.resinComponents.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, percentComposition: event.target.value } : item
                      )),
                    }))}
                    step="0.01"
                    style={controlStyles.input}
                    type="number"
                    value={component.percentComposition}
                  />
                </label>

                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Material Supplier</span>
                  <input
                    disabled={loading}
                    onChange={(event) => updateForm((current) => ({
                      ...current,
                      resinComponents: current.resinComponents.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, materialSupplier: event.target.value } : item
                      )),
                    }))}
                    style={controlStyles.input}
                    value={component.materialSupplier}
                  />
                </label>

                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Lot Number</span>
                  <input
                    disabled={loading}
                    onChange={(event) => updateForm((current) => ({
                      ...current,
                      resinComponents: current.resinComponents.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, lotNumber: event.target.value } : item
                      )),
                    }))}
                    style={controlStyles.input}
                    value={component.lotNumber}
                  />
                </label>
              </div>

              {form.resinComponents.length > 1 && (
                <div style={styles.componentActions}>
                  <button
                    disabled={loading}
                    onClick={() => updateForm((current) => ({
                      ...current,
                      resinComponents: current.resinComponents.filter((_, itemIndex) => itemIndex !== index),
                    }))}
                    style={controlStyles.secondaryButton}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Manufacturing Data</h2>
        <div style={styles.grid}>
          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Mold Used</span>
            <input
              disabled={loading}
              onChange={(event) => updateForm((current) => ({
                ...current,
                manufacturingData: { ...current.manufacturingData, moldUsed: event.target.value },
              }))}
              style={controlStyles.input}
              value={form.manufacturingData.moldUsed}
            />
          </label>

          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Injection Pressure</span>
            <input
              disabled={loading}
              min="0"
              onChange={(event) => updateForm((current) => ({
                ...current,
                manufacturingData: { ...current.manufacturingData, injectionPressure: event.target.value },
              }))}
              style={controlStyles.input}
              type="number"
              value={form.manufacturingData.injectionPressure}
            />
          </label>

          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Melt Temperature</span>
            <input
              disabled={loading}
              onChange={(event) => updateForm((current) => ({
                ...current,
                manufacturingData: { ...current.manufacturingData, meltTemperature: event.target.value },
              }))}
              style={controlStyles.input}
              type="number"
              value={form.manufacturingData.meltTemperature}
            />
          </label>

          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Cooling Time</span>
            <input
              disabled={loading}
              min="0"
              onChange={(event) => updateForm((current) => ({
                ...current,
                manufacturingData: { ...current.manufacturingData, coolingTime: event.target.value },
              }))}
              style={controlStyles.input}
              type="number"
              value={form.manufacturingData.coolingTime}
            />
          </label>

          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Cycle Time</span>
            <input
              disabled={loading}
              min="0"
              onChange={(event) => updateForm((current) => ({
                ...current,
                manufacturingData: { ...current.manufacturingData, cycleTime: event.target.value },
              }))}
              style={controlStyles.input}
              type="number"
              value={form.manufacturingData.cycleTime}
            />
          </label>

          <label style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>Machine Used</span>
            <input
              disabled={loading}
              onChange={(event) => updateForm((current) => ({
                ...current,
                manufacturingData: { ...current.manufacturingData, machineUsed: event.target.value },
              }))}
              style={controlStyles.input}
              value={form.manufacturingData.machineUsed}
            />
          </label>
        </div>
      </section>

      {error && <MessageBanner tone="danger">{error}</MessageBanner>}

      <div style={styles.actions}>
        {onCancel && (
          <button disabled={loading} onClick={onCancel} style={controlStyles.secondaryButton} type="button">
            Cancel
          </button>
        )}
        <button disabled={loading} style={styles.primary} type="submit">
          {submitState === 'saving' ? 'Saving...' : submitState === 'saved' ? 'Saved' : submitLabel}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  actions: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  componentActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  componentCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  componentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  grid: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  primary: {
    ...controlStyles.primaryButton,
    fontWeight: font.weight.medium,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    margin: 0,
  },
};
