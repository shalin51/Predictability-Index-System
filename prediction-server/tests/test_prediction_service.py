from pathlib import Path

import pytest

from prediction_server.domain.optimization_service import OptimizationService
from prediction_server.domain.prediction_service import PredictionService
from prediction_server.domain.schemas import OptimizeRequest, TrainRequest
from prediction_server.infrastructure.model_registry import FileModelRegistry


def _records(count: int) -> list[dict]:
    records = []
    for index in range(count):
        percentage = 20 + index % 50
        records.append({
            "formula": {"components": [
                {"material_code": "RESIN", "percentage": percentage},
                {"material_code": "FILLER", "percentage": 100 - percentage},
            ]},
            "process": {"melt_temperature": 180 + index},
            "outcomes": {"hardness": 40 + percentage * 0.2},
        })
    return records


def test_train_rejects_empty_records(tmp_path: Path) -> None:
    service = PredictionService(FileModelRegistry(tmp_path))
    with pytest.raises(ValueError, match="no records"):
        service.train(TrainRequest.model_construct(dataset_version="v1", records=[], random_seed=42))


def test_split_indices_rejects_a_dataset_too_small_for_a_split() -> None:
    with pytest.raises(ValueError, match="not enough records"):
        PredictionService._split_indices(2, seed=42)


def test_optimize_loads_the_model_bundle_once_regardless_of_iteration_count(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    service = PredictionService(FileModelRegistry(tmp_path))
    trained = service.train(TrainRequest(dataset_version="test-v1", records=_records(20)))

    load_calls = {"count": 0}
    original_load = service.registry.load

    def counting_load(model_id: str):
        load_calls["count"] += 1
        return original_load(model_id)

    monkeypatch.setattr(service.registry, "load", counting_load)

    OptimizationService(service).optimize(OptimizeRequest.model_validate({
        "model_id": trained.model_id,
        "materials": [
            {"material_code": "RESIN", "minimum": 20, "maximum": 80},
            {"material_code": "FILLER", "minimum": 20, "maximum": 80},
        ],
        "process_ranges": {"melt_temperature": {"minimum": 180, "maximum": 200}},
        "targets": {"hardness": {"target": 50, "tolerance": 2}},
        "iterations": 100,
    }))

    assert load_calls["count"] == 1
