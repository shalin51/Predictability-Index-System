from typing import Annotated
from uuid import UUID

from pydantic import AliasChoices, BaseModel, Field, model_validator


Percentage = Annotated[float, Field(ge=0, le=100)]


class Component(BaseModel):
    material_id: UUID | None = None
    material_code: str = Field(min_length=1, max_length=150)
    supplier_id: UUID | None = None
    material_lot_id: UUID | None = None
    percentage: Percentage = Field(
        validation_alias=AliasChoices("percent_composition", "percentage"),
        serialization_alias="percent_composition",
    )
    basis: str = Field(default="weight_percent", min_length=1, max_length=50)


class Formula(BaseModel):
    formulation_id: UUID | None = None
    formulation_code: str | None = Field(default=None, max_length=100)
    version_no: int | None = Field(default=None, ge=1)
    components: list[Component] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_composition(self) -> "Formula":
        codes = [component.material_code for component in self.components]
        if len(codes) != len(set(codes)):
            raise ValueError("material_code values must be unique")
        total = sum(component.percentage for component in self.components)
        if abs(total - 100.0) > 0.01:
            raise ValueError(f"component percentages must total 100; received {total:g}")
        return self


class ProcessParameter(BaseModel):
    parameter_definition_id: UUID | None = None
    parameter_key: str = Field(min_length=1, max_length=160)
    position_type: str = Field(default="single", min_length=1, max_length=50)
    position_index: int | None = None
    position_label: str | None = Field(default=None, max_length=160)
    value_numeric: float | None = None
    value_text: str | None = None
    unit: str | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def validate_value(self) -> "ProcessParameter":
        if (self.value_numeric is None) == (self.value_text is None):
            raise ValueError("exactly one process value is required")
        return self


class EnvironmentObservation(BaseModel):
    variable_key: str = Field(min_length=1, max_length=160)
    value_numeric: float
    unit: str | None = Field(default=None, max_length=50)


class PredictionInput(BaseModel):
    formula: Formula
    machine_id: UUID | None = None
    machine_code: str | None = Field(default=None, max_length=100)
    mold_id: UUID | None = None
    mold_code: str | None = Field(default=None, max_length=100)
    process_parameters: list[ProcessParameter] = Field(default_factory=list)
    environment_observations: list[EnvironmentObservation] = Field(default_factory=list)
    # Backward-compatible ad-hoc process values. Database-backed data uses
    # process_parameters and parameter_definition_id/parameter_key.
    process: dict[str, float | str | None] = Field(default_factory=dict)


class TrainingRecord(PredictionInput):
    production_run_id: UUID | None = None
    outcomes: dict[str, float]


class TrainRequest(BaseModel):
    dataset_version: str = Field(min_length=1, max_length=100)
    records: list[TrainingRecord] = Field(min_length=20)
    random_seed: int = 42


class DatabaseTrainRequest(BaseModel):
    dataset_version: str = Field(min_length=1, max_length=100)
    limit: int = Field(default=10_000, ge=20, le=1_000_000)
    random_seed: int = 42


class MetricEvaluation(BaseModel):
    mae: float
    r2: float | None


class TrainResponse(BaseModel):
    model_id: str
    dataset_version: str
    record_count: int
    target_metrics: list[str]
    validation: dict[str, MetricEvaluation] = Field(
        description=(
            "Held-out metrics from a model trained on ~80% of the records and scored "
            "against the remaining ~20%. The model actually saved under model_id and "
            "served by /v1/predictions is a separate model retrained on all records "
            "(train + validation), so these metrics describe a slightly different, "
            "less-trained model than the one that serves predictions."
        )
    )


class PredictionResponse(BaseModel):
    model_id: str
    predictions: dict[str, float]


class MaterialBound(BaseModel):
    material_id: UUID | None = None
    material_code: str = Field(min_length=1, max_length=150)
    supplier_id: UUID | None = None
    material_lot_id: UUID | None = None
    minimum: Percentage = 0
    maximum: Percentage = 100

    @model_validator(mode="after")
    def validate_bounds(self) -> "MaterialBound":
        if self.minimum > self.maximum:
            raise ValueError("minimum cannot exceed maximum")
        return self


class NumericRange(BaseModel):
    minimum: float
    maximum: float

    @model_validator(mode="after")
    def validate_range(self) -> "NumericRange":
        if self.minimum > self.maximum:
            raise ValueError("minimum cannot exceed maximum")
        return self


class MetricTarget(BaseModel):
    target: float
    tolerance: float = Field(gt=0)
    weight: float = Field(default=1, gt=0)


class OptimizeRequest(BaseModel):
    model_id: str = Field(min_length=1)
    materials: list[MaterialBound] = Field(min_length=1)
    machine_id: UUID | None = None
    machine_code: str | None = Field(default=None, max_length=100)
    mold_id: UUID | None = None
    mold_code: str | None = Field(default=None, max_length=100)
    environment_observations: list[EnvironmentObservation] = Field(default_factory=list)
    fixed_process: dict[str, float | str | None] = Field(default_factory=dict)
    process_ranges: dict[str, NumericRange] = Field(default_factory=dict)
    targets: dict[str, MetricTarget]
    iterations: int = Field(default=2000, ge=100, le=100_000)
    random_seed: int = 42

    @model_validator(mode="after")
    def validate_feasibility(self) -> "OptimizeRequest":
        codes = [material.material_code for material in self.materials]
        if len(codes) != len(set(codes)):
            raise ValueError("material_code values must be unique")
        if sum(item.minimum for item in self.materials) > 100:
            raise ValueError("material minimums exceed 100")
        if sum(item.maximum for item in self.materials) < 100:
            raise ValueError("material maximums cannot reach 100")
        if not self.targets:
            raise ValueError("at least one target is required")
        return self


class OptimizationResponse(BaseModel):
    model_id: str
    objective_score: float
    formula: Formula
    process: dict[str, float | str | None]
    predictions: dict[str, float]
