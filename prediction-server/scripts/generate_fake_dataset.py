import argparse
from pathlib import Path

from prediction_server.development.fake_dataset import build_fake_current_schema_dataset


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    parser.add_argument("--records", type=int, default=40)
    args = parser.parse_args()
    dataset = build_fake_current_schema_dataset(args.records)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(dataset.model_dump_json(indent=2, by_alias=True), encoding="utf-8")


if __name__ == "__main__":
    main()
