import type { ReactNode } from 'react';
import type { DashboardSimilarityAnalysis } from '../../../services/api';
import { dashboardStyles, formatDashValue } from './dashboardFormat';

export function SimilarityAnalysisPanel({ analysis }: { analysis: DashboardSimilarityAnalysis | null }) {
  if (!analysis) return null;
  const bestCandidate = analysis.candidates[0];
  if (!bestCandidate) return null;
  const runnerUp = analysis.candidates[1];
  const largestGap = analysis.metrics[0];
  const closestMetric = [...analysis.metrics].sort((left, right) => Math.abs(left.signedDeviationPercent) - Math.abs(right.signedDeviationPercent))[0];
  const pointerPosition = Math.min(96, Math.max(2, (bestCandidate.weightedDeviationPercent / 15) * 100));

  return (
    <section className="predictive-index" aria-labelledby="predictive-index-title">
      <div className="predictive-index__heading">
        <div>
          <p className="predictive-index__eyebrow">Weighted similarity analysis</p>
          <h2 id="predictive-index-title">Predictive Index - {analysis.targetName}</h2>
          <p>Decision support based on the available weighted performance measurements.</p>
        </div>
        <span className="predictive-index__confidence">Analysis coverage <strong>{analysis.metrics.length} / 7 metrics</strong></span>
      </div>

      <div className="predictive-index__matches">
        <MatchCard label="Closest overall match" score={`${bestCandidate.weightedDeviationPercent.toFixed(2)}%`} tone="green" recommendation={bestCandidate.candidateName} />
        <MatchCard label="Second closest match" score={runnerUp ? `${runnerUp.weightedDeviationPercent.toFixed(2)}%` : '-'} tone="yellow" recommendation={runnerUp?.candidateName ?? 'No second-ranked candidate'} />
        <div className="predictive-index__data-card">
          <span>Ranked candidates</span>
          <strong>{analysis.candidates.length} <small>/ {analysis.candidateCount}</small></strong>
          <p>Lower weighted deviation means a closer match to {analysis.targetName}.</p>
        </div>
      </div>

      <div className="predictive-index__section">
        <div className="predictive-index__section-head">
          <div>
            <h3>Weighted similarity position</h3>
            <p>Position is based on the closest candidate's weighted deviation from the benchmark target.</p>
          </div>
          <span className="predictive-index__range-label">{bestCandidate.candidateName}</span>
        </div>
        <div className="predictive-index__scale" aria-label={`${bestCandidate.candidateName} has ${bestCandidate.weightedDeviationPercent.toFixed(2)} percent weighted deviation from ${analysis.targetName}`}>
          <div className="predictive-index__scale-labels"><span>Exact match</span><span>Close</span><span>Moderate gap</span><span>Higher gap</span></div>
          <div className="predictive-index__rail">
            <span className="predictive-index__zone predictive-index__zone--b" style={{ left: '0%', width: '33%' }} />
            <span className="predictive-index__zone predictive-index__zone--a" style={{ left: '33%', width: '34%' }} />
            <span className="predictive-index__pointer" style={{ left: `calc(${pointerPosition}% - 7px)` }} />
          </div>
        </div>
      </div>

      <div className="predictive-index__details">
        <div className="predictive-index__section">
          <div className="predictive-index__section-head"><div><h3>Top weighted drivers</h3><p>Measurements contributing most to the current gap from {analysis.targetName}.</p></div></div>
          <div className="predictive-index__table-wrap">
            <table className="predictive-index__table">
              <thead><tr><th>#</th><th>Metric</th><th>Result</th><th>Target</th><th>Contribution</th></tr></thead>
              <tbody>{analysis.metrics.map((metric, index) => <tr key={metric.metricName}><td>{index + 1}</td><td>{metric.metricName}</td><td>{formatDashValue(metric.candidateMean)}</td><td>{formatDashValue(metric.targetMean)}</td><td><Impact contribution={metric.weightedDeviationPoints} deviation={metric.signedDeviationPercent} /></td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <aside className="predictive-index__insight">
          <p className="predictive-index__eyebrow">Analysis insight</p>
          <dl>
            <div><dt>Closest overall match</dt><dd>{bestCandidate.candidateName}</dd></div>
            <div><dt>Largest remaining gap</dt><dd>{largestGap?.metricName ?? '-'}</dd></div>
            <div><dt>Closest metric alignment</dt><dd>{closestMetric?.metricName ?? '-'}</dd></div>
          </dl>
        </aside>
      </div>

      <div className="predictive-index__section">
        <AnalysisTable title="Ranked candidates" columns={['Rank', 'Candidate', 'Weighted deviation']}>
          {analysis.candidates.map((candidate) => (
            <tr key={candidate.candidateName}>
              <td style={dashboardStyles.td}>{formatDashValue(candidate.rank)}</td>
              <td style={dashboardStyles.td}>{candidate.candidateName}{candidate.confidenceNote && <small style={{ display: 'block' }}>{candidate.confidenceNote}</small>}</td>
              <td style={dashboardStyles.td}>{candidate.weightedDeviationPercent.toFixed(2)}%</td>
            </tr>
          ))}
        </AnalysisTable>
      </div>
    </section>
  );
}

function MatchCard({ label, recommendation, score, tone }: { label: string; recommendation: string; score: string; tone: 'green' | 'yellow' }) {
  return <div className={`predictive-index__match predictive-index__match--${tone}`}><span>{label}</span><strong><i aria-hidden="true" />{score}</strong><p>{recommendation}</p></div>;
}

function Impact({ contribution, deviation }: { contribution: number; deviation: number }) {
  const absoluteDeviation = Math.abs(deviation);
  const tone = contribution >= 0.4 ? 'red' : contribution >= 0.15 ? 'yellow' : 'green';
  const label = contribution >= 0.4 ? 'Largest gap' : contribution >= 0.15 ? 'Watch' : 'Aligned';
  return <span className={`predictive-index__impact predictive-index__impact--${tone}`}><b>{absoluteDeviation.toFixed(2)}%</b>{label}</span>;
}

function AnalysisTable({ children, columns, title }: { children: ReactNode; columns: string[]; title: string }) {
  return (
    <section style={dashboardStyles.stack}>
      <h3 style={dashboardStyles.sectionTitle}>{title}</h3>
      <div style={dashboardStyles.tableWrap}>
        <table style={dashboardStyles.table}>
          <thead><tr>{columns.map((column) => <th key={column} style={dashboardStyles.th}>{column}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}
