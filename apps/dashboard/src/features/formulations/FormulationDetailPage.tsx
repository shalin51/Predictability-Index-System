import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  getFormulation,
  getFormulationResults,
  scoreAllBenchmarks,
  type FormulationDetail,
  type FormulationResultsBundle,
  type ScoreResult,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';
import { FormulationSummaryPanel, SimilarityScoresPanel, TrafficLightIndicatorCard } from '../analysis/AnalysisPanels';
import { buildSimilaritySummaries, getBestScore, getLatestTestedAt } from '../analysis/analysisInsights';

interface FormulationDetailPageProps {
  formulationId: string;
  onAnalyse: (id: string) => void;
  onBack: () => void;
  onEdit: (id: string) => void;
  onReport: (id: string) => void;
  onTestResults: (id: string) => void;
}

export function FormulationDetailPage({
  formulationId,
  onAnalyse,
  onBack,
  onEdit,
  onReport,
  onTestResults,
}: FormulationDetailPageProps) {
  const [data, setData] = useState<FormulationDetail | null>(null);
  const [results, setResults] = useState<FormulationResultsBundle | null>(null);
  const [scores, setScores] = useState<ScoreResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    void Promise.all([
      getFormulation(formulationId),
      getFormulationResults(formulationId),
      scoreAllBenchmarks(formulationId).catch(() => []),
    ])
      .then(([formulation, formulationResults, formulationScores]) => {
        setData(formulation);
        setResults(formulationResults);
        setScores(formulationScores.slice().sort((left, right) => right.overallScore - left.overallScore));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formulationId]);

  const bestScore = getBestScore(scores);
  const similarityScores = buildSimilaritySummaries(scores).slice(0, 2);
  const testedAt = getLatestTestedAt(results);

  return (
    <DashboardPage>
      <Card>
        <div style={styles.header}>
          <button onClick={onBack} style={controlStyles.secondaryButton} type="button">
            Back
          </button>
          {data && (
            <div style={controlStyles.actionRow}>
              <button onClick={() => onTestResults(data.id)} style={controlStyles.secondaryButton} type="button">
                Test Results
              </button>
              <button onClick={() => onAnalyse(data.id)} style={controlStyles.secondaryButton} type="button">
                Analyse
              </button>
              <button onClick={() => onReport(data.id)} style={controlStyles.secondaryButton} type="button">
                Report
              </button>
              <button onClick={() => onEdit(data.id)} style={controlStyles.primaryButton} type="button">
                Edit
              </button>
            </div>
          )}
        </div>

        {loading && <div style={styles.muted}>Loading formulation...</div>}
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {!loading && !error && data && (
          <>
            <h1 style={styles.title}>{data.formulationCode}</h1>
            <p style={styles.subtitle}>{data.name}</p>

            <Divider />

            <div style={styles.analysisGrid}>
              <FormulationSummaryPanel
                formulationId={data.formulationCode}
                predictabilityIndex={bestScore?.overallScore ?? null}
                testedAt={testedAt}
              />
              <TrafficLightIndicatorCard
                benchmarkName={bestScore?.benchmarkSimilarity.benchmarkName}
                trafficLight={bestScore?.trafficLight ?? null}
              />
            </div>

            {similarityScores.length > 0 && (
              <>
                <section style={styles.section}>
                  <h2 style={styles.sectionTitle}>Similarity Scores</h2>
                  <SimilarityScoresPanel scores={similarityScores} />
                </section>
                <Divider />
              </>
            )}

            <div style={styles.grid}>
              <Info label="Status" value={data.status} />
              <Info label="Version" value={String(data.version)} />
              <Info label="Produced Date" value={data.producedDate ?? '—'} />
              <Info label="Lot Number" value={data.lotNumber ?? '—'} />
              <Info label="Batch Size" value={data.batchSizeKg != null ? `${data.batchSizeKg} kg` : '—'} />
              <Info label="Created By" value={data.createdBy} />
            </div>

            <Divider />

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Description</h2>
              <p style={styles.body}>{data.description ?? 'No description provided.'}</p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Notes</h2>
              <p style={styles.body}>{data.notes ?? 'No notes provided.'}</p>
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Materials</h2>
              {data.materials && data.materials.length > 0 ? (
                <div style={styles.materials}>
                  {data.materials.map((material) => (
                    <div key={`${material.materialId}-${material.materialName}`} style={styles.materialCard}>
                      <div style={styles.materialName}>{material.materialName}</div>
                      <div style={styles.materialMeta}>{material.percentage}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.body}>No materials attached yet.</p>
              )}
            </section>
          </>
        )}
      </Card>
    </DashboardPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  body: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.6,
    margin: 0,
  },
  analysisGrid: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    marginBottom: spacing.md,
  },
  grid: {
    display: 'grid',
    gap: spacing.md,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  header: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  materials: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  materialCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  materialMeta: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    marginTop: 4,
  },
  materialName: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: font.size.md,
    margin: 0,
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
  value: {
    color: colors.text.primary,
    fontSize: font.size.sm,
    marginTop: 4,
    textTransform: 'capitalize',
  },
};
