import { DashboardHomePage } from '../../pages/dashboard/DashboardPage';

export function DashboardLandingPage({
  autoRefresh,
  onOpenLabRun,
  onOpenProductionRun,
  onOpenReport,
}: {
  autoRefresh?: boolean;
  onOpenLabRun: (id: string) => void;
  onOpenProductionRun: (id: string) => void;
  onOpenReport: (id: string) => void;
}) {
  return (
    <DashboardHomePage
      autoRefresh={autoRefresh}
      onOpenLabRun={onOpenLabRun}
      onOpenProductionRun={onOpenProductionRun}
      onOpenReport={onOpenReport}
    />
  );
}
