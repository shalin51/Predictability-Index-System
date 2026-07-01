// ── Formulation domain types ─────────────────────────────────

export type FormulationStatus = 'draft' | 'testing' | 'approved' | 'rejected' | 'archived';

export interface ResinComponent {
  materialId: string;
  resinComponent: string;
  percentComposition: number;
  materialSupplier: string;
  lotNumber?: string;
}

export interface ManufacturingData {
  moldUsed?: string;
  injectionPressure?: number;
  meltTemperature?: number;
  coolingTime?: number;
  cycleTime?: number;
  machineUsed?: string;
}

export interface Formulation {
  id: string;
  formulationCode: string;
  producedDate?: string; // ISO date
  resinComponents: ResinComponent[];
  manufacturingData: ManufacturingData | null;
}

export interface Material {
  id: string;
  name: string;
  materialType: string;
  supplierId?: string;
  unit: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Test result domain types ──────────────────────────────────

export interface TestResult {
  id: string;
  formulationId: string;
  testedAt: string;
  testedBy?: string;
  weightG?: number;
  diameterMm?: number;
  wallThicknessMm?: number;
  roundnessMm?: number;
  balanceG?: number;
  bounceCm?: number;
  hardnessShorD?: number;
  compressionKg?: number;
  deflectionMm?: number;
  coefficientOfRestitution?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DurabilityResult {
  id: string;
  formulationId: string;
  testedAt: string;
  testedBy?: string;
  airCannonCycles?: number;
  crackInitiationCycles?: number;
  crackPropagationObservations?: number;
  deformationMm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentalResult {
  id: string;
  formulationId: string;
  testedAt: string;
  testedBy?: string;
  hotTemperaturePerformance?: number;
  coldTemperaturePerformance?: number;
  humidityExposureResults?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectiveRating {
  id: string;
  formulationId: string;
  ratedAt: string;
  ratedBy?: string;
  playerFeedback?: string;
  feelScore?: number;
  soundScore?: number;
  perceivedSpeedScore?: number;
  perceivedDurabilityScore?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Benchmark domain types ────────────────────────────────────

export type MetricCategory = 'physical' | 'performance' | 'durability' | 'environmental' | 'subjective';
export type Criticality = 'low' | 'normal' | 'high' | 'critical';

export interface BenchmarkProfile {
  id: string;
  name: string;
  description?: string;
  ballBrand: string;
  ballModel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkMetricTarget {
  id: string;
  benchmarkId: string;
  metricName: string;
  metricCategory: MetricCategory;
  targetValue: number;
  minAcceptable?: number;
  maxAcceptable?: number;
  standardDeviation?: number;
  weight: number;
  criticality: Criticality;
  unit?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Audit ─────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changedBy: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}
