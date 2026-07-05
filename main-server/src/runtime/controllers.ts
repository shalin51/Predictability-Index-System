import { AuditService } from '../modules/audit/audit.service';
import { HealthController } from '../modules/health/health.controller';
import { HealthService } from '../modules/health/health.service';
import { VersionController } from '../modules/version/version.controller';
import { VersionService } from '../modules/version/version.service';
import { LibraryController } from '../modules/library/library.controller';
import { LibraryRepository } from '../modules/library/library.repository';
import { LibraryService } from '../modules/library/library.service';

const auditService = new AuditService();
const libraryRepo = new LibraryRepository();

export const controllers = {
  health: new HealthController(new HealthService()),
  version: new VersionController(new VersionService()),
  library: new LibraryController(new LibraryService(libraryRepo, auditService)),
};
