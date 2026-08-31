from pathlib import Path
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from prediction_server.api import create_router
from prediction_server.domain.optimization_service import OptimizationService
from prediction_server.domain.prediction_service import PredictionService
from prediction_server.domain.schemas import PredictionInput, TrainingRecord
from prediction_server.infrastructure.model_registry import FileModelRegistry
from prediction_server.main import app


class _FailingCurrentSchemaRepository:
    """Stands in for CurrentSchemaRepository, raising ValueError like a real
    duplicate-metric or mixed-feature-type data problem would."""

    def load_training_records(self, limit: int) -> list[TrainingRecord]:
        raise ValueError("run duplicate has duplicate metric hardness; normalize its units")

    def load_prediction_input(self, production_run_id: UUID) -> PredictionInput:
        raise ValueError("run duplicate has duplicate metric hardness; normalize its units")


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_unknown_model_returns_not_found(tmp_path: Path) -> None:
    service = PredictionService(FileModelRegistry(tmp_path))
    isolated_app = app.__class__()
    isolated_app.include_router(create_router(service, OptimizationService(service)))
    with TestClient(isolated_app) as client:
        response = client.post(
            "/v1/predictions?model_id=missing",
            json={"formula": {"components": [{"material_code": "A", "percentage": 100}]}},
        )
    assert response.status_code == 404


def test_train_from_database_returns_422_on_value_error(tmp_path: Path) -> None:
    service = PredictionService(FileModelRegistry(tmp_path))
    isolated_app = app.__class__()
    isolated_app.include_router(create_router(
        service, OptimizationService(service), _FailingCurrentSchemaRepository()
    ))
    with TestClient(isolated_app) as client:
        response = client.post(
            "/v1/models/train/database",
            json={"dataset_version": "v1", "limit": 100},
        )
    assert response.status_code == 422
    assert "duplicate metric" in response.json()["detail"]


def test_predict_production_run_returns_422_on_value_error(tmp_path: Path) -> None:
    service = PredictionService(FileModelRegistry(tmp_path))
    isolated_app = app.__class__()
    isolated_app.include_router(create_router(
        service, OptimizationService(service), _FailingCurrentSchemaRepository()
    ))
    with TestClient(isolated_app) as client:
        response = client.post(f"/v1/predictions/production-runs/{uuid4()}?model_id=missing")
    assert response.status_code == 422
    assert "duplicate metric" in response.json()["detail"]

