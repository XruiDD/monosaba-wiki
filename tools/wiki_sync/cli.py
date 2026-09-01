from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from . import SCHEMA_VERSION
from .assets import sync_domain_assets
from .common import json_document, read_text, sha256_file
from .domain import build_domain, magic_lore_stats, magic_unlock_condition
from .extract import extract_all


WIKI_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = WIKI_ROOT.parent
DEFAULT_DATAPACK = WORKSPACE_ROOT / "datapacks" / "manosaba"
DEFAULT_RESOURCE = WORKSPACE_ROOT / "resource"
DEFAULT_OVERRIDES = WIKI_ROOT / "wiki" / "overrides.json"
PUBLIC_ROOT = WIKI_ROOT / "public"
RAW_ROOT = PUBLIC_ROOT / "data" / "raw"
DOMAIN_ROOT = PUBLIC_ROOT / "data" / "domain"


def load_json(path: Path) -> dict:
    try:
        return json.loads(read_text(path))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc


def write_if_changed(path: Path, content: str, check: bool) -> bool:
    if path.exists() and read_text(path) == content:
        return False
    if not check:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
    return True


def wrap(records: Any, source: str) -> dict:
    count = len(records) if hasattr(records, "__len__") else None
    return {"schemaVersion": SCHEMA_VERSION, "source": source, "recordCount": count, "records": records}


def validate(
    raw: dict,
    domain: dict,
    datapack_sources: list[dict],
    hidden_item_record_ids: set[str],
) -> list[str]:
    errors: list[str] = []
    source_ids = {source["path"] for source in datapack_sources}
    for name, records in domain.items():
        ids = [str(record.get("id")) for record in records]
        duplicates = sorted({record_id for record_id in ids if ids.count(record_id) > 1})
        if duplicates:
            errors.append(f"domain/{name}: duplicate ids: {', '.join(duplicates)}")

    raw_item_ids = {record["recordId"] for record in raw["items"]["records"]}
    referenced_item_ids = {source["recordId"] for item in domain["items"] for source in item.get("sources", [])}
    missing_item_refs = referenced_item_ids - raw_item_ids
    if missing_item_refs:
        errors.append(f"items: {len(missing_item_refs)} domain sources missing from raw layer")
    named_raw_item_ids = {
        record["recordId"] for record in raw["items"]["records"] if record["presentation"].get("name")
    }
    unmapped_raw_items = named_raw_item_ids - referenced_item_ids - hidden_item_record_ids
    if unmapped_raw_items:
        errors.append(f"items: {len(unmapped_raw_items)} named raw definitions are not represented in the domain layer")

    for section in ("tasks", "talents", "damage"):
        for record in domain[section]:
            sources = record.get("sources") or ([record["source"]] if record.get("source") else [])
            for source in sources:
                if source not in source_ids:
                    errors.append(f"{section}/{record['id']}: missing source {source}")

    for tutorial in domain["tutorials"]:
        for source in [
            *(document["source"] for document in tutorial.get("documents", [])),
            *tutorial.get("functionSources", []),
        ]:
            if source not in source_ids:
                errors.append(f"tutorials/{tutorial['id']}: missing source {source}")

    modern_branches = {record["branchId"] for record in raw["magics"]["variants"] if record["generation"] == "modern"}
    selected_generation = {record["id"]: record["generation"] for record in domain["magics"]}
    for branch in modern_branches:
        if selected_generation.get(branch) != "modern":
            errors.append(f"magics/{branch}: modern source exists but was not selected")
    domain_magics = {record["id"]: record for record in domain["magics"]}
    raw_magic_branches = {record["branchId"] for record in raw["magics"]["variants"]}
    if raw_magic_branches != set(domain_magics):
        errors.append("magics: raw and domain branch sets differ")
    for branch_id, magic in domain_magics.items():
        expected_generation = magic["generation"]
        expected_variants = {
            record["variant"] for record in raw["magics"]["variants"]
            if record["branchId"] == branch_id and record["generation"] == expected_generation
        }
        expected_variants.discard("unlock")
        if expected_variants != {variant["id"] for variant in magic["variants"]}:
            errors.append(f"magics/{branch_id}: normalized variant set differs from selected raw generation")
        unlock_conditions = {
            magic_lore_stats(record["item"]["presentation"].get("lore", []))["unlockCondition"]
            for record in raw["magics"]["variants"]
            if record["branchId"] == branch_id
            and record["generation"] == expected_generation
            and record["variant"] == "unlock"
        }
        unlock_conditions.discard(None)
        if len(unlock_conditions) > 1:
            errors.append(f"magics/{branch_id}: selected raw generation has conflicting unlock conditions")
            continue
        expected_unlock_condition = magic_unlock_condition(
            raw["magics"], branch_id, expected_generation, next(iter(unlock_conditions), None)
        )
        b_variant = next((variant for variant in magic["variants"] if variant["id"] == "b"), None)
        actual_unlock_condition = b_variant["stats"]["unlockCondition"] if b_variant else None
        if actual_unlock_condition != expected_unlock_condition:
            errors.append(f"magics/{branch_id}: B variant unlock condition differs from selected raw generation")
        for source in b_variant.get("unlockSources", []) if b_variant else []:
            if source not in source_ids:
                errors.append(f"magics/{branch_id}: missing unlock source {source}")
        c_variant = next((variant for variant in magic["variants"] if variant["id"] == "c"), None)
        modern_unlock_value = magic["profile"].get("unlockValue") if expected_generation == "modern" else None
        expected_c_condition = (
            f"压力值大于 {modern_unlock_value} 后，丢出联携术即可解锁"
            if c_variant and modern_unlock_value is not None else None
        )
        actual_c_condition = c_variant["stats"]["unlockCondition"] if c_variant else None
        if actual_c_condition != expected_c_condition:
            errors.append(f"magics/{branch_id}: C variant unlock condition differs from modern property source")
        if any(
            variant["id"] not in {"b", "c"} and variant["stats"].get("unlockCondition") is not None
            for variant in magic["variants"]
        ):
            errors.append(f"magics/{branch_id}: unlock condition is attached to an unsupported variant")
        for source in c_variant.get("unlockSources", []) if c_variant else []:
            if source not in source_ids:
                errors.append(f"magics/{branch_id}: missing C unlock source {source}")
    for recipe in domain["recipes"]:
        if recipe.get("parseError"):
            errors.append(f"recipes/{recipe['id']}: source JSON cannot be parsed")
    if len(raw["talents"]["records"]) != len(domain["talents"]):
        errors.append("talents: normalized record count differs from active raw records")
    return errors


def build_outputs(raw: dict, domain: dict, datapack_sources: list[dict], resource_sources: list[dict], binary_assets: list[dict], missing_assets: list[str], datapack: Path, resource: Path, overrides: Path) -> dict[Path, str]:
    catalog = {
        "schemaVersion": SCHEMA_VERSION,
        "pipeline": ["raw", "domain", "overrides"],
        "counts": {key: len(value) for key, value in domain.items()},
        "sources": {
            "datapack": {"path": "../datapacks/manosaba", "packMetaSha256": sha256_file(datapack / "pack.mcmeta")},
            "resource": {"path": "../resource", "packMetaSha256": sha256_file(resource / "pack.mcmeta")},
            "overrides": {"path": "wiki/overrides.json", "sha256": sha256_file(overrides)},
        },
        "datasets": {key: f"data/domain/{key}.json" for key in domain},
        "rawDatasets": {key: f"data/raw/{key}.json" for key in raw},
        "diagnostics": {"unresolvedAssets": missing_assets},
    }
    outputs: dict[Path, str] = {
        DOMAIN_ROOT / "catalog.json": json_document(catalog),
        RAW_ROOT / "source-files.json": json_document(wrap(datapack_sources, "datapack")),
        RAW_ROOT / "resource-files.json": json_document(wrap(resource_sources, "resource")),
        RAW_ROOT / "resource-assets.json": json_document(wrap(binary_assets, "resource")),
    }
    for name, records in domain.items():
        outputs[DOMAIN_ROOT / f"{name}.json"] = json_document(wrap(records, "domain"))
    for name, payload in raw.items():
        outputs[RAW_ROOT / f"{name}.json"] = json_document({"schemaVersion": SCHEMA_VERSION, "source": "datapack", **payload})
    return outputs


def run(datapack: Path, resource: Path, overrides_path: Path, check: bool) -> int:
    if not (datapack / "data").is_dir():
        raise SystemExit(f"Datapack not found: {datapack}")
    if not (resource / "assets").is_dir():
        raise SystemExit(f"Resource pack not found: {resource}")
    if not overrides_path.is_file():
        raise SystemExit(f"Wiki overrides not found: {overrides_path}")

    overrides = load_json(overrides_path)
    raw, datapack_registry = extract_all(datapack)
    domain, hidden_item_record_ids = build_domain(raw, overrides)
    domain, resource_registry, binary_assets, changed_assets, missing_assets = sync_domain_assets(
        domain, resource, PUBLIC_ROOT, check
    )
    datapack_sources = datapack_registry.records()
    resource_sources = resource_registry.records()
    errors = validate(raw, domain, datapack_sources, hidden_item_record_ids)
    if errors:
        for error in errors:
            print(f"[ERROR] {error}")
        return 2

    outputs = build_outputs(raw, domain, datapack_sources, resource_sources, binary_assets, missing_assets, datapack, resource, overrides_path)
    changed_files = []
    for path, content in outputs.items():
        if write_if_changed(path, content, check):
            changed_files.append(path.relative_to(WIKI_ROOT).as_posix())

    mode = "CHECK" if check else "WRITE"
    print(f"[{mode}] schema v{SCHEMA_VERSION}; raw source files: {len(datapack_sources)} + {len(resource_sources)}")
    print(
        f"[{mode}] items {len(domain['items'])} / recipes {len(domain['recipes'])} / "
        f"magics {len(domain['magics'])} / tasks {len(domain['tasks'])} / "
        f"talents {len(domain['talents'])} / damage {len(domain['damage'])} / "
        f"effects {len(domain['effects'])} / tutorials {len(domain['tutorials'])}"
    )
    print(f"[{mode}] changed data files: {len(changed_files)}; changed assets: {changed_assets}")
    for path in changed_files:
        print(f"  data: {path}")
    if missing_assets:
        print(f"[{mode}] unresolved assets: {len(missing_assets)}")
        for value in missing_assets[:40]:
            print(f"  ! {value}")
        if len(missing_assets) > 40:
            print(f"  ... and {len(missing_assets) - 40} more")
    return 1 if check and (changed_files or changed_assets) else 0


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Export lossless raw data and normalized Wiki domain records.")
    parser.add_argument("--datapack", type=Path, default=DEFAULT_DATAPACK)
    parser.add_argument("--resource", type=Path, default=DEFAULT_RESOURCE)
    parser.add_argument("--overrides", type=Path, default=DEFAULT_OVERRIDES)
    parser.add_argument("--check", action="store_true", help="Report drift without writing files")
    args = parser.parse_args(argv)
    return run(args.datapack.resolve(), args.resource.resolve(), args.overrides.resolve(), args.check)
