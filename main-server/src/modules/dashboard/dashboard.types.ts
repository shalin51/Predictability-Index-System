export interface DashboardRecord {
  [key: string]: unknown;
}

export interface DashboardSummary {
  activeFormulations: number;
  runsReadyForTesting: number;
  runsAwaitingSummary: number;
  runsAwaitingScoring: number;
  scoredRuns: number;
  greenCandidates: number;
  yellowCandidates: number;
  redCandidates: number;
}

export interface DashboardOverview {
  benchmarkOverview: DashboardRecord;
  labQueue: DashboardRecord[];
  latestScores: DashboardRecord[];
  recentReports: DashboardRecord[];
  riskAlerts: DashboardRecord[];
  summary: DashboardSummary;
  workflowStatus: DashboardRecord[];
}
