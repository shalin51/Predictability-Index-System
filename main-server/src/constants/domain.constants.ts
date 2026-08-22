export const RECORD_STATUSES = ['active', 'inactive', 'archived'] as const;
export const FORMULATION_STATUSES = ['draft', 'approved', 'molded', 'testing', 'scored', 'archived'] as const;
export const PRODUCTION_RUN_STATUSES = ['planned', 'molded', 'curing', 'ready_for_testing', 'testing', 'completed', 'scored', 'archived'] as const;
export const SAMPLE_STATUSES = ['created', 'testing', 'tested', 'archived'] as const;
export const COMPARISON_MODES = ['target_range', 'max_cap', 'min_floor'] as const;
export const CRITICALITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export const POSITION_TYPES = ['single', 'zone', 'position', 'stage'] as const;
export const FORMULATION_BASES = ['weight_percent'] as const;
