# Prediction Server

Development API for formula outcome prediction and inverse formula optimization. It reads the current main-server PostgreSQL schema without modifying it.

## Run

```powershell
cd prediction-server
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn prediction_server.main:app --reload --port 4100
```

OpenAPI documentation is available at `http://127.0.0.1:4100/docs`.

Or run it as an isolated container:

```powershell
docker build -t amfpi-prediction-server .
docker run --rm -p 4100:4100 -v ${PWD}/.models:/app/.models amfpi-prediction-server
```

## Workflow

1. `POST /v1/models/train` with historical formula, process, and measured outcome records.
2. `POST /v1/predictions` with a formula and process settings.
3. `POST /v1/optimizations` with allowed materials, optional process ranges, and desired metric targets.

At least 20 complete training records are required. Formula percentages must total 100.

## Current database schema

Set `PREDICTION_DATABASE_URL`, then use:

1. `POST /v1/models/train/database` to train from completed/scored production runs.
2. `POST /v1/predictions/production-runs/{production_run_id}?model_id=...` to predict an existing run.

Training reads `formulations`, `formulation_components`, `production_runs`,
`production_run_material_lots`, `production_run_process_values`,
`process_parameter_definitions`, `run_metric_summaries`, and `metric_definitions`.
Temperature/humidity can later be supplied through the independent
`EnvironmentObservationSource` interface without changing these tables.

Generate deterministic fake data:

```powershell
python scripts/generate_fake_dataset.py tests/fixtures/fake_current_schema_dataset.json
```

Train a development-only dashboard model:

```powershell
python scripts/train_dev_demo_model.py
```
