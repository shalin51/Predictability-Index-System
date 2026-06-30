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
  type FormulationDetail,
  type FormulationResultsBundle,
  type UpsertDurabilityDto,
  type UpsertEnvironmentalDto,
  type UpsertSubjectiveRatingDto,
  type UpsertTestResultDto,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';

interface TestResultsPageProps {
  formulationId: string;
  onAnalyse: (id: string) => void;
  onBack: () => void;
}

type ResultSection = keyof FormulationResultsBundle;

const REQUIRED_FIELDS: Record<ResultSection, string[]> = {
  physical: ['weightG', 'diameterMm', 'wallThicknessMm', 'roundnessMm', 'balanceG', 'bounceCm', 'hardnessShorD', 'compressionKg', 'deflectionMm', 'coefficientOfRestitution'],
  durability: ['airCannonCycles', 'crackInitiationCycles', 'crackPropagationMm', 'deformationMm'],
  environmental: ['hotPerformanceScore', 'coldPerformanceScore', 'humidityPerformanceScore'],
  subjective: ['feelScore', 'soundScore', 'perceivedSpeedScore', 'perceivedDurabilityScore'],
};

export function TestResultsPage({ formulationId, onAnalyse, onBack }: TestResultsPageProps) {
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

  const saveSection = async (
    section: ResultSection,
    payload: Record<string, number | string>,
  ) => {
    setSaving(section);
    setError('');

    try {
      if (section === 'physical') {
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
          {formulation && (
            <button onClick={() => onAnalyse(formulation.id)} style={controlStyles.primaryButton} type="button">
              Analyse
            </button>
          )}
        </div>

        <h1 style={styles.title}>72-Hour Test Results</h1>
        {formulation && (
          <p style={styles.subtitle}>
            {formulation.formulationCode} · {formulation.name}
          </p>
        )}

        <Divider />

        {loading && <div style={styles.muted}>Loading test workflow...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && results && (
          <div style={styles.sections}>
            <ResultCard
              fields={[
                ['weightG', 'Weight (g)'],
                ['diameterMm', 'Diameter (mm)'],
                ['wallThicknessMm', 'Wall Thickness (mm)'],
                ['roundnessMm', 'Roundness (mm)'],
                ['balanceG', 'Balance (g)'],
                ['bounceCm', 'Bounce (cm)'],
                ['hardnessShorD', 'Hardness (Shore D)'],
                ['compressionKg', 'Compression (kg)'],
                ['deflectionMm', 'Deflection (mm)'],
                ['coefficientOfRestitution', 'Coefficient of Restitution'],
              ]}
              missing={getMissingMetrics('physical', results)}
              saving={saving === 'physical'}
              title="Physical + Performance"
              values={results.physical}
              onSubmit={(payload) => saveSection('physical', payload)}
            />

            <ResultCard
              fields={[
                ['airCannonCycles', 'Air Cannon Cycles'],
                ['crackInitiationCycles', 'Crack Initiation Cycles'],
                ['crackPropagationMm', 'Crack Propagation (mm)'],
                ['deformationMm', 'Deformation (mm)'],
              ]}
              missing={getMissingMetrics('durability', results)}
              saving={saving === 'durability'}
              title="Durability"
              values={results.durability}
              onSubmit={(payload) => saveSection('durability', payload)}
            />

            <ResultCard
              fields={[
                ['hotPerformanceScore', 'Hot Performance'],
                ['coldPerformanceScore', 'Cold Performance'],
                ['humidityPerformanceScore', 'Humidity Performance'],
                ['testTempHotC', 'Hot Test Temp (C)'],
                ['testTempColdC', 'Cold Test Temp (C)'],
                ['testHumidityPct', 'Test Humidity (%)'],
              ]}
              missing={getMissingMetrics('environmental', results)}
              saving={saving === 'environmental'}
              title="Environmental"
              values={results.environmental}
              onSubmit={(payload) => saveSection('environmental', payload)}
            />

            <ResultCard
              fields={[
                ['feelScore', 'Feel'],
                ['soundScore', 'Sound'],
                ['perceivedSpeedScore', 'Perceived Speed'],
                ['perceivedDurabilityScore', 'Perceived Durability'],
              ]}
              missing={getMissingMetrics('subjective', results)}
              saving={saving === 'subjective'}
              title="Subjective"
              values={results.subjective}
              onSubmit={(payload) => saveSection('subjective', payload)}
            />
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

function getMissingMetrics(section: ResultSection, results: FormulationResultsBundle): string[] {
  const data = results[section] as Record<string, unknown> | null;
  return REQUIRED_FIELDS[section].filter((field) => data?.[field] == null);
}

interface ResultCardProps {
  fields: Array<[string, string]>;
  missing: string[];
  onSubmit: (payload: Record<string, number>) => Promise<void>;
  saving: boolean;
  title: string;
  values: object | null;
}

function ResultCard({ fields, missing, onSubmit, saving, title, values }: ResultCardProps) {
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    const typedValues = values as Record<string, unknown> | null;

    for (const [key] of fields) {
      const value = typedValues?.[key];
      next[key] = value == null ? '' : String(value);
    }

    setForm(next);
  }, [fields, values]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = fields.reduce<Record<string, number>>((acc, [key]) => {
      const rawValue = form[key]?.trim();
      if (rawValue) {
        acc[key] = Number(rawValue);
      }
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

      {missing.length > 0 && (
        <MessageBanner tone="warning">
          Missing metrics: {missing.join(', ')}
        </MessageBanner>
      )}

      <div style={styles.grid}>
        {fields.map(([key, label]) => (
          <label key={key} style={controlStyles.field}>
            <span style={controlStyles.fieldLabel}>{label}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              step="0.01"
              style={controlStyles.input}
              type="number"
              value={form[key] ?? ''}
            />
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
