export type RunSummaryStatus = 'not_generated' | 'incomplete' | 'generated' | 'stale' | 'ready_for_scoring';

export interface RunSummaryRecord {
  [key: string]: unknown;
  id: string;
}

export interface MissingRequiredMetricRecord {
  category: string;
  existingResults: number;
  id: string;
  metricKey: string;
  metricName: string;
  requiredSamples: number;
}
