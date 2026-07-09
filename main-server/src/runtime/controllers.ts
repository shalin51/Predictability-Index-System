import { AuditService } from '../modules/audit/audit.service';
import { HealthController } from '../modules/health/health.controller';
import { HealthService } from '../modules/health/health.service';
import { VersionController } from '../modules/version/version.controller';
import { VersionService } from '../modules/version/version.service';
import { LibraryController } from '../modules/library/library.controller';
import { LibraryRepository } from '../modules/library/library.repository';
import { LibraryService } from '../modules/library/library.service';
import { DashboardController } from '../modules/dashboard/controllers/dashboard.controller';
import { DashboardRepository } from '../modules/dashboard/repositories/dashboard.repository';
import { DashboardService } from '../modules/dashboard/services/dashboard.service';

const auditService = new AuditService();
const libraryRepo = new LibraryRepository();
const dashboardRepo = new DashboardRepository();

export const controllers = {
  health: new HealthController(new HealthService()),
  version: new VersionController(new VersionService()),
  library: new LibraryController(new LibraryService(libraryRepo, auditService)),
  dashboard: new DashboardController(new DashboardService(dashboardRepo)),
};
