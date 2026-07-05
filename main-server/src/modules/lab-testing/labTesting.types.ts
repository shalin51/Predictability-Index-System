export type LabMetricCategory = 'physical' | 'performance' | 'durability' | 'environmental' | 'subjective';

export interface LabTestingQueueQuery {
  dateProduced?: string;
  machineId?: string;
  missingResults?: string;
  moldId?: string;
  search?: string;
  status?: 'ready_for_testing' | 'testing' | 'all';
  targetBenchmarkId?: string;
}

export interface LabTestingRecord {
  [key: string]: unknown;
  id: string;
}

export interface SampleResultInput {
  auditReason?: string;
  metricId: string;
  sampleId: string;
  testMethodId?: string | null;
  testedAt?: string;
  testedBy?: string;
  unit?: string;
  valueNumeric: number;
}

export interface ObservationInput {
  auditReason?: string;
  observationText: string;
  observationType?: string;
  observedAt?: string;
  observedBy?: string;
  sampleId: string;
}

export interface EnvironmentalResultInput extends SampleResultInput {
  testConditionId?: string | null;
}

export interface SubjectiveRatingInput {
  auditReason?: string;
  feedbackText?: string | null;
  metricId?: string | null;
  ratedAt?: string;
  ratedBy?: string;
  ratingValue?: number | null;
  sampleId: string;
}
