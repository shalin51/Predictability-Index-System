import { DashboardPage } from '../../components/ui/Page';
import { WorkspacePlaceholderPage } from '../workspace/WorkspacePlaceholderPage';

export function DashboardLandingPage() {
  return (
    <DashboardPage maxWidth={1200}>
      <WorkspacePlaceholderPage
        description="Ready for the replacement details."
        highlights={[
          'No previous setup is wired',
          'No previous targets are wired',
          'New data model can be added cleanly',
        ]}
        title="Workspace"
      />
    </DashboardPage>
  );
}
