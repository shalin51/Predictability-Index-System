from uuid import uuid4

import numpy as np
from catboost import CatBoostRegressor

from ..infrastructure.model_registry import FileModelRegistry, ModelBundle
from .features import categorical_columns, feature_columns, flatten_input, matrix, validate_consistent_types
from .schemas import MetricEvaluation, PredictionInput, TrainRequest, TrainResponse


class PredictionService:
    def __init__(self, registry: FileModelRegistry):
        self.registry = registry

    def train(self, request: TrainRequest) -> TrainResponse:
        if not request.records:
            raise ValueError("training request has no records")
        target_metrics = sorted(set.intersection(*(set(record.outcomes) for record in request.records)))
        if not target_metrics:
            raise ValueError("training records have no common outcome metrics")

        rows = [flatten_input(record) for record in request.records]
        columns = feature_columns(rows)
        validate_consistent_types(rows, columns)
        categorical = categorical_columns(rows, columns)
        values = matrix(rows, columns, categorical)
        category_indices = [columns.index(column) for column in categorical]
        train_indices, validation_indices = self._split_indices(len(rows), request.random_seed)
        models: dict[str, CatBoostRegressor] = {}
        evaluations: dict[str, MetricEvaluation] = {}

        for metric in target_metrics:
            outcomes = np.asarray([record.outcomes[metric] for record in request.records], dtype=float)
            evaluation_model = self._new_model(request.random_seed)
            evaluation_model.fit(
                [values[index] for index in train_indices],
                outcomes[train_indices],
                cat_features=category_indices,
            )
            predicted = np.asarray(evaluation_model.predict([values[index] for index in validation_indices]))
            actual = outcomes[validation_indices]
            mae = float(np.mean(np.abs(actual - predicted)))
            denominator = float(np.sum((actual - np.mean(actual)) ** 2))
            r2 = None if denominator == 0 else 1 - float(np.sum((actual - predicted) ** 2)) / denominator
            evaluations[metric] = MetricEvaluation(mae=round(mae, 6), r2=None if r2 is None else round(r2, 6))
            model = self._new_model(request.random_seed)
            model.fit(values, outcomes, cat_features=category_indices)
            models[metric] = model

        model_id = str(uuid4())
        self.registry.save(ModelBundle(
            model_id=model_id,
            dataset_version=request.dataset_version,
            feature_columns=columns,
            categorical_columns=categorical,
            models=models,
        ))
        return TrainResponse(
            model_id=model_id,
            dataset_version=request.dataset_version,
            record_count=len(request.records),
            target_metrics=target_metrics,
            validation=evaluations,
        )

    def predict(self, model_id: str, value: PredictionInput) -> dict[str, float]:
        bundle = self.registry.load(model_id)
        return self.predict_with_bundle(bundle, value)

    @staticmethod
    def predict_with_bundle(bundle: ModelBundle, value: PredictionInput) -> dict[str, float]:
        row = flatten_input(value)
        values = matrix([row], bundle.feature_columns, bundle.categorical_columns)
        return {
            metric: round(float(model.predict(values)[0]), 6)
            for metric, model in bundle.models.items()
        }

    @staticmethod
    def _split_indices(count: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
        generator = np.random.default_rng(seed)
        indices = generator.permutation(count)
        validation_count = max(2, round(count * 0.2))
        if count - validation_count < 1:
            raise ValueError(f"not enough records ({count}) to create a train/validation split")
        return indices[validation_count:], indices[:validation_count]

    @staticmethod
    def _new_model(seed: int) -> CatBoostRegressor:
        return CatBoostRegressor(
            depth=6,
            iterations=300,
            learning_rate=0.05,
            loss_function="RMSE",
            random_seed=seed,
            verbose=False,
            allow_writing_files=False,
        )
