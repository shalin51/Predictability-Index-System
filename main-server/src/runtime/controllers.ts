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
import { FormulationController } from '../modules/formulations/formulation.controller';
import { FormulationRepository } from '../modules/formulations/formulation.repository';
import { FormulationService } from '../modules/formulations/formulation.service';
import { LabTestingController } from '../modules/lab-testing/controllers/labTesting.controller';
import { EnvironmentalResultController } from '../modules/lab-testing/controllers/environmentalResult.controller';
import { ObservationController } from '../modules/lab-testing/controllers/observation.controller';
import { SampleResultController } from '../modules/lab-testing/controllers/sampleResult.controller';
import { SubjectiveRatingController } from '../modules/lab-testing/controllers/subjectiveRating.controller';
import { EnvironmentalResultRepository } from '../modules/lab-testing/repositories/environmentalResult.repository';
import { LabTestingRepository } from '../modules/lab-testing/repositories/labTesting.repository';
import { ObservationRepository } from '../modules/lab-testing/repositories/observation.repository';
import { SampleResultRepository } from '../modules/lab-testing/repositories/sampleResult.repository';
import { SubjectiveRatingRepository } from '../modules/lab-testing/repositories/subjectiveRating.repository';
import { EnvironmentalResultService } from '../modules/lab-testing/services/environmentalResult.service';
import { LabTestingService } from '../modules/lab-testing/services/labTesting.service';
import { ObservationService } from '../modules/lab-testing/services/observation.service';
import { SampleResultService } from '../modules/lab-testing/services/sampleResult.service';
import { SubjectiveRatingService } from '../modules/lab-testing/services/subjectiveRating.service';
import { ProductionRunController } from '../modules/production-runs/productionRun.controller';
import { ProductionRunRepository } from '../modules/production-runs/productionRun.repository';
import { ProductionRunService } from '../modules/production-runs/productionRun.service';
import { SampleController } from '../modules/production-runs/sample.controller';
import { SampleRepository } from '../modules/production-runs/sample.repository';
import { SampleService } from '../modules/production-runs/sample.service';
import { RunSummaryController } from '../modules/run-summaries/controllers/runSummary.controller';
import { RunSummaryRepository } from '../modules/run-summaries/repositories/runSummary.repository';
import { RunSummaryService } from '../modules/run-summaries/services/runSummary.service';
import { BenchmarkScoringController } from '../modules/benchmark-scoring/controllers/benchmarkScoring.controller';
import { BenchmarkScoringRepository } from '../modules/benchmark-scoring/repositories/benchmarkScoring.repository';
import { BenchmarkScoringService } from '../modules/benchmark-scoring/services/benchmarkScoring.service';
import { PerformanceDistanceService } from '../modules/benchmark-scoring/services/performanceDistance.service';
import { ReportController } from '../modules/reports/controllers/report.controller';
import { ReportRepository } from '../modules/reports/repositories/report.repository';
import { ReportExportService } from '../modules/reports/services/reportExport.service';
import { ReportService } from '../modules/reports/services/report.service';
import { createProcessSetupController } from '../modules/process-setups/processSetup.module';

const auditService = new AuditService();
const libraryRepo = new LibraryRepository();
const dashboardRepo = new DashboardRepository();
const productionRunSampleRepo = new SampleRepository();
const labTestingRepo = new LabTestingRepository();
const reportRepo = new ReportRepository();

export const controllers = {
  health: new HealthController(new HealthService()),
  version: new VersionController(new VersionService()),
  library: new LibraryController(new LibraryService(libraryRepo, auditService)),
  dashboard: new DashboardController(new DashboardService(dashboardRepo)),
  formulations: new FormulationController(new FormulationService(new FormulationRepository(), auditService)),
  productionRuns: new ProductionRunController(new ProductionRunService(new ProductionRunRepository(), productionRunSampleRepo, auditService)),
  samples: new SampleController(new SampleService(productionRunSampleRepo, auditService)),
  labTesting: new LabTestingController(new LabTestingService(labTestingRepo, auditService)),
  sampleResults: new SampleResultController(new SampleResultService(new SampleResultRepository(), labTestingRepo, auditService)),
  observations: new ObservationController(new ObservationService(new ObservationRepository(), labTestingRepo, auditService)),
  environmentalResults: new EnvironmentalResultController(new EnvironmentalResultService(new EnvironmentalResultRepository(), labTestingRepo, auditService)),
  subjectiveRatings: new SubjectiveRatingController(new SubjectiveRatingService(new SubjectiveRatingRepository(), labTestingRepo, auditService)),
  runSummaries: new RunSummaryController(new RunSummaryService(new RunSummaryRepository(), auditService)),
  benchmarkScoring: new BenchmarkScoringController(
    new BenchmarkScoringService(new BenchmarkScoringRepository(), new PerformanceDistanceService(), auditService)
  ),
  reports: new ReportController(new ReportService(reportRepo, auditService), new ReportExportService(reportRepo)),
  processSetups: createProcessSetupController(),
};
