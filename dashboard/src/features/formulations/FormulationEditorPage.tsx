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
import { useAppDispatch } from '../../store/hooks';
import { trackActivity } from '../../store/activityTracker';
import { colors, font, spacing } from '../../theme/tokens';
import { FormulationForm } from './FormulationForm';

interface FormulationEditorPageProps {
  formulationId?: string;
  mode: 'create' | 'edit';
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: (id: string) => void;
}

export function FormulationEditorPage({
  formulationId,
  mode,
  onBack,
  onDirtyChange,
  onSaved,
}: FormulationEditorPageProps) {
  const dispatch = useAppDispatch();
  const [initialValue, setInitialValue] = useState<FormulationDetail | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const effectiveMode = mode === 'create' && initialValue?.id ? 'edit' : mode;
  const activeFormulationId = formulationId ?? initialValue?.id;

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
    setSubmitState('saving');
    setError('');

    try {
      const saved = await trackActivity(
        dispatch,
        effectiveMode === 'create' ? 'Creating formulation...' : 'Saving formulation...',
        async () => (
          effectiveMode === 'create'
            ? createFormulation(payload as CreateFormulationDto)
            : updateFormulation(activeFormulationId!, payload as UpdateFormulationDto)
        ),
      );

      setInitialValue(saved);
      setSubmitState('saved');
      onDirtyChange?.(false);
      onSaved?.(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save formulation');
      setSubmitState('idle');
    } finally {
    }
  };

  return (
    <DashboardPage>
      <Card>
        <h1 style={styles.title}>{effectiveMode === 'create' ? 'Create Formulation' : 'Edit Formulation'}</h1>
        <p style={styles.subtitle}>
          {effectiveMode === 'create' ? 'Add a new formulation record.' : 'Update the current formulation.'}
        </p>

        <Divider />

        {error && !loading && <MessageBanner tone="danger">{error}</MessageBanner>}
        {!error && submitState === 'saved' && <MessageBanner tone="success">Saved.</MessageBanner>}
        {loading ? (
          <div style={styles.muted}>Loading formulation...</div>
        ) : (
          <FormulationForm
            error={error}
            initialValue={initialValue ?? undefined}
            onChange={() => {
              if (submitState === 'saved') {
                setSubmitState('idle');
              }
            }}
            onCancel={onBack}
            onDirtyChange={onDirtyChange}
            onSubmit={handleSubmit}
            submitLabel={effectiveMode === 'create' ? 'Create' : 'Save Changes'}
            submitState={submitState}
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
