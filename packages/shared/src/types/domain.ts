// ── Formulation domain types ─────────────────────────────────

export type FormulationStatus = 'draft' | 'testing' | 'approved' | 'rejected' | 'archived';

export interface Formulation {
  id: string;
  formulationCode: string;
  name: string;
  description?: string;
  version: number;
  status: FormulationStatus;
  producedDate?: string; // ISO date
  lotNumber?: string;
  batchSizeKg?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormulationMaterial {
  id: string;
  formulationId: string;
  materialId: string;
  percentage: number;
  lotNumber?: string;
  notes?: string;
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
  // Physical
  weightG?: number;
  diameterMm?: number;
  wallThicknessMm?: number;
  roundnessMm?: number;
  balanceG?: number;
  // Performance
  bounceCm?: number;
  hardnessShorD?: number;
  compressionKg?: number;
  deflectionMm?: number;
  coefficientOfRestitution?: number;
  notes?: string;
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
  crackPropagationMm?: number;
  deformationMm?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentalResult {
  id: string;
  formulationId: string;
  testedAt: string;
  testedBy?: string;
  hotPerformanceScore?: number;
  coldPerformanceScore?: number;
  humidityPerformanceScore?: number;
  testTempHotC?: number;
  testTempColdC?: number;
  testHumidityPct?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectiveRating {
  id: string;
  formulationId: string;
  ratedAt: string;
  ratedBy?: string;
  feelScore?: number;
  soundScore?: number;
  perceivedSpeedScore?: number;
  perceivedDurabilityScore?: number;
  notes?: string;
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
