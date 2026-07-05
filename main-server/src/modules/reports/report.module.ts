import { AuditService } from '../audit/audit.service';
import { ReportController } from './controllers/report.controller';
import { ReportRepository } from './repositories/report.repository';
import { createReportRoutes } from './report.routes';
import { ReportExportService } from './services/reportExport.service';
import { ReportService } from './services/report.service';

export function createReportRouter() {
  const repo = new ReportRepository();
  return createReportRoutes(
    new ReportController(
      new ReportService(repo, new AuditService()),
      new ReportExportService(repo)
    )
  );
}
