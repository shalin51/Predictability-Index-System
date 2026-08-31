"""Train a deterministic development-only model from the bundled fake dataset."""

import json
from pathlib import Path

from prediction_server.development.fake_dataset import build_fake_current_schema_dataset
from prediction_server.domain.prediction_service import PredictionService
from prediction_server.infrastructure.model_registry import FileModelRegistry


def main() -> None:
    result = PredictionService(FileModelRegistry(Path('.models'))).train(
        build_fake_current_schema_dataset()
    )
    print(json.dumps({
        'dataset_version': result.dataset_version,
        'model_id': result.model_id,
        'record_count': result.record_count,
        'target_metrics': result.target_metrics,
    }))


if __name__ == '__main__':
    main()
