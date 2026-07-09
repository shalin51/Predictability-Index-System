import { DashboardHomePage } from '../../pages/dashboard/DashboardPage';

export function DashboardLandingPage({
  onOpenLabRun,
  onOpenProductionRun,
  onOpenReport,
}: {
  onOpenLabRun: (id: string) => void;
  onOpenProductionRun: (id: string) => void;
  onOpenReport: (id: string) => void;
}) {
  return (
    <DashboardHomePage
      onOpenLabRun={onOpenLabRun}
      onOpenProductionRun={onOpenProductionRun}
      onOpenReport={onOpenReport}
    />
  );
}
