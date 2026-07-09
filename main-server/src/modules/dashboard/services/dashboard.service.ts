import type { DashboardRepository } from '../repositories/dashboard.repository';
import type { DashboardOverview } from '../dashboard.types';

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  summary() {
    return this.repo.summary();
  }

  workflowStatus() {
    return this.repo.workflowStatus();
  }

  labQueue() {
    return this.repo.labQueue();
  }

  latestScores() {
    return this.repo.latestScores();
  }

  riskAlerts() {
    return this.repo.riskAlerts();
  }

  recentReports() {
    return this.repo.recentReports();
  }

  benchmarkOverview() {
    return this.repo.benchmarkOverview();
  }

  async overview(): Promise<DashboardOverview> {
    const [summary, workflowStatus, labQueue, latestScores, riskAlerts, recentReports, benchmarkOverview] = await Promise.all([
      this.summary(),
      this.workflowStatus(),
      this.labQueue(),
      this.latestScores(),
      this.riskAlerts(),
      this.recentReports(),
      this.benchmarkOverview(),
    ]);

    return {
      benchmarkOverview,
      labQueue,
      latestScores,
      recentReports,
      riskAlerts,
      summary,
      workflowStatus,
    };
  }
}
