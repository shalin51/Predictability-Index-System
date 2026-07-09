import { DashboardController } from './controllers/dashboard.controller';
import { createDashboardRoutes } from './dashboard.routes';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardService } from './services/dashboard.service';

export function createDashboardRouter() {
  return createDashboardRoutes(
    new DashboardController(
      new DashboardService(new DashboardRepository())
    )
  );
}
