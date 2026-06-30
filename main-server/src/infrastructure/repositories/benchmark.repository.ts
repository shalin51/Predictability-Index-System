import { getPool } from '../database/pg-pool';
import type {
  BenchmarkProfile,
  BenchmarkMetricTarget,
  BenchmarkListItem,
} from '@amfpi/shared';

function rowToProfile(row: Record<string, unknown>): BenchmarkProfile {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: row['description'] as string | undefined,
    ballBrand: row['ball_brand'] as string,
    ballModel: row['ball_model'] as string,
    isActive: row['is_active'] as boolean,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function rowToTarget(row: Record<string, unknown>): BenchmarkMetricTarget {
  return {
    id: row['id'] as string,
    benchmarkId: row['benchmark_id'] as string,
    metricName: row['metric_name'] as string,
    metricCategory: row['metric_category'] as BenchmarkMetricTarget['metricCategory'],
    targetValue: Number(row['target_value']),
    minAcceptable: row['min_acceptable'] != null ? Number(row['min_acceptable']) : undefined,
    maxAcceptable: row['max_acceptable'] != null ? Number(row['max_acceptable']) : undefined,
    standardDeviation: row['standard_deviation'] != null ? Number(row['standard_deviation']) : undefined,
    weight: Number(row['weight']),
    criticality: row['criticality'] as BenchmarkMetricTarget['criticality'],
    unit: row['unit'] as string | undefined,
    notes: row['notes'] as string | undefined,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

export class BenchmarkRepository {
  async findAll(): Promise<BenchmarkListItem[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT bp.*, COUNT(bmt.id)::INT AS metric_count
       FROM benchmark_profiles bp
       LEFT JOIN benchmark_metric_targets bmt ON bmt.benchmark_id = bp.id
       GROUP BY bp.id
       ORDER BY bp.name`
    );
    return (result.rows as Record<string, unknown>[]).map((r) => ({
      id: r['id'] as string,
      name: r['name'] as string,
      ballBrand: r['ball_brand'] as string,
      ballModel: r['ball_model'] as string,
      isActive: r['is_active'] as boolean,
      metricCount: r['metric_count'] as number,
    }));
  }

  async findById(id: string): Promise<BenchmarkProfile | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM benchmark_profiles WHERE id = $1', [id]);
    if (result.rowCount === 0) return null;
    return rowToProfile(result.rows[0] as Record<string, unknown>);
  }

  async findMetricsByBenchmarkId(benchmarkId: string): Promise<BenchmarkMetricTarget[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM benchmark_metric_targets WHERE benchmark_id = $1 ORDER BY metric_category, metric_name',
      [benchmarkId]
    );
    return (result.rows as Record<string, unknown>[]).map(rowToTarget);
  }
}
