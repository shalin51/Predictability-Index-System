import pytest
from pydantic import ValidationError

from prediction_server.domain.schemas import Component, Formula, MaterialBound, OptimizeRequest


def test_formula_requires_one_hundred_percent() -> None:
    with pytest.raises(ValidationError, match="must total 100"):
        Formula(components=[Component(material_code="A", percentage=99)])


def test_formula_rejects_duplicate_materials() -> None:
    with pytest.raises(ValidationError, match="must be unique"):
        Formula(components=[
            Component(material_code="A", percentage=50),
            Component(material_code="A", percentage=50),
        ])


def test_optimizer_rejects_infeasible_bounds() -> None:
    with pytest.raises(ValidationError, match="cannot reach 100"):
        OptimizeRequest(
            model_id="model",
            materials=[MaterialBound(material_code="A", maximum=90)],
            targets={"hardness": {"target": 50, "tolerance": 2}},
        )

