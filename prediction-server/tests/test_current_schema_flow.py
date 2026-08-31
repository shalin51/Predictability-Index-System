import json
from pathlib import Path

from prediction_server.development.fake_dataset import build_fake_current_schema_dataset
from prediction_server.domain.features import flatten_input
from prediction_server.domain.prediction_service import PredictionService
from prediction_server.domain.schemas import EnvironmentObservation, PredictionInput
from prediction_server.domain.schemas import TrainRequest
from prediction_server.infrastructure.model_registry import FileModelRegistry


def test_fake_current_schema_dataset_trains_and_predicts(tmp_path: Path) -> None:
    dataset = build_fake_current_schema_dataset()
    service = PredictionService(FileModelRegistry(tmp_path))
    trained = service.train(dataset)
    source = dataset.records[10]
    value = PredictionInput.model_validate(source.model_dump(exclude={"production_run_id", "outcomes"}))

    prediction = service.predict(trained.model_id, value)

    assert trained.record_count == 40
    assert trained.target_metrics == ["hardness", "rebound"]
    assert abs(prediction["hardness"] - source.outcomes["hardness"]) < 2
    assert abs(prediction["rebound"] - source.outcomes["rebound"]) < 2


def test_environment_observations_are_forward_compatible_features() -> None:
    source = build_fake_current_schema_dataset().records[0]
    value = PredictionInput.model_validate(source.model_dump(exclude={"production_run_id", "outcomes"}))
    value.environment_observations = [
        EnvironmentObservation(variable_key="ambient.temperature", value_numeric=23.5, unit="C"),
        EnvironmentObservation(variable_key="ambient.relative_humidity", value_numeric=48, unit="percent"),
    ]

    row = flatten_input(value)

    assert row["environment::ambient.temperature::C"] == 23.5
    assert row["environment::ambient.relative_humidity::percent"] == 48


def test_generated_fake_dataset_is_valid() -> None:
    fixture = Path(__file__).parent / "fixtures" / "fake_current_schema_dataset.json"
    dataset = TrainRequest.model_validate(json.loads(fixture.read_text(encoding="utf-8")))
    assert len(dataset.records) == 40
    assert all(not record.environment_observations for record in dataset.records)
