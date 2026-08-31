from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from .domain.optimization_service import OptimizationService
from .domain.prediction_service import PredictionService
from .domain.schemas import (
    OptimizationResponse,
    OptimizeRequest,
    DatabaseTrainRequest,
    PredictionInput,
    PredictionResponse,
    TrainRequest,
    TrainResponse,
)
from .infrastructure.current_schema_repository import CurrentSchemaRepository


def create_router(
    prediction_service: PredictionService,
    optimization_service: OptimizationService,
    current_schema_repository: CurrentSchemaRepository | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/v1")

    @router.post("/models/train", response_model=TrainResponse, status_code=201)
    def train(request: TrainRequest) -> TrainResponse:
        try:
            return prediction_service.train(request)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    if current_schema_repository is not None:
        @router.post("/models/train/database", response_model=TrainResponse, status_code=201)
        def train_from_database(request: DatabaseTrainRequest) -> TrainResponse:
            try:
                records = current_schema_repository.load_training_records(request.limit)
                if len(records) < 20:
                    raise HTTPException(
                        status_code=422,
                        detail=f"database returned {len(records)} complete runs; at least 20 are required",
                    )
                return prediction_service.train(TrainRequest(
                    dataset_version=request.dataset_version,
                    records=records,
                    random_seed=request.random_seed,
                ))
            except ValueError as error:
                raise HTTPException(status_code=422, detail=str(error)) from error

    @router.post("/predictions", response_model=PredictionResponse)
    def predict(request: PredictionInput, model_id: str = Query(min_length=1)) -> PredictionResponse:
        try:
            predictions = prediction_service.predict(model_id, request)
        except FileNotFoundError as error:
            raise HTTPException(status_code=404, detail="model not found") from error
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return PredictionResponse(model_id=model_id, predictions=predictions)

    if current_schema_repository is not None:
        @router.post("/predictions/production-runs/{production_run_id}", response_model=PredictionResponse)
        def predict_production_run(
            production_run_id: UUID,
            model_id: str = Query(min_length=1),
        ) -> PredictionResponse:
            try:
                value = current_schema_repository.load_prediction_input(production_run_id)
                predictions = prediction_service.predict(model_id, value)
            except FileNotFoundError as error:
                detail = "production run or model not found"
                raise HTTPException(status_code=404, detail=detail) from error
            except ValueError as error:
                raise HTTPException(status_code=422, detail=str(error)) from error
            return PredictionResponse(model_id=model_id, predictions=predictions)

    @router.post("/optimizations", response_model=OptimizationResponse)
    def optimize(request: OptimizeRequest) -> OptimizationResponse:
        try:
            return optimization_service.optimize(request)
        except FileNotFoundError as error:
            raise HTTPException(status_code=404, detail="model not found") from error
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    return router
