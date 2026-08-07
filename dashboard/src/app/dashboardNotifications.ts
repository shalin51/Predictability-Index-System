import type { ShellNotification } from '../components/shell/AppShell';
import type { DashboardOverview } from '../services/api';

export function createDashboardNotifications(data: DashboardOverview, now = new Date()): ShellNotification[] {
  return [
    ...data.riskAlerts.map((alert) => ({
      id: `risk-${alert.scoreReportId}-${alert.metricName}`,
      title: `${alert.metricName} risk on ${alert.runCode}`,
      detail: alert.risk,
      timeLabel: formatRelativeTime(alert.generatedAt, now),
      tone: 'warning' as const,
      read: false,
    })),
    ...data.labQueue.map((run) => ({
      id: `lab-${run.id}`,
      title: `${run.runCode} is ${run.status === 'testing' ? 'in testing' : 'ready for testing'}`,
      detail: `${run.missingRequiredMetrics} required results remaining for ${run.formulation}.`,
      timeLabel: 'Current',
      tone: run.missingRequiredMetrics > 0 ? 'info' as const : 'success' as const,
      read: false,
    })),
    ...workflowNotifications(data),
  ];
}

function workflowNotifications(data: DashboardOverview): ShellNotification[] {
  const notifications: ShellNotification[] = [];
  if (data.summary.runsAwaitingSummary > 0) {
    notifications.push({
      id: 'runs-awaiting-summary',
      title: 'Run summaries are ready',
      detail: `${data.summary.runsAwaitingSummary} completed run${data.summary.runsAwaitingSummary === 1 ? '' : 's'} need metric summaries.`,
      timeLabel: 'Current',
      tone: 'info',
      read: false,
    });
  }
  if (data.summary.runsAwaitingScoring > 0) {
    notifications.push({
      id: 'runs-awaiting-scoring',
      title: 'Runs are ready for scoring',
      detail: `${data.summary.runsAwaitingScoring} run${data.summary.runsAwaitingScoring === 1 ? '' : 's'} have summaries and need benchmark scoring.`,
      timeLabel: 'Current',
      tone: 'info',
      read: false,
    });
  }
  return notifications;
}

function formatRelativeTime(value: string, now: Date): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Current';
  const minutes = Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
