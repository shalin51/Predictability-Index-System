import math

import pytest

from prediction_server.domain.features import (
    categorical_columns,
    feature_columns,
    matrix,
    validate_consistent_types,
)


def test_matrix_fills_missing_numeric_feature_with_nan() -> None:
    rows = [{"a": 1.0, "b": 2.0}, {"a": 3.0}]
    columns = feature_columns(rows)
    categorical = categorical_columns(rows, columns)
    values = matrix(rows, columns, categorical)
    b_index = columns.index("b")
    assert math.isnan(values[1][b_index])
    assert values[0][b_index] == 2.0


def test_matrix_fills_missing_categorical_feature_with_missing_token() -> None:
    rows = [{"machine": "M-1"}, {}]
    columns = feature_columns(rows)
    categorical = categorical_columns(rows, columns)
    values = matrix(rows, columns, categorical)
    assert values[1][columns.index("machine")] == "__missing__"


def test_validate_consistent_types_rejects_mixed_numeric_and_text() -> None:
    rows = [{"melt_temperature": 180.0}, {"melt_temperature": "hot"}]
    columns = feature_columns(rows)
    with pytest.raises(ValueError, match="numeric and text"):
        validate_consistent_types(rows, columns)


def test_validate_consistent_types_allows_uniform_columns() -> None:
    rows = [{"melt_temperature": 180.0}, {"melt_temperature": 190.0}]
    columns = feature_columns(rows)
    validate_consistent_types(rows, columns)
