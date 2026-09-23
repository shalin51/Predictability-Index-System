from collections import defaultdict
from collections.abc import Callable, Mapping, Sequence
from typing import Any, Protocol
from uuid import UUID

from psycopg import Connection, connect
from psycopg.rows import dict_row

from ..domain.schemas import EnvironmentObservation, PredictionInput, TrainingRecord


class EnvironmentObservationSource(Protocol):
    def for_runs(self, run_ids: Sequence[UUID]) -> Mapping[UUID, list[EnvironmentObservation]]: ...


class EmptyEnvironmentObservationSource:
    def for_runs(self, run_ids: Sequence[UUID]) -> Mapping[UUID, list[EnvironmentObservation]]:
        return {}


RUNS_SQL = """
SELECT pr.id AS production_run_id,
       f.id AS formulation_id, f.formulation_code, f.version_no,
       machine.id AS machine_id, machine.machine_code,
       mold.id AS mold_id, mold.mold_code
FROM production_runs pr
JOIN formulations f ON f.id = pr.formulation_id
JOIN machines machine ON machine.id = pr.machine_id
JOIN molds mold ON mold.id = pr.mold_id
WHERE (
  pr.status IN ('completed', 'scored')
  OR (
    pr.status = 'testing'
    AND EXISTS (
      SELECT 1
      FROM run_metric_summaries summary
      WHERE summary.production_run_id = pr.id
    )
  )
)
  AND 6 = (
    SELECT count(DISTINCT metric.metric_key)
    FROM run_metric_summaries summary
    JOIN metric_definitions metric ON metric.id = summary.metric_id
    WHERE summary.production_run_id = pr.id
      AND metric.metric_key IN ('compression', 'diameter', 'hardness', 'stretch', 'wall_thickness', 'weight')
  )
ORDER BY pr.date_produced, pr.id
LIMIT %s
"""

RUN_SQL = """
SELECT pr.id AS production_run_id,
       f.id AS formulation_id, f.formulation_code, f.version_no,
       machine.id AS machine_id, machine.machine_code,
       mold.id AS mold_id, mold.mold_code
FROM production_runs pr
JOIN formulations f ON f.id = pr.formulation_id
JOIN machines machine ON machine.id = pr.machine_id
JOIN molds mold ON mold.id = pr.mold_id
WHERE pr.id = %s
"""

COMPONENTS_SQL = """
SELECT pr.id AS production_run_id,
       fc.material_id, material.material_code, fc.supplier_id,
       COALESCE(prml.material_lot_id, fc.material_lot_id) AS material_lot_id,
       fc.percent_composition, fc.basis
FROM production_runs pr
JOIN formulation_components fc ON fc.formulation_id = pr.formulation_id
JOIN materials material ON material.id = fc.material_id
LEFT JOIN production_run_material_lots prml
  ON prml.production_run_id = pr.id AND prml.formulation_component_id = fc.id
WHERE pr.id = ANY(%s)
ORDER BY pr.id, fc.sort_order, fc.id
"""

PROCESS_SQL = """
SELECT value.production_run_id, value.parameter_definition_id, definition.parameter_key,
       value.position_type, value.position_index, value.position_label,
       COALESCE(value.actual_numeric, value.setpoint_numeric) AS value_numeric,
       COALESCE(value.actual_text, value.setpoint_text) AS value_text,
       value.unit
FROM production_run_process_values value
JOIN process_parameter_definitions definition ON definition.id = value.parameter_definition_id
WHERE value.production_run_id = ANY(%s)
  AND (COALESCE(value.actual_numeric, value.setpoint_numeric) IS NOT NULL
       OR COALESCE(value.actual_text, value.setpoint_text) IS NOT NULL)
ORDER BY value.production_run_id, definition.sort_order, value.position_index
"""

OUTCOMES_SQL = """
SELECT summary.production_run_id, metric.metric_key, condition.condition_code,
       summary.mean_value, summary.unit
FROM run_metric_summaries summary
JOIN metric_definitions metric ON metric.id = summary.metric_id
LEFT JOIN test_condition_definitions condition ON condition.id = summary.condition_id
WHERE summary.production_run_id = ANY(%s)
ORDER BY summary.production_run_id, metric.metric_key
"""


class CurrentSchemaRepository:
    def __init__(
        self,
        database_url: str,
        environment_source: EnvironmentObservationSource | None = None,
        connection_factory: Callable[..., Connection[Any]] = connect,
    ):
        self.database_url = database_url
        self.environment_source = environment_source or EmptyEnvironmentObservationSource()
        self.connection_factory = connection_factory

    def load_training_records(self, limit: int = 10_000) -> list[TrainingRecord]:
        with self.connection_factory(self.database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(RUNS_SQL, (limit,))
                runs = cursor.fetchall()
                return self._load_records(cursor, runs, require_outcomes=True)

    def load_prediction_input(self, production_run_id: UUID) -> PredictionInput:
        with self.connection_factory(self.database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(RUN_SQL, (production_run_id,))
                run = cursor.fetchone()
                if run is None:
                    raise FileNotFoundError(str(production_run_id))
                record = self._load_records(cursor, [run], require_outcomes=False)[0]
        return PredictionInput.model_validate(record.model_dump(exclude={"outcomes", "production_run_id"}))

    def _load_records(
        self,
        cursor: Any,
        runs: Sequence[Mapping[str, Any]],
        require_outcomes: bool,
    ) -> list[TrainingRecord]:
        if not runs:
            return []
        run_ids = [run["production_run_id"] for run in runs]
        cursor.execute(COMPONENTS_SQL, (run_ids,))
        components = self._group(cursor.fetchall(), "production_run_id")
        cursor.execute(PROCESS_SQL, (run_ids,))
        parameters = self._group(cursor.fetchall(), "production_run_id")
        cursor.execute(OUTCOMES_SQL, (run_ids,))
        outcomes: dict[UUID, dict[str, float]] = defaultdict(dict)
        for row in cursor.fetchall():
            metric_key = row["metric_key"]
            if row["condition_code"]:
                metric_key = f"{metric_key}::{row['condition_code']}"
            run_outcomes = outcomes[row["production_run_id"]]
            if metric_key in run_outcomes:
                raise ValueError(
                    f"run {row['production_run_id']} has duplicate metric {metric_key}; normalize its units"
                )
            run_outcomes[metric_key] = float(row["mean_value"])
        environment = self.environment_source.for_runs(run_ids)

        records: list[TrainingRecord] = []
        for run in runs:
            run_id = run["production_run_id"]
            if require_outcomes and not outcomes[run_id]:
                continue
            records.append(TrainingRecord.model_validate({
                "production_run_id": run_id,
                "formula": {
                    "formulation_id": run["formulation_id"],
                    "formulation_code": run["formulation_code"],
                    "version_no": run["version_no"],
                    "components": components[run_id],
                },
                "machine_id": run["machine_id"],
                "machine_code": run["machine_code"],
                "mold_id": run["mold_id"],
                "mold_code": run["mold_code"],
                "process_parameters": parameters[run_id],
                "environment_observations": environment.get(run_id, []),
                "outcomes": outcomes[run_id],
            }))
        return records

    @staticmethod
    def _group(rows: Sequence[Mapping[str, Any]], key: str) -> dict[UUID, list[dict[str, Any]]]:
        grouped: dict[UUID, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            item = dict(row)
            group_key = item.pop(key)
            grouped[group_key].append(item)
        return grouped
