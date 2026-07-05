import { controlStyles } from '../../../components/ui/controls';
import { reportExportUrl } from '../../../services/api';
import { reportStyles } from './reportFormat';

export function ReportExportActions({ reportId, runId, onRegenerate }: { reportId?: string; runId?: string; onRegenerate?: (runId: string) => void }) {
  return (
    <div style={reportStyles.header}>
      <div style={{ ...reportStyles.header, justifyContent: 'flex-start' }}>
        {reportId && <a href={reportExportUrl(reportId, 'pdf')} style={controlStyles.secondaryButton}>Download PDF</a>}
        {reportId && <a href={reportExportUrl(reportId, 'csv')} style={controlStyles.secondaryButton}>Download CSV</a>}
        {runId && onRegenerate && <button onClick={() => onRegenerate(runId)} style={controlStyles.secondaryButton} type="button">Regenerate</button>}
      </div>
    </div>
  );
}
