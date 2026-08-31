import numpy as np

from .prediction_service import PredictionService
from .schemas import (
    Component,
    Formula,
    OptimizationResponse,
    OptimizeRequest,
    PredictionInput,
)


class OptimizationService:
    def __init__(self, prediction_service: PredictionService):
        self.prediction_service = prediction_service

    def optimize(self, request: OptimizeRequest) -> OptimizationResponse:
        bundle = self.prediction_service.registry.load(request.model_id)
        unknown_targets = sorted(set(request.targets) - set(bundle.models))
        if unknown_targets:
            raise ValueError(f"model does not predict targets: {', '.join(unknown_targets)}")

        generator = np.random.default_rng(request.random_seed)
        best: tuple[float, PredictionInput, dict[str, float]] | None = None
        for _ in range(request.iterations):
            percentages = self._sample_composition(request, generator)
            process = dict(request.fixed_process)
            process.update({
                name: float(generator.uniform(bounds.minimum, bounds.maximum))
                for name, bounds in request.process_ranges.items()
            })
            candidate = PredictionInput(
                formula=Formula(components=[
                    Component(
                        material_id=bounds.material_id,
                        material_code=bounds.material_code,
                        supplier_id=bounds.supplier_id,
                        material_lot_id=bounds.material_lot_id,
                        percentage=float(value),
                    )
                    for bounds, value in zip(request.materials, percentages, strict=True)
                ]),
                machine_id=request.machine_id,
                machine_code=request.machine_code,
                mold_id=request.mold_id,
                mold_code=request.mold_code,
                environment_observations=request.environment_observations,
                process=process,
            )
            predictions = self.prediction_service.predict_with_bundle(bundle, candidate)
            objective = sum(
                target.weight * ((predictions[name] - target.target) / target.tolerance) ** 2
                for name, target in request.targets.items()
            )
            if best is None or objective < best[0]:
                best = (objective, candidate, predictions)

        if best is None:
            raise ValueError("no feasible candidate found")
        objective, candidate, predictions = best
        return OptimizationResponse(
            model_id=request.model_id,
            objective_score=round(objective, 6),
            formula=candidate.formula,
            process=candidate.process,
            predictions=predictions,
        )

    @staticmethod
    def _sample_composition(request: OptimizeRequest, generator: np.random.Generator) -> np.ndarray:
        minimums = np.asarray([item.minimum for item in request.materials], dtype=float)
        maximums = np.asarray([item.maximum for item in request.materials], dtype=float)
        result = minimums.copy()
        remaining = 100.0 - float(np.sum(result))
        order = generator.permutation(len(request.materials))
        for position, index in enumerate(order):
            future = order[position + 1:]
            if len(future) == 0:
                addition = remaining
            else:
                future_capacity = float(np.sum(maximums[future] - result[future]))
                lower = max(0.0, remaining - future_capacity)
                upper = min(float(maximums[index] - result[index]), remaining)
                addition = float(generator.uniform(lower, upper))
            result[index] += addition
            remaining -= addition
        return result
