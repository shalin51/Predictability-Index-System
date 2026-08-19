-- Migration 024: Persist the supplied Core Pro 2 weighted similarity analysis.
-- This stores reported averages and ranking data as an external analysis. It does
-- not fabricate raw sample observations where the source only supplied averages.

CREATE TABLE IF NOT EXISTS comparison_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_code VARCHAR(100) NOT NULL UNIQUE,
  analysis_name VARCHAR(255) NOT NULL,
  benchmark_profile_id UUID REFERENCES benchmark_profiles(id) ON DELETE SET NULL,
  target_name VARCHAR(255) NOT NULL,
  source_reference TEXT NOT NULL,
  methodology TEXT NOT NULL,
  excluded_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  ignored_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  candidate_count INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comparison_analysis_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES comparison_analyses(id) ON DELETE CASCADE,
  formulation_id UUID REFERENCES formulations(id) ON DELETE SET NULL,
  candidate_name VARCHAR(255) NOT NULL,
  rank INT,
  weighted_deviation_percent NUMERIC(8,4) NOT NULL,
  confidence_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, candidate_name)
);

CREATE TABLE IF NOT EXISTS comparison_analysis_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES comparison_analysis_candidates(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  target_mean NUMERIC(14,5) NOT NULL,
  candidate_mean NUMERIC(14,5),
  signed_deviation_percent NUMERIC(8,4) NOT NULL,
  weight NUMERIC(8,5) NOT NULL,
  weighted_deviation_points NUMERIC(8,4) NOT NULL,
  source_detail_level VARCHAR(30) NOT NULL DEFAULT 'reported_deviation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, metric_id),
  CHECK (source_detail_level IN ('reported_mean', 'reported_deviation'))
);

CREATE INDEX IF NOT EXISTS idx_comparison_analysis_candidates_analysis
  ON comparison_analysis_candidates(analysis_id, rank);
CREATE INDEX IF NOT EXISTS idx_comparison_analysis_metrics_candidate
  ON comparison_analysis_metrics(candidate_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'comparison_analyses',
    'comparison_analysis_candidates',
    'comparison_analysis_metrics'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = format('trg_%s_updated_at', tbl)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

INSERT INTO metric_definitions
  (metric_key, display_name, category, default_unit, data_type, benchmark_comparable,
   required_for_scoring, higher_is_better, status, sort_order)
VALUES
  ('weight', 'Weight', 'physical', 'g', 'numeric', true, false, NULL, 'active', 10),
  ('wall_thickness', 'Wall Thickness', 'physical', 'mm', 'numeric', true, false, NULL, 'active', 30),
  ('hardness', 'Hardness', 'performance', 'Shore D', 'numeric', true, false, NULL, 'active', 70)
ON CONFLICT (metric_key) DO NOTHING;

INSERT INTO comparison_analyses
  (id, analysis_code, analysis_name, benchmark_profile_id, target_name, source_reference,
   methodology, excluded_candidates, ignored_attributes, candidate_count, notes)
SELECT
  'a0000001-0000-0000-0000-000000000004'::uuid,
  'CORE-PRO2-WEIGHTED-20260818',
  'Core Pro 2 Weighted Ball Similarity Analysis',
  bp.id,
  'Core Pro 2',
  'User-provided Core Pro 2 weighted ball similarity analysis.',
  'For each candidate, average available numeric samples by metric; calculate absolute percentage deviation from the Core Pro 2 average; multiply each deviation by its metric weight; sum contributions. Lower is closer; missing any weighted metric excludes a candidate from ranking.',
  '["Selkirk", "Selkirk Pro S2", "LT48"]'::jsonb,
  '["Diameter", "base material", "color", "additives"]'::jsonb,
  30,
  'Reported ranking contains 30 candidates with complete weighted metrics. Detailed metric values were supplied for ranks 1-5 only; ranks 6-10 retain their reported total score.'
FROM benchmark_profiles bp
WHERE bp.benchmark_code = 'PRO2'
ON CONFLICT (analysis_code) DO UPDATE SET
  benchmark_profile_id = EXCLUDED.benchmark_profile_id,
  source_reference = EXCLUDED.source_reference,
  methodology = EXCLUDED.methodology,
  excluded_candidates = EXCLUDED.excluded_candidates,
  ignored_attributes = EXCLUDED.ignored_attributes,
  candidate_count = EXCLUDED.candidate_count,
  notes = EXCLUDED.notes,
  updated_at = now();

WITH analysis AS (
  SELECT id FROM comparison_analyses WHERE analysis_code = 'CORE-PRO2-WEIGHTED-20260818'
), candidates(candidate_name, rank, weighted_deviation_percent, confidence_note) AS (
  VALUES
    ('Kingfa 1789 0.25-7033', 1, 2.39::numeric, NULL::text),
    ('Kingfa 1789 0.5-7033', 2, 2.63::numeric, NULL::text),
    ('Kingfa 1789 1-7033', 3, 3.26::numeric, NULL::text),
    ('Kingfa 1789', 4, 3.83::numeric, NULL::text),
    ('Kingfa 1789 2-7033', 5, 4.09::numeric, NULL::text),
    ('Kingfa 1789 0.5-Vistamax', 6, 4.11::numeric, NULL::text),
    ('Kingfa 1789 7-7033', 7, 5.21::numeric, NULL::text),
    ('Kingfa 1789 5-7033', 8, 5.33::numeric, NULL::text),
    ('PTE', 9, 5.35::numeric, 'Lower confidence: only one successful full-stretch measurement; other samples were weld failures.'),
    ('Kingfa 1789 10-7033', 10, 6.25::numeric, NULL::text)
)
INSERT INTO comparison_analysis_candidates
  (analysis_id, formulation_id, candidate_name, rank, weighted_deviation_percent, confidence_note)
SELECT
  analysis.id,
  formulation.id,
  candidates.candidate_name,
  candidates.rank,
  candidates.weighted_deviation_percent,
  candidates.confidence_note
FROM analysis
CROSS JOIN candidates
LEFT JOIN LATERAL (
  SELECT id
  FROM formulations
  WHERE lower(formulation_code) = lower(candidates.candidate_name)
  ORDER BY version_no DESC
  LIMIT 1
) formulation ON true
ON CONFLICT (analysis_id, candidate_name) DO UPDATE SET
  formulation_id = EXCLUDED.formulation_id,
  rank = EXCLUDED.rank,
  weighted_deviation_percent = EXCLUDED.weighted_deviation_percent,
  confidence_note = EXCLUDED.confidence_note,
  updated_at = now();

WITH values_by_candidate(candidate_name, metric_key, target_mean, candidate_mean, signed_deviation_percent, weight, source_detail_level) AS (
  VALUES
    ('Kingfa 1789 0.25-7033', 'drop_test_legacy', 901.00::numeric, 915.67::numeric, 1.63::numeric, 0.30::numeric, 'reported_mean'),
    ('Kingfa 1789 0.25-7033', 'weight', 25.87::numeric, 25.57::numeric, -1.16::numeric, 0.15::numeric, 'reported_mean'),
    ('Kingfa 1789 0.25-7033', 'hardness', 57.67::numeric, 58.33::numeric, 1.16::numeric, 0.20::numeric, 'reported_mean'),
    ('Kingfa 1789 0.25-7033', 'compression_force_025_in', 35.57::numeric, 34.48::numeric, -3.05::numeric, 0.15::numeric, 'reported_mean'),
    ('Kingfa 1789 0.25-7033', 'stretch_force_025_in', 191.10::numeric, 166.67::numeric, -12.79::numeric, 0.05::numeric, 'reported_mean'),
    ('Kingfa 1789 0.25-7033', 'full_stretch_max_force', 226.20::numeric, 208.07::numeric, -8.02::numeric, 0.05::numeric, 'reported_mean'),
    ('Kingfa 1789 0.25-7033', 'wall_thickness', 1.97::numeric, 1.97::numeric, 0.00::numeric, 0.10::numeric, 'reported_mean'),
    ('Kingfa 1789 0.5-7033', 'drop_test_legacy', 901.00::numeric, NULL::numeric, 1.48::numeric, 0.30::numeric, 'reported_deviation'),
    ('Kingfa 1789 0.5-7033', 'weight', 25.87::numeric, NULL::numeric, -0.90::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789 0.5-7033', 'hardness', 57.67::numeric, NULL::numeric, -0.29::numeric, 0.20::numeric, 'reported_deviation'),
    ('Kingfa 1789 0.5-7033', 'compression_force_025_in', 35.57::numeric, NULL::numeric, -2.44::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789 0.5-7033', 'stretch_force_025_in', 191.10::numeric, NULL::numeric, -14.86::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789 0.5-7033', 'full_stretch_max_force', 226.20::numeric, NULL::numeric, -7.44::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789 0.5-7033', 'wall_thickness', 1.97::numeric, NULL::numeric, 5.08::numeric, 0.10::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'drop_test_legacy', 901.00::numeric, NULL::numeric, 2.85::numeric, 0.30::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'weight', 25.87::numeric, NULL::numeric, -1.03::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'hardness', 57.67::numeric, NULL::numeric, 0.00::numeric, 0.20::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'compression_force_025_in', 35.57::numeric, NULL::numeric, -3.94::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'stretch_force_025_in', 191.10::numeric, NULL::numeric, -18.21::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'full_stretch_max_force', 226.20::numeric, NULL::numeric, -14.93::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789 1-7033', 'wall_thickness', 1.97::numeric, NULL::numeric, 0.00::numeric, 0.10::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'drop_test_legacy', 901.00::numeric, NULL::numeric, 0.25::numeric, 0.30::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'weight', 25.87::numeric, NULL::numeric, -1.16::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'hardness', 57.67::numeric, NULL::numeric, -4.62::numeric, 0.20::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'compression_force_025_in', 35.57::numeric, NULL::numeric, 9.18::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'stretch_force_025_in', 191.10::numeric, NULL::numeric, -18.98::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'full_stretch_max_force', 226.20::numeric, NULL::numeric, -3.15::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789', 'wall_thickness', 1.97::numeric, NULL::numeric, -1.69::numeric, 0.10::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'drop_test_legacy', 901.00::numeric, NULL::numeric, 4.82::numeric, 0.30::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'weight', 25.87::numeric, NULL::numeric, -1.29::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'hardness', 57.67::numeric, NULL::numeric, -1.73::numeric, 0.20::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'compression_force_025_in', 35.57::numeric, NULL::numeric, 9.28::numeric, 0.15::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'stretch_force_025_in', 191.10::numeric, NULL::numeric, -8.81::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'full_stretch_max_force', 226.20::numeric, NULL::numeric, -5.41::numeric, 0.05::numeric, 'reported_deviation'),
    ('Kingfa 1789 2-7033', 'wall_thickness', 1.97::numeric, NULL::numeric, 0.00::numeric, 0.10::numeric, 'reported_deviation')
)
INSERT INTO comparison_analysis_metrics
  (candidate_id, metric_id, target_mean, candidate_mean, signed_deviation_percent,
   weight, weighted_deviation_points, source_detail_level)
SELECT
  candidate.id,
  metric.id,
  values_by_candidate.target_mean,
  values_by_candidate.candidate_mean,
  values_by_candidate.signed_deviation_percent,
  values_by_candidate.weight,
  abs(values_by_candidate.signed_deviation_percent) * values_by_candidate.weight,
  values_by_candidate.source_detail_level
FROM values_by_candidate
JOIN comparison_analyses analysis ON analysis.analysis_code = 'CORE-PRO2-WEIGHTED-20260818'
JOIN comparison_analysis_candidates candidate
  ON candidate.analysis_id = analysis.id
 AND candidate.candidate_name = values_by_candidate.candidate_name
JOIN metric_definitions metric ON metric.metric_key = values_by_candidate.metric_key
ON CONFLICT (candidate_id, metric_id) DO UPDATE SET
  target_mean = EXCLUDED.target_mean,
  candidate_mean = EXCLUDED.candidate_mean,
  signed_deviation_percent = EXCLUDED.signed_deviation_percent,
  weight = EXCLUDED.weight,
  weighted_deviation_points = EXCLUDED.weighted_deviation_points,
  source_detail_level = EXCLUDED.source_detail_level,
  updated_at = now();
