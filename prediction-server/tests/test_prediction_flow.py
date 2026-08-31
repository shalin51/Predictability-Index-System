from pathlib import Path

from prediction_server.domain.optimization_service import OptimizationService
from prediction_server.domain.prediction_service import PredictionService
from prediction_server.domain.schemas import (
    OptimizeRequest,
    PredictionInput,
    TrainRequest,
)
from prediction_server.infrastructure.model_registry import FileModelRegistry


def test_train_predict_and_optimize(tmp_path: Path) -> None:
    service = PredictionService(FileModelRegistry(tmp_path))
    records = []
    for index in range(20):
        percentage = 20 + index * 3
        records.append({
            "formula": {"components": [
                {"material_code": "RESIN", "percentage": percentage},
                {"material_code": "FILLER", "percentage": 100 - percentage},
            ]},
            "process": {"melt_temperature": 180 + index, "machine": "BOY-125E"},
            "outcomes": {"hardness": 40 + percentage * 0.2},
        })

    trained = service.train(TrainRequest(dataset_version="test-v1", records=records))
    value = PredictionInput.model_validate({
        "formula": {"components": [
            {"material_code": "RESIN", "percentage": 50},
            {"material_code": "FILLER", "percentage": 50},
        ]},
        "process": {"melt_temperature": 190, "machine": "BOY-125E"},
    })
    prediction = service.predict(trained.model_id, value)
    assert 45 < prediction["hardness"] < 55

    optimized = OptimizationService(service).optimize(OptimizeRequest.model_validate({
        "model_id": trained.model_id,
        "materials": [
            {"material_code": "RESIN", "minimum": 20, "maximum": 80},
            {"material_code": "FILLER", "minimum": 20, "maximum": 80},
        ],
        "fixed_process": {"machine": "BOY-125E"},
        "process_ranges": {"melt_temperature": {"minimum": 180, "maximum": 200}},
        "targets": {"hardness": {"target": 50, "tolerance": 2}},
        "iterations": 100,
    }))
    assert abs(sum(item.percentage for item in optimized.formula.components) - 100) < 0.01

