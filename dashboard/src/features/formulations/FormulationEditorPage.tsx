import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  createFormulation,
  getFormulation,
  updateFormulation,
  type CreateFormulationDto,
  type FormulationDetail,
  type UpdateFormulationDto,
} from '../../services/api';
import { colors, font, spacing } from '../../theme/tokens';
import { FormulationForm } from './FormulationForm';

interface FormulationEditorPageProps {
  formulationId?: string;
  mode: 'create' | 'edit';
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved: (id: string) => void;
}

export function FormulationEditorPage({
  formulationId,
  mode,
  onBack,
  onDirtyChange,
  onSaved,
}: FormulationEditorPageProps) {
  const [initialValue, setInitialValue] = useState<FormulationDetail | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !formulationId) {
      setInitialValue(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    void getFormulation(formulationId)
      .then(setInitialValue)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formulationId, mode]);

  const handleSubmit = async (payload: CreateFormulationDto | UpdateFormulationDto) => {
    setSaving(true);
    setError('');

    try {
      const saved = mode === 'create'
        ? await createFormulation(payload as CreateFormulationDto)
        : await updateFormulation(formulationId!, payload as UpdateFormulationDto);

      onSaved(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save formulation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPage>
      <Card>
        <h1 style={styles.title}>{mode === 'create' ? 'Create Formulation' : 'Edit Formulation'}</h1>
        <p style={styles.subtitle}>
          {mode === 'create' ? 'Add a new formulation record.' : 'Update the current formulation.'}
        </p>

        <Divider />

        {error && !loading && <MessageBanner tone="danger">{error}</MessageBanner>}
        {loading ? (
          <div style={styles.muted}>Loading formulation...</div>
        ) : (
          <FormulationForm
            error={error}
            initialValue={initialValue ?? undefined}
            loading={saving}
            onCancel={onBack}
            onDirtyChange={onDirtyChange}
            onSubmit={handleSubmit}
            submitLabel={mode === 'create' ? 'Create' : 'Save Changes'}
          />
        )}
      </Card>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    margin: `${spacing.xs}px 0 0`,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: 0,
  },
};
