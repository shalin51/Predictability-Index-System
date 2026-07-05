import { Router } from 'express';
import { AuditService } from '../audit/audit.service';
import { EnvironmentalResultController } from './controllers/environmentalResult.controller';
import { LabTestingController } from './controllers/labTesting.controller';
import { ObservationController } from './controllers/observation.controller';
import { SampleResultController } from './controllers/sampleResult.controller';
import { SubjectiveRatingController } from './controllers/subjectiveRating.controller';
import { EnvironmentalResultRepository } from './repositories/environmentalResult.repository';
import { LabTestingRepository } from './repositories/labTesting.repository';
import { ObservationRepository } from './repositories/observation.repository';
import { SampleResultRepository } from './repositories/sampleResult.repository';
import { SubjectiveRatingRepository } from './repositories/subjectiveRating.repository';
import { EnvironmentalResultService } from './services/environmentalResult.service';
import { LabTestingService } from './services/labTesting.service';
import { ObservationService } from './services/observation.service';
import { SampleResultService } from './services/sampleResult.service';
import { SubjectiveRatingService } from './services/subjectiveRating.service';

export function createLabTestingRouter() {
  const router = Router();
  const auditService = new AuditService();
  const labRepo = new LabTestingRepository();
  const labController = new LabTestingController(new LabTestingService(labRepo, auditService));
  const sampleResultController = new SampleResultController(new SampleResultService(new SampleResultRepository(), labRepo, auditService));
  const observationController = new ObservationController(new ObservationService(new ObservationRepository(), labRepo, auditService));
  const environmentalController = new EnvironmentalResultController(new EnvironmentalResultService(new EnvironmentalResultRepository(), labRepo, auditService));
  const subjectiveController = new SubjectiveRatingController(new SubjectiveRatingService(new SubjectiveRatingRepository(), labRepo, auditService));

  router.get('/queue', (req, res) => labController.queue(req, res));
  router.get('/runs/:runId', (req, res) => labController.run(req, res));
  router.get('/runs/:runId/samples', (req, res) => labController.samples(req, res));
  router.get('/runs/:runId/results', (req, res) => labController.results(req, res));
  router.post('/results', (req, res) => sampleResultController.create(req, res));
  router.patch('/results/:resultId', (req, res) => sampleResultController.update(req, res));
  router.post('/observations', (req, res) => observationController.create(req, res));
  router.patch('/observations/:observationId', (req, res) => observationController.update(req, res));
  router.post('/environmental-results', (req, res) => environmentalController.create(req, res));
  router.patch('/environmental-results/:resultId', (req, res) => environmentalController.update(req, res));
  router.post('/subjective-ratings', (req, res) => subjectiveController.create(req, res));
  router.patch('/subjective-ratings/:ratingId', (req, res) => subjectiveController.update(req, res));
  router.post('/runs/:runId/start', (req, res) => labController.start(req, res));
  router.post('/runs/:runId/complete', (req, res) => labController.complete(req, res));

  return router;
}
