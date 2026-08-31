from collections.abc import Iterable

from .schemas import PredictionInput

COMPONENT_PREFIX = "component::"
PROCESS_PREFIX = "process::"
ENVIRONMENT_PREFIX = "environment::"


def flatten_input(value: PredictionInput) -> dict[str, float | str]:
    row: dict[str, float | str] = {
        f"{COMPONENT_PREFIX}{component.material_id or component.material_code}": component.percentage
        for component in value.formula.components
    }
    for component in value.formula.components:
        identity = component.material_id or component.material_code
        if component.supplier_id:
            row[f"component_supplier::{identity}"] = str(component.supplier_id)
        if component.material_lot_id:
            row[f"component_lot::{identity}"] = str(component.material_lot_id)
    if value.machine_id or value.machine_code:
        row["equipment::machine"] = str(value.machine_id or value.machine_code)
    if value.mold_id or value.mold_code:
        row["equipment::mold"] = str(value.mold_id or value.mold_code)
    for parameter in value.process_parameters:
        position = ":".join(
            str(item)
            for item in (parameter.position_type, parameter.position_index, parameter.position_label)
            if item is not None
        )
        key = str(parameter.parameter_definition_id or parameter.parameter_key)
        unit = parameter.unit or "unitless"
        row[f"{PROCESS_PREFIX}{key}::{position}::{unit}"] = (
            parameter.value_numeric
            if parameter.value_numeric is not None
            else parameter.value_text or ""
        )
    for key, item in value.process.items():
        if item is not None:
            row[f"{PROCESS_PREFIX}{key}"] = item
    for observation in value.environment_observations:
        unit = observation.unit or "unitless"
        row[f"{ENVIRONMENT_PREFIX}{observation.variable_key}::{unit}"] = observation.value_numeric
    return row


def feature_columns(rows: Iterable[dict[str, float | str]]) -> list[str]:
    return sorted({key for row in rows for key in row})


def categorical_columns(rows: list[dict[str, float | str]], columns: list[str]) -> list[str]:
    return [
        column
        for column in columns
        if any(isinstance(row.get(column), str) for row in rows)
    ]


def validate_consistent_types(rows: list[dict[str, float | str]], columns: list[str]) -> None:
    """Reject a feature that is numeric in some records and text in others.

    Such a column would otherwise be silently treated as categorical (see
    `categorical_columns`), stringifying every numeric value and discarding
    the magnitude/ordering information a model could use.
    """
    for column in columns:
        kinds = {
            "text" if isinstance(row[column], str) else "numeric"
            for row in rows
            if column in row and row[column] is not None
        }
        if len(kinds) > 1:
            raise ValueError(f"feature '{column}' has both numeric and text values across records")


def matrix(
    rows: list[dict[str, float | str]],
    columns: list[str],
    categorical: list[str],
) -> list[list[float | str]]:
    categorical_set = set(categorical)
    return [
        [
            str(row.get(column, "__missing__"))
            if column in categorical_set
            else float(row[column]) if row.get(column) is not None else float("nan")
            for column in columns
        ]
        for row in rows
    ]
