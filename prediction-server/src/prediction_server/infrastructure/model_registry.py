import json
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from catboost import CatBoostRegressor


@dataclass(frozen=True)
class ModelBundle:
    model_id: str
    dataset_version: str
    feature_columns: list[str]
    categorical_columns: list[str]
    models: dict[str, CatBoostRegressor]


class FileModelRegistry:
    def __init__(self, root: Path):
        self.root = root

    def save(self, bundle: ModelBundle) -> None:
        model_path = self.root / bundle.model_id
        model_path.mkdir(parents=True, exist_ok=False)
        targets: dict[str, str] = {}
        for index, (target, model) in enumerate(sorted(bundle.models.items())):
            filename = f"target-{index}.cbm"
            model.save_model(str(model_path / filename))
            targets[target] = filename
        metadata = {
            "model_id": bundle.model_id,
            "dataset_version": bundle.dataset_version,
            "feature_columns": bundle.feature_columns,
            "categorical_columns": bundle.categorical_columns,
            "targets": targets,
        }
        (model_path / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    def load(self, model_id: str) -> ModelBundle:
        model_path = self.root / self._validated_model_id(model_id)
        metadata_path = model_path / "metadata.json"
        if not metadata_path.is_file():
            raise FileNotFoundError(model_id)
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        models: dict[str, CatBoostRegressor] = {}
        for target, filename in metadata["targets"].items():
            model = CatBoostRegressor()
            model.load_model(str(model_path / filename))
            models[target] = model
        return ModelBundle(
            model_id=metadata["model_id"],
            dataset_version=metadata["dataset_version"],
            feature_columns=metadata["feature_columns"],
            categorical_columns=metadata["categorical_columns"],
            models=models,
        )

    @staticmethod
    def _validated_model_id(model_id: str) -> str:
        try:
            parsed = UUID(model_id)
        except ValueError as error:
            raise FileNotFoundError(model_id) from error
        if str(parsed) != model_id:
            raise FileNotFoundError(model_id)
        return model_id
