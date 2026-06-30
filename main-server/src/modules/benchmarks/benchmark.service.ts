import type {
  BenchmarkDetailDto,
  BenchmarkMetricTarget,
  BenchmarkListItem,
  BenchmarkWeightValidation,
} from '@amfpi/shared';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { getPool } from '../../infrastructure/database/pg-pool';

export class BenchmarkService {
  constructor(private readonly repo: BenchmarkRepository) {}

  async list(): Promise<BenchmarkListItem[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<BenchmarkDetailDto> {
    const profile = await this.repo.findById(id);
    if (!profile) throw new NotFoundError(`Benchmark ${id}`);
    const metrics = await this.repo.findMetricsByBenchmarkId(id);
    return { ...profile, metrics };
  }

  async getMetrics(benchmarkId: string): Promise<BenchmarkMetricTarget[]> {
    const profile = await this.repo.findById(benchmarkId);
    if (!profile) throw new NotFoundError(`Benchmark ${benchmarkId}`);
    return this.repo.findMetricsByBenchmarkId(benchmarkId);
  }

  async upsertMetric(
    benchmarkId: string,
    metricName: string,
    dto: Partial<BenchmarkMetricTarget>
  ): Promise<BenchmarkMetricTarget> {
    const profile = await this.repo.findById(benchmarkId);
    if (!profile) throw new NotFoundError(`Benchmark ${benchmarkId}`);

    if (!metricName.trim()) throw new ValidationError('metricName is required');
    if (dto.weight !== undefined && (dto.weight < 0 || dto.weight > 1)) {
      throw new ValidationError('weight must be between 0 and 1');
    }
    if (dto.targetValue === undefined) throw new ValidationError('targetValue is required');

    const pool = getPool();

    // Check if metric exists for this benchmark
    const existing = await pool.query(
      'SELECT id FROM benchmark_metric_targets WHERE benchmark_id = $1 AND metric_name = $2',
      [benchmarkId, metricName]
    );

    if ((existing.rowCount ?? 0) > 0) {
      // Update
      const r = await pool.query(
        `UPDATE benchmark_metric_targets
         SET target_value=$1, min_acceptable=$2, max_acceptable=$3, standard_deviation=$4,
             weight=$5, criticality=$6, unit=$7, notes=$8, metric_category=$9
         WHERE benchmark_id=$10 AND metric_name=$11
         RETURNING *`,
        [
          dto.targetValue,
          dto.minAcceptable ?? null,
          dto.maxAcceptable ?? null,
          dto.standardDeviation ?? null,
          dto.weight ?? 1.0,
          dto.criticality ?? 'normal',
          dto.unit ?? null,
          dto.notes ?? null,
          dto.metricCategory ?? 'performance',
          benchmarkId,
          metricName,
        ]
      );
      return this.mapTarget(r.rows[0] as Record<string, unknown>);
    } else {
      // Insert
      const r = await pool.query(
        `INSERT INTO benchmark_metric_targets
           (benchmark_id, metric_name, metric_category, target_value, min_acceptable,
            max_acceptable, standard_deviation, weight, criticality, unit, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          benchmarkId, metricName,
          dto.metricCategory ?? 'performance',
          dto.targetValue,
          dto.minAcceptable ?? null,
          dto.maxAcceptable ?? null,
          dto.standardDeviation ?? null,
          dto.weight ?? 1.0,
          dto.criticality ?? 'normal',
          dto.unit ?? null,
          dto.notes ?? null,
        ]
      );
      return this.mapTarget(r.rows[0] as Record<string, unknown>);
    }
  }

  async validateWeights(benchmarkId: string): Promise<BenchmarkWeightValidation> {
    const metrics = await this.repo.findMetricsByBenchmarkId(benchmarkId);
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    const metricCount = metrics.length;
    const averageWeight = metricCount === 0 ? 0 : totalWeight / metricCount;
    const valid = metricCount > 0 && metrics.every((metric) => metric.weight > 0);
    return {
      valid,
      totalWeight,
      metricCount,
      averageWeight,
      message: valid
        ? `Weights valid — ${metricCount} metrics, total weight ${totalWeight.toFixed(3)}`
        : 'Every metric must have a weight greater than 0',
    };
  }

  private mapTarget(r: Record<string, unknown>): BenchmarkMetricTarget {
    return {
      id: r['id'] as string,
      benchmarkId: r['benchmark_id'] as string,
      metricName: r['metric_name'] as string,
      metricCategory: r['metric_category'] as BenchmarkMetricTarget['metricCategory'],
      targetValue: Number(r['target_value']),
      minAcceptable: r['min_acceptable'] != null ? Number(r['min_acceptable']) : undefined,
      maxAcceptable: r['max_acceptable'] != null ? Number(r['max_acceptable']) : undefined,
      standardDeviation: r['standard_deviation'] != null ? Number(r['standard_deviation']) : undefined,
      weight: Number(r['weight']),
      criticality: r['criticality'] as BenchmarkMetricTarget['criticality'],
      unit: r['unit'] as string | undefined,
      notes: r['notes'] as string | undefined,
      createdAt: r['created_at'] as string,
      updatedAt: r['updated_at'] as string,
    };
  }
}
