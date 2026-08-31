from uuid import NAMESPACE_URL, uuid5

from ..domain.schemas import TrainRequest


def _id(name: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"amfpi-fake/{name}"))


def build_fake_current_schema_dataset(record_count: int = 40) -> TrainRequest:
    if record_count < 20:
        raise ValueError("fake training dataset requires at least 20 records")

    records = []
    for index in range(record_count):
        resin = 30 + (index % 21)
        injection_speed = 34 + (index % 11) * 1.5
        injection_pressure = 850 + (index % 13) * 25
        cooling_time = 18 + (index % 8)
        records.append({
            "production_run_id": _id(f"production-run-{index + 1}"),
            "formula": {
                "formulation_id": _id(f"formulation-{index + 1}"),
                "formulation_code": f"FAKE-{index + 1:03d}",
                "version_no": 1,
                "components": [
                    {
                        "material_id": _id("material-resin"),
                        "material_code": "FAKE-RESIN",
                        "supplier_id": _id("supplier-a"),
                        "percent_composition": resin,
                        "basis": "weight_percent",
                    },
                    {
                        "material_id": _id("material-filler"),
                        "material_code": "FAKE-FILLER",
                        "supplier_id": _id("supplier-b"),
                        "percent_composition": 100 - resin,
                        "basis": "weight_percent",
                    },
                ],
            },
            "machine_id": _id("machine-boy-125e"),
            "machine_code": "BOY-125E",
            "mold_id": _id("mold-boy-125e"),
            "mold_code": "BOY-125E-MOLD",
            "process_parameters": [
                {
                    "parameter_definition_id": _id("parameter-injection-speed"),
                    "parameter_key": "injection.speed",
                    "position_type": "stage",
                    "position_index": 1,
                    "position_label": "Stage 1",
                    "value_numeric": injection_speed,
                    "unit": "mm/s",
                },
                {
                    "parameter_definition_id": _id("parameter-injection-pressure"),
                    "parameter_key": "injection.pressure",
                    "position_type": "stage",
                    "position_index": 1,
                    "position_label": "Stage 1",
                    "value_numeric": injection_pressure,
                    "unit": "psi",
                },
                {
                    "parameter_definition_id": _id("parameter-cooling-time"),
                    "parameter_key": "cycle.cooling_time",
                    "value_numeric": cooling_time,
                    "unit": "sec",
                },
            ],
            "environment_observations": [],
            "outcomes": {
                "hardness": round(38 + resin * 0.28 + injection_pressure * 0.004 - cooling_time * 0.08, 5),
                "rebound": round(82 - resin * 0.18 + injection_speed * 0.09 - cooling_time * 0.06, 5),
            },
        })
    return TrainRequest(dataset_version="fake-current-schema-v1", records=records, random_seed=42)
