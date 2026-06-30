import type {
  FormulationDetail,
  GeneratedReportDto,
} from '../../services/api';
import type {
  AdjustmentRecommendation,
  HistoricalAnalysisRow,
  SimilaritySummary,
  TrendSnapshot,
} from '../analysis/analysisInsights';
import { formatDateLabel, formatDateTimeLabel, getLatestTestedAt } from '../analysis/analysisInsights';

interface DownloadReportOptions {
  adjustments: AdjustmentRecommendation[];
  formulation: FormulationDetail;
  history: HistoricalAnalysisRow[];
  report: GeneratedReportDto;
  similarityScores: SimilaritySummary[];
  trend: TrendSnapshot;
}

export function downloadRichReport({
  adjustments,
  formulation,
  history,
  report,
  similarityScores,
  trend,
}: DownloadReportOptions) {
  const html = buildReportDocument({
    adjustments,
    formulation,
    history,
    report,
    similarityScores,
    trend,
  });
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${report.formulationCode}-report.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildReportDocument({
  adjustments,
  formulation,
  history,
  report,
  similarityScores,
  trend,
}: DownloadReportOptions): string {
  const bestScore = report.benchmarkResults
    .map((entry) => entry.scoreResult)
    .sort((left, right) => right.overallScore - left.overallScore)[0] ?? null;
  const testedAt = getLatestTestedAt(report.testData);
  const historicalRows = history
    .filter((row) => row.formulation.id !== formulation.id)
    .slice(0, 10)
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.formulation.formulationCode)}</td>
        <td>${escapeHtml(formatDateLabel(row.formulation.producedDate ?? row.formulation.createdAt))}</td>
        <td>${escapeHtml(row.bestScore?.benchmarkSimilarity.benchmarkName ?? 'Unavailable')}</td>
        <td>${row.bestScore ? row.bestScore.overallScore.toFixed(1) : '—'}</td>
      </tr>
    `)
    .join('');

  const similarityList = similarityScores
    .map((score) => `<li><strong>${escapeHtml(score.label)}:</strong> ${score.similarity.toFixed(1)}% (${escapeHtml(score.benchmarkName)})</li>`)
    .join('');
  const riskList = report.executiveSummary.topRisks
    .map((risk) => `<li>${escapeHtml(risk)}</li>`)
    .join('');
  const recommendationList = report.recommendations
    .map((recommendation) => `<li>${escapeHtml(recommendation)}</li>`)
    .join('');
  const adjustmentList = adjustments
    .map((adjustment) => `<li>${escapeHtml(adjustment.detail)}</li>`)
    .join('');
  const benchmarkRows = report.benchmarkResults
    .map((entry) => `
      <tr>
        <td>${escapeHtml(entry.benchmark.name)}</td>
        <td>${entry.scoreResult.overallScore.toFixed(1)}</td>
        <td>${entry.scoreResult.similarity.toFixed(1)}%</td>
        <td>${escapeHtml(entry.scoreResult.trafficLight)}</td>
      </tr>
    `)
    .join('');
  const testSections = [
    ['Physical + Performance', report.testData.physical],
    ['Durability', report.testData.durability],
    ['Environmental', report.testData.environmental],
    ['Subjective', report.testData.subjective],
  ]
    .map(([title, value]) => `
      <section class="card">
        <h3>${escapeHtml(String(title))}</h3>
        <pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>
      </section>
    `)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.formulationCode)} report</title>
  <style>
    body { background:#0b1220; color:#e5eef7; font-family:Segoe UI, Arial, sans-serif; margin:0; padding:32px; }
    h1,h2,h3 { margin:0 0 12px; }
    p,li,td,th { line-height:1.5; }
    .page { display:grid; gap:24px; }
    .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); }
    .card { background:#111b2e; border:1px solid #24324d; border-radius:16px; padding:16px; }
    .muted { color:#9eb0cc; }
    .section { display:grid; gap:12px; }
    table { border-collapse:collapse; width:100%; }
    th,td { border-bottom:1px solid #24324d; padding:8px; text-align:left; vertical-align:top; }
    pre { white-space:pre-wrap; word-break:break-word; }
  </style>
</head>
<body>
  <div class="page">
    <section class="card section">
      <div class="muted">Executive Summary</div>
      <h1>${escapeHtml(report.formulationCode)} · ${escapeHtml(report.formulationName)}</h1>
      <p>${escapeHtml(report.executiveSummary.verdict)}</p>
      <div class="grid">
        <div class="card"><div class="muted">Formulation ID</div><div>${escapeHtml(formulation.formulationCode)}</div></div>
        <div class="card"><div class="muted">Date Tested</div><div>${escapeHtml(formatDateLabel(testedAt))}</div></div>
        <div class="card"><div class="muted">Predictability Index</div><div>${report.executiveSummary.predictabilityScore.toFixed(1)}</div></div>
        <div class="card"><div class="muted">Traffic Light</div><div>${escapeHtml(report.executiveSummary.trafficLight)}</div></div>
        <div class="card"><div class="muted">Generated</div><div>${escapeHtml(formatDateTimeLabel(report.generatedAt))}</div></div>
        <div class="card"><div class="muted">Best Benchmark</div><div>${escapeHtml(bestScore?.benchmarkSimilarity.benchmarkName ?? 'Unavailable')}</div></div>
      </div>
      <div class="card">
        <h2>Similarity Scores</h2>
        <ul>${similarityList}</ul>
      </div>
      <div class="card">
        <h2>Key Risks</h2>
        <ul>${riskList}</ul>
      </div>
    </section>
    <section class="card section">
      <div class="muted">Detailed Analysis</div>
      <div class="card">
        <h2>Benchmark Comparison</h2>
        <table>
          <thead>
            <tr><th>Benchmark</th><th>Score</th><th>Similarity</th><th>Traffic</th></tr>
          </thead>
          <tbody>${benchmarkRows}</tbody>
        </table>
      </div>
      <div class="section">
        <h2>Test Results</h2>
        ${testSections}
      </div>
      <div class="card">
        <h2>Historical Comparison</h2>
        <table>
          <thead>
            <tr><th>Formulation</th><th>Produced</th><th>Best Benchmark</th><th>Best Score</th></tr>
          </thead>
          <tbody>${historicalRows}</tbody>
        </table>
      </div>
      <div class="grid">
        <div class="card"><div class="muted">Recent Average</div><div>${trend.averageBestScore.toFixed(1)}</div></div>
        <div class="card"><div class="muted">Previous Average</div><div>${trend.previousAverageBestScore == null ? '—' : trend.previousAverageBestScore.toFixed(1)}</div></div>
        <div class="card"><div class="muted">Direction</div><div>${escapeHtml(trend.direction)}</div></div>
        <div class="card"><div class="muted">Production Ready</div><div>${trend.productionReadyRatio}%</div></div>
      </div>
      <div class="card">
        <h2>Recommended Formulation Adjustments</h2>
        <ul>${adjustmentList}</ul>
      </div>
      <div class="card">
        <h2>System Recommendations</h2>
        <ul>${recommendationList}</ul>
      </div>
    </section>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
