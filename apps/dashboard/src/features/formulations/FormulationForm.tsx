import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { controlStyles } from '../../components/ui/controls';
import { MessageBanner } from '../../components/ui/Page';
import type {
  CreateFormulationDto,
  FormulationDetail,
  FormulationStatus,
  UpdateFormulationDto,
} from '../../services/api';
import { font, spacing } from '../../theme/tokens';

interface FormulationFormProps {
  error?: string;
  initialValue?: Partial<FormulationDetail>;
  loading?: boolean;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (payload: CreateFormulationDto | UpdateFormulationDto) => Promise<void> | void;
  submitLabel: string;
}

interface FormState {
  formulationCode: string;
  name: string;
  description: string;
  status: FormulationStatus;
  producedDate: string;
  lotNumber: string;
  batchSizeKg: string;
  notes: string;
}

function toInitialState(initialValue?: Partial<FormulationDetail>): FormState {
  return {
    formulationCode: initialValue?.formulationCode ?? '',
    name: initialValue?.name ?? '',
    description: initialValue?.description ?? '',
    status: initialValue?.status ?? 'draft',
    producedDate: initialValue?.producedDate ?? '',
    lotNumber: initialValue?.lotNumber ?? '',
    batchSizeKg: initialValue?.batchSizeKg != null ? String(initialValue.batchSizeKg) : '',
    notes: initialValue?.notes ?? '',
  };
}

export function FormulationForm({
  error,
  initialValue,
  loading = false,
  onCancel,
  onDirtyChange,
  onSubmit,
  submitLabel,
}: FormulationFormProps) {
  const [form, setForm] = useState<FormState>(() => toInitialState(initialValue));
  const initialState = useMemo(() => toInitialState(initialValue), [initialValue]);
  const isEdit = Boolean(initialValue?.id);

  useEffect(() => {
    setForm(initialState);
  }, [initialState]);

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(form) !== JSON.stringify(initialState));
  }, [form, initialState, onDirtyChange]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      producedDate: form.producedDate || undefined,
      lotNumber: form.lotNumber.trim() || undefined,
      batchSizeKg: form.batchSizeKg ? Number(form.batchSizeKg) : undefined,
      notes: form.notes.trim() || undefined,
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

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={styles.form}>
      <div style={styles.grid}>
        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Formulation Code</span>
          <input
            disabled={loading || isEdit}
            onChange={(event) => setForm((current) => ({ ...current, formulationCode: event.target.value }))}
            style={controlStyles.input}
            value={form.formulationCode}
          />
        </label>

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Name</span>
          <input
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            style={controlStyles.input}
            value={form.name}
          />
        </label>

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Status</span>
          <select
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FormulationStatus }))}
            style={controlStyles.input}
            value={form.status}
          >
            <option value="draft">draft</option>
            <option value="testing">testing</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="archived">archived</option>
          </select>
        </label>

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Produced Date</span>
          <input
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, producedDate: event.target.value }))}
            style={controlStyles.input}
            type="date"
            value={form.producedDate}
          />
        </label>

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Lot Number</span>
          <input
            disabled={loading}
            onChange={(event) => setForm((current) => ({ ...current, lotNumber: event.target.value }))}
            style={controlStyles.input}
            value={form.lotNumber}
          />
        </label>

        <label style={controlStyles.field}>
          <span style={controlStyles.fieldLabel}>Batch Size (kg)</span>
          <input
            disabled={loading}
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, batchSizeKg: event.target.value }))}
            step="0.1"
            style={controlStyles.input}
            type="number"
            value={form.batchSizeKg}
          />
        </label>
      </div>

      <label style={controlStyles.field}>
        <span style={controlStyles.fieldLabel}>Description</span>
        <textarea
          disabled={loading}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          style={controlStyles.textarea}
          value={form.description}
        />
      </label>

      <label style={controlStyles.field}>
        <span style={controlStyles.fieldLabel}>Notes</span>
        <textarea
          disabled={loading}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          style={controlStyles.textarea}
          value={form.notes}
        />
      </label>

      {error && <MessageBanner tone="danger">{error}</MessageBanner>}

      <div style={styles.actions}>
        {onCancel && (
          <button disabled={loading} onClick={onCancel} style={controlStyles.secondaryButton} type="button">
            Cancel
          </button>
        )}
        <button disabled={loading} style={styles.primary} type="submit">
          {loading ? 'Saving...' : submitLabel}
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
};
