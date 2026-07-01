import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  listBenchmarks,
  listFormulations,
  scoreAllBenchmarks,
  type BenchmarkItem,
  type FormulationListItem,
  type ScoreResult,
} from '../../services/api';
import { colors } from '../../theme/tokens';
import {
  HistoryTable,
  MetricTable,
  RiskGrid,
  ScoreCard,
  SummaryCard,
  TrafficBadge,
} from './AnalysisPageSections';
import { analysisPageStyles } from './analysisPageStyles';

type AnalysisTab = 'home' | 'comparison' | 'risks' | 'history';

interface AnalysisPageProps {
  initialFormulationId?: string;
  onViewReport?: (id: string) => void;
}

export function AnalysisPage({ initialFormulationId = '', onViewReport }: AnalysisPageProps) {
  const [formulations, setFormulations] = useState<FormulationListItem[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [selectedFormId, setSelectedFormId] = useState(initialFormulationId);
  const [scores, setScores] = useState<ScoreResult[]>([]);
  const [activeScore, setActiveScore] = useState<ScoreResult | null>(null);
  const [history, setHistory] = useState<Array<{ formulation: FormulationListItem; bestScore: ScoreResult | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AnalysisTab>('home');

  useEffect(() => {
    void Promise.all([listFormulations(), listBenchmarks()])
      .then(([formulationResponse, benchmarkResponse]) => {
        setFormulations(formulationResponse.data);
        setBenchmarks(benchmarkResponse);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setSelectedFormId(initialFormulationId);
  }, [initialFormulationId]);

  useEffect(() => {
    if (formulations.length === 0) {
      return;
    }

    setHistoryLoading(true);

    void Promise.all(
      formulations.slice(0, 10).map(async (formulation) => {
        try {
          const result = await scoreAllBenchmarks(formulation.id);
          return {
            bestScore: result.sort((a, b) => b.overallScore - a.overallScore)[0] ?? null,
            formulation,
          };
        } catch {
          return { bestScore: null, formulation };
        }
      }),
    )
      .then(setHistory)
      .finally(() => setHistoryLoading(false));
  }, [formulations]);

  const analyse = async () => {
    if (!selectedFormId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const results = await scoreAllBenchmarks(selectedFormId);
      setScores(results);
      setActiveScore(results[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const bestScore = scores.slice().sort((a, b) => b.overallScore - a.overallScore)[0] ?? null;
  const riskRows = aggregateRisks(scores);

  return (
    <DashboardPage>
      <Card>
        <h1 style={analysisPageStyles.title}>Predictability Index - Analysis</h1>

        <Divider />

        <div style={analysisPageStyles.selectorRow}>
          <label style={analysisPageStyles.selectorLabel}>Select Formulation</label>
          <div style={analysisPageStyles.selectorControls}>
            <select
              value={selectedFormId}
              onChange={(event) => {
                setSelectedFormId(event.target.value);
                setScores([]);
                setActiveScore(null);
              }}
              style={analysisPageStyles.select}
            >
              <option value="">- choose -</option>
              {formulations.map((formulation) => (
                <option key={formulation.id} value={formulation.id}>
                  {formulation.formulationCode}{formulation.producedDate ? ` - ${formulation.producedDate}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => void analyse()}
              disabled={!selectedFormId || loading}
              style={{ ...controlStyles.primaryButton, opacity: !selectedFormId || loading ? 0.5 : 1 }}
              type="button"
            >
              {loading ? 'Analysing...' : 'Analyse'}
            </button>
            {selectedFormId && onViewReport && (
              <button onClick={() => onViewReport(selectedFormId)} style={controlStyles.secondaryButton} type="button">
                Report
              </button>
            )}
          </div>
        </div>

        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        <Divider />

        <div style={analysisPageStyles.tabs}>
          {(['home', 'comparison', 'risks', 'history'] as AnalysisTab[]).map((tabId) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              style={getTabButtonStyle(tab === tabId)}
              type="button"
            >
              {tabId}
            </button>
          ))}
        </div>

        {tab === 'home' && (
          <>
            <Divider />
            <div style={analysisPageStyles.summaryGrid}>
              <SummaryCard label="Benchmarks Available" value={String(benchmarks.length)} />
              <SummaryCard label="Formulations Tracked" value={String(formulations.length)} />
              <SummaryCard label="Best Score" value={bestScore ? bestScore.overallScore.toFixed(1) : '—'} />
              <SummaryCard label="Production Ready" value={bestScore?.productionReady ? 'Yes' : 'No'} />
            </div>
            {bestScore && (
              <div style={analysisPageStyles.homeScoreWrap}>
                <ScoreCard score={bestScore} />
              </div>
            )}
          </>
        )}

        {tab === 'comparison' && scores.length > 0 && (
          <>
            <Divider />
            <div style={analysisPageStyles.scoreList}>
              {scores.map((score) => (
                <div
                  key={score.benchmarkId}
                  onClick={() => setActiveScore(score)}
                  style={{
                    ...analysisPageStyles.scoreCard,
                    border: `2px solid ${activeScore?.benchmarkId === score.benchmarkId ? colors.accent : colors.border}`,
                    cursor: 'pointer',
                  }}
                >
                  <ScoreCard score={score} />
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'comparison' && activeScore && (
          <>
            <Divider />
            <div style={analysisPageStyles.comparisonHeader}>
              <div style={analysisPageStyles.comparisonHeaderRow}>
                <span style={analysisPageStyles.comparisonTitle}>vs {activeScore.benchmarkSimilarity.benchmarkName}</span>
                <TrafficBadge status={activeScore.trafficLight} />
                {activeScore.productionReady && (
                  <span style={analysisPageStyles.productionReady}>Production Ready</span>
                )}
              </div>

              {activeScore.benchmarkSimilarity.missingMetrics.length > 0 && (
                <MessageBanner tone="warning">
                  Missing test data: {activeScore.benchmarkSimilarity.missingMetrics.join(', ')}
                </MessageBanner>
              )}
            </div>

            <MetricTable metrics={activeScore.metricScores} />
          </>
        )}

        {tab === 'risks' && (
          <>
            <Divider />
            <RiskGrid risks={riskRows} />
          </>
        )}

        {tab === 'history' && (
          <>
            <Divider />
            {historyLoading ? (
              <div style={analysisPageStyles.muted}>Loading historical comparison...</div>
            ) : (
              <HistoryTable history={history} />
            )}
          </>
        )}

        {benchmarks.length > 0 && scores.length === 0 && tab === 'comparison' && (
          <>
            <Divider />
            <div style={analysisPageStyles.muted}>
              {benchmarks.length} benchmark profile{benchmarks.length !== 1 ? 's' : ''} available: {benchmarks.map((benchmark) => benchmark.name).join(', ')}
            </div>
          </>
        )}
      </Card>
    </DashboardPage>
  );
}

function aggregateRisks(scores: ScoreResult[]): Array<{ name: string; count: number }> {
  const counts = scores
    .flatMap((score) => score.keyRisks)
    .reduce<Record<string, number>>((acc, risk) => {
      acc[risk] = (acc[risk] ?? 0) + 1;
      return acc;
    }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({ count, name }))
    .sort((a, b) => b.count - a.count);
}
