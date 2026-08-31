from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import create_router
from .config import get_settings
from .domain.optimization_service import OptimizationService
from .domain.prediction_service import PredictionService
from .infrastructure.model_registry import FileModelRegistry
from .infrastructure.current_schema_repository import CurrentSchemaRepository


settings = get_settings()
registry = FileModelRegistry(settings.model_dir)
prediction_service = PredictionService(registry)
optimization_service = OptimizationService(prediction_service)
current_schema_repository = (
    CurrentSchemaRepository(settings.database_url)
    if settings.database_url
    else None
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="AMFPI Prediction Server",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


app.include_router(create_router(
    prediction_service,
    optimization_service,
    current_schema_repository,
))
