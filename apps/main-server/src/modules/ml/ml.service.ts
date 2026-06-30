import { getPool } from '../../infrastructure/database/pg-pool';

export interface MlExportResponse {
  exportedAt: string;
  recordCount: number | null;
  schema: {
    description: string;
    version: string;
    features: string[];
  };
  data: unknown[];
}

export class MlService {
  async exportData(): Promise<MlExportResponse> {
    const result = await getPool().query('SELECT * FROM ml_training_export LIMIT 10000');

    return {
      exportedAt: new Date().toISOString(),
      recordCount: result.rowCount,
      schema: {
        description: 'AMFPI ML training dataset — formulation composition + test results',
        version: '1.0',
        features: [
          'weight_g', 'diameter_mm', 'wall_thickness_mm', 'roundness_mm', 'balance_g',
          'bounce_cm', 'hardness_shore_d', 'compression_kg', 'deflection_mm', 'coefficient_of_restitution',
          'air_cannon_cycles', 'crack_initiation_cycles', 'crack_propagation_mm', 'deformation_mm',
          'hot_performance_score', 'cold_performance_score', 'humidity_performance_score',
          'feel_score', 'sound_score', 'perceived_speed_score', 'perceived_durability_score',
        ],
      },
      data: result.rows,
    };
  }
}
