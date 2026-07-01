import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getFormulation,
  getFormulationResults,
  saveDurabilityResults,
  saveEnvironmentalResults,
  savePhysicalResults,
  saveSubjectiveResults,
  type DurabilityResult,
  type EnvironmentalResult,
  type FormulationDetail,
  type FormulationResultsBundle,
  type SubjectiveRating,
  type TestResult,
  type UpsertDurabilityDto,
  type UpsertEnvironmentalDto,
  type UpsertSubjectiveRatingDto,
  type UpsertTestResultDto,
} from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { trackActivity } from '../../store/activityTracker';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface TestResultsPageProps {
  formulationId: string;
  onBack: () => void;
}

type ResultSection = 'physical' | 'performance' | 'durability' | 'environmental' | 'subjective';
type FieldType = 'number' | 'textarea';

interface FieldDefinition {
  key: string;
  label: string;
  step?: string;
  type?: FieldType;
}

const SECTION_FIELDS: Record<ResultSection, FieldDefinition[]> = {
  physical: [
    { key: 'weightG', label: 'Weight', step: '0.01' },
    { key: 'diameterMm', label: 'Diameter', step: '0.01' },
    { key: 'wallThicknessMm', label: 'Wall thickness', step: '0.01' },
    { key: 'roundnessMm', label: 'Roundness', step: '0.01' },
    { key: 'balanceG', label: 'Balance / center of mass deviation', step: '0.01' },
  ],
  performance: [
    { key: 'bounceCm', label: 'Bounce height', step: '0.01' },
    { key: 'hardnessShorD', label: 'Hardness', step: '0.01' },
    { key: 'compressionKg', label: 'Compression', step: '0.01' },
    { key: 'deflectionMm', label: 'Deflection', step: '0.01' },
    { key: 'coefficientOfRestitution', label: 'Coefficient of restitution', step: '0.01' },
  ],
  durability: [
    { key: 'airCannonCycles', label: 'Air cannon cycles to failure', step: '1' },
    { key: 'crackInitiationCycles', label: 'Crack initiation cycles', step: '1' },
    { key: 'crackPropagationObservations', label: 'Crack propagation observations', step: '0.01' },
    { key: 'deformationMm', label: 'Deformation measurements', step: '0.01' },
  ],
  environmental: [
    { key: 'hotTemperaturePerformance', label: 'Hot temperature performance', step: '0.01' },
    { key: 'coldTemperaturePerformance', label: 'Cold temperature performance', step: '0.01' },
    { key: 'humidityExposureResults', label: 'Humidity exposure results', step: '0.01' },
  ],
  subjective: [
    { key: 'playerFeedback', label: 'Player feedback', type: 'textarea' },
    { key: 'feelScore', label: 'Feel rating', step: '1' },
    { key: 'soundScore', label: 'Sound rating', step: '1' },
    { key: 'perceivedSpeedScore', label: 'Perceived speed', step: '1' },
    { key: 'perceivedDurabilityScore', label: 'Perceived durability', step: '1' },
  ],
};

const SECTION_TITLES: Record<ResultSection, string> = {
  physical: 'Physical Properties',
  performance: 'Performance Testing',
  durability: 'Durability Testing',
  environmental: 'Environmental Testing',
  subjective: 'Subjective Ratings',
};

export function TestResultsPage({ formulationId, onBack }: TestResultsPageProps) {
  const dispatch = useAppDispatch();
  const [formulation, setFormulation] = useState<FormulationDetail | null>(null);
  const [results, setResults] = useState<FormulationResultsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<ResultSection | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [formulationResult, resultsResult] = await Promise.all([
        getFormulation(formulationId),
        getFormulationResults(formulationId),
      ]);
      setFormulation(formulationResult);
      setResults(resultsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [formulationId]);

  const saveSection = async (section: ResultSection, payload: Record<string, number | string>) => {
    setSaving(section);
    setError('');

    try {
      await trackActivity(dispatch, `Saving ${SECTION_TITLES[section].toLowerCase()}...`, async () => {
        if (section === 'physical' || section === 'performance') {
          await savePhysicalResults(formulationId, payload as UpsertTestResultDto);
        }
        if (section === 'durability') {
          await saveDurabilityResults(formulationId, payload as UpsertDurabilityDto);
        }
        if (section === 'environmental') {
          await saveEnvironmentalResults(formulationId, payload as UpsertEnvironmentalDto);
        }
        if (section === 'subjective') {
          await saveSubjectiveResults(formulationId, payload as UpsertSubjectiveRatingDto);
        }

        await load();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test results');
    } finally {
      setSaving(null);
    }
  };

  return (
    <DashboardPage>
      <Card>
        <div style={styles.header}>
          <button onClick={onBack} style={controlStyles.secondaryButton} type="button">
            Back
          </button>
        </div>

        <h1 style={styles.title}>Test Results</h1>
        {formulation && (
          <p style={styles.subtitle}>
            {formulation.formulationCode}{formulation.producedDate ? ` · ${formulation.producedDate}` : ''}
          </p>
        )}

        <Divider />

        {loading && <div style={styles.muted}>Loading test workflow...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && results && (
          <div style={styles.sections}>
            <ResultCard
              fields={SECTION_FIELDS.physical}
              saving={saving === 'physical'}
              title={SECTION_TITLES.physical}
              values={results.physical}
              onSubmit={(payload) => saveSection('physical', payload)}
            />

            <ResultCard
              fields={SECTION_FIELDS.performance}
              saving={saving === 'performance'}
              title={SECTION_TITLES.performance}
              values={results.physical}
              onSubmit={(payload) => saveSection('performance', payload)}
            />

            <ResultCard
              fields={SECTION_FIELDS.durability}
              saving={saving === 'durability'}
              title={SECTION_TITLES.durability}
              values={results.durability}
              onSubmit={(payload) => saveSection('durability', payload)}
            />

            <ResultCard
              fields={SECTION_FIELDS.environmental}
              saving={saving === 'environmental'}
              title={SECTION_TITLES.environmental}
              values={results.environmental}
              onSubmit={(payload) => saveSection('environmental', payload)}
            />

            <ResultCard
              fields={SECTION_FIELDS.subjective}
              saving={saving === 'subjective'}
              title={SECTION_TITLES.subjective}
              values={results.subjective}
              onSubmit={(payload) => saveSection('subjective', payload)}
            />
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

function ResultCard({
  fields,
  onSubmit,
  saving,
  title,
  values,
}: {
  fields: FieldDefinition[];
  onSubmit: (payload: Record<string, number | string>) => Promise<void>;
  saving: boolean;
  title: string;
  values: TestResult | DurabilityResult | EnvironmentalResult | SubjectiveRating | null;
}) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    const source = (values ?? {}) as Record<string, unknown>;

    for (const field of fields) {
      const value = source[field.key];
      next[field.key] = value == null ? '' : String(value);
    }

    setForm(next);
  }, [fields, values]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = fields.reduce<Record<string, number | string>>((acc, field) => {
      const rawValue = form[field.key]?.trim() ?? '';

      if (!rawValue) {
        return acc;
      }

      acc[field.key] = field.type === 'textarea' ? rawValue : Number(rawValue);
      return acc;
    }, {});

    await onSubmit(payload);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <button disabled={saving} style={controlStyles.primaryButton} type="submit">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={styles.grid}>
        {fields.map((field) => (
          <label
            key={field.key}
            style={field.type === 'textarea' ? styles.fullWidthField : controlStyles.field}
          >
            <span style={controlStyles.fieldLabel}>{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                style={controlStyles.textarea}
                value={form[field.key] ?? ''}
              />
            ) : (
              <input
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                step={field.step ?? '0.01'}
                style={controlStyles.input}
                type="number"
                value={form[field.key] ?? ''}
              />
            )}
          </label>
        ))}
      </div>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    padding: `${spacing.md}px`,
  },
  cardHeader: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  fullWidthField: {
    ...controlStyles.field,
    gridColumn: '1 / -1',
  },
  grid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  },
  header: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    margin: 0,
  },
  sections: {
    display: 'grid',
    gap: spacing.md,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.md,
    margin: 0,
  },
  title: {
    color: colors.text.primary,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    margin: `${spacing.md}px 0 4px`,
  },
};
