import { DashboardHomePage } from '../../pages/dashboard/DashboardPage';

export function DashboardLandingPage({
  autoRefresh,
}: {
  autoRefresh?: boolean;
}) {
  return (
    <DashboardHomePage
      autoRefresh={autoRefresh}
    />
  );
}
