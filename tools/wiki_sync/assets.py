from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from .common import normalize_identifier, read_text, sha256_file
from .extract import SourceRegistry


WIKI_ROOT = Path(__file__).resolve().parents[2]
ICON_RENDERER = WIKI_ROOT / "tools" / "render-item-icons.ts"


def load_json(path: Path) -> dict:
    try:
        return json.loads(read_text(path))
    except (json.JSONDecodeError, OSError):
        return {}


def model_references(data: Any) -> list[str]:
    references: list[str] = []
    if isinstance(data, dict):
        if data.get("type") == "minecraft:model" and isinstance(data.get("model"), str):
            references.append(data["model"])
        for value in data.values():
            references.extend(model_references(value))
    elif isinstance(data, list):
        for value in data:
            references.extend(model_references(value))
    return list(dict.fromkeys(references))


def collect_model_file_dependencies(
    resource: Path,
    model: str,
    registry: SourceRegistry,
    dependencies: list[str],
    seen: set[str],
) -> None:
    model = normalize_identifier(model)
    if not model or model in seen:
        return
    seen.add(model)
    namespace, model_path = model.split(":", 1)
    path = resource / "assets" / namespace / "models" / f"{model_path}.json"
    if not path.exists():
        return
    dependencies.append(registry.add(path, "item-model"))
    parent = load_json(path).get("parent")
    if isinstance(parent, str) and parent and not parent.startswith("builtin/"):
        collect_model_file_dependencies(resource, parent, registry, dependencies, seen)


def collect_resource_dependencies(
    resource: Path,
    model: str,
    base_item: str,
    registry: SourceRegistry,
) -> list[str]:
    identifier = normalize_identifier(model or base_item)
    if not identifier:
        return []
    namespace, item_path = identifier.split(":", 1)
    definition = resource / "assets" / namespace / "items" / f"{item_path.removeprefix('item/')}.json"
    if not definition.exists():
        return []
    dependencies = [registry.add(definition, "item-definition")]
    seen: set[str] = set()
    for reference in model_references(load_json(definition).get("model")):
        collect_model_file_dependencies(resource, reference, registry, dependencies, seen)
    return list(dict.fromkeys(dependencies))


def same_file(left: Path, right: Path) -> bool:
    if not left.exists() or not right.exists() or left.stat().st_size != right.stat().st_size:
        return False
    digest = lambda path: hashlib.sha256(path.read_bytes()).digest()
    return digest(left) == digest(right)


def copy_if_changed(source: Path, target: Path, check: bool) -> bool:
    if same_file(source, target):
        return False
    if not check:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    return True


def render_icons(records: list[dict], resource: Path, public: Path, check: bool) -> dict:
    request = {
        "resourceRoot": str(resource),
        "publicRoot": str(public),
        "check": check,
        "records": records,
    }
    with tempfile.TemporaryDirectory(prefix="manosaba-wiki-icons-") as temporary:
        temporary_root = Path(temporary)
        request_path = temporary_root / "request.json"
        result_path = temporary_root / "result.json"
        request_path.write_text(json.dumps(request, ensure_ascii=False), encoding="utf-8")
        completed = subprocess.run(
            [
                "node",
                "--no-warnings",
                "--experimental-strip-types",
                str(ICON_RENDERER),
                str(request_path),
                str(result_path),
            ],
            cwd=WIKI_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        if completed.returncode != 0 or not result_path.exists():
            detail = "\n".join(value for value in (completed.stdout.strip(), completed.stderr.strip()) if value)
            raise RuntimeError(f"TypeScript item icon renderer failed:\n{detail}")
        return json.loads(result_path.read_text(encoding="utf-8"))


def sync_domain_assets(
    domain: dict,
    resource: Path,
    public: Path,
    check: bool,
) -> tuple[dict, SourceRegistry, list[dict], int, list[str]]:
    registry = SourceRegistry(resource, "resource")
    binary_assets: list[dict] = []
    changed = 0

    # Keep the full resource-side item catalog in the lossless raw layer.
    for path in sorted((resource / "assets").rglob("*.json")):
        relative = path.relative_to(resource).as_posix()
        if "/items/" in f"/{relative}" or "/models/item/" in f"/{relative}":
            registry.add(path, "resource-catalog")
    for source in sorted((resource / "assets").rglob("*.png")):
        relative = source.relative_to(resource)
        if "textures" not in relative.parts or "item" not in relative.parts:
            continue
        namespace = relative.parts[1]
        item_index = relative.parts.index("item")
        item_path = Path(*relative.parts[item_index + 1 :])
        target = public / "assets" / "source" / namespace / "item" / item_path
        changed += int(copy_if_changed(source, target, check))
        binary_assets.append(
            {
                "kind": "source-item-texture",
                "source": relative.as_posix(),
                "target": target.relative_to(public).as_posix(),
                "sha256": sha256_file(source),
            }
        )

    requests: list[dict] = []
    request_by_key: dict[str, dict] = {}
    targets: dict[str, tuple[dict, list[str]]] = {}

    def queue(record: dict, asset_kind: str, key: str) -> None:
        minecraft = record["minecraft"]
        dependencies = collect_resource_dependencies(
            resource,
            minecraft.get("itemModel", ""),
            minecraft.get("baseItem", ""),
            registry,
        )
        request = {
            "key": key,
            "kind": asset_kind,
            "name": record.get("name", record.get("id", key)),
            "itemModel": minecraft.get("itemModel"),
            "baseItem": minecraft.get("baseItem"),
            "components": minecraft.get("components") or {},
            "target": record["image"]["path"],
        }
        targets[key] = (record, dependencies)
        requests.append(request)
        request_by_key[key] = request

    for index, item in enumerate(domain["items"]):
        queue(item, "item-icon", f"item:{index}")
    for magic_index, magic in enumerate(domain["magics"]):
        for variant_index, variant in enumerate(magic["variants"]):
            queue(variant, "magic-icon", f"magic:{magic_index}:{variant_index}")

    rendered = render_icons(requests, resource, public, check)
    changed += int(rendered.get("changedCount", 0))
    diagnostics: list[str] = []
    for result in rendered.get("records", []):
        key = result.get("key", "")
        target_record = targets.get(key)
        request = request_by_key.get(key)
        if not target_record or not request:
            continue
        record, dependencies = target_record
        compatibility_fallback = result.get("compatibilityFallback")
        if compatibility_fallback and compatibility_fallback.get("type") == "item-model":
            dependencies.extend(
                collect_resource_dependencies(
                    resource,
                    compatibility_fallback.get("target", ""),
                    "",
                    registry,
                )
            )
        elif compatibility_fallback and compatibility_fallback.get("type") == "texture":
            texture = normalize_identifier(compatibility_fallback.get("target", ""))
            if texture:
                namespace, texture_path = texture.split(":", 1)
                path = resource / "assets" / namespace / "textures" / f"{texture_path}.png"
                if path.exists():
                    dependencies.append(path.relative_to(resource).as_posix())
        elif compatibility_fallback and compatibility_fallback.get("type") == "archived-texture":
            archived = resource / compatibility_fallback.get("target", "")
            if archived.is_file():
                dependencies.append(archived.relative_to(resource).as_posix())
        if result.get("displayPlaceholder"):
            placeholder = resource / "assets" / "manosaba" / "textures" / "item" / "missingno.png"
            if placeholder.is_file():
                dependencies.append(placeholder.relative_to(resource).as_posix())
        dependencies = list(dict.fromkeys(dependencies))
        record["image"].update(
            {
                "resolved": bool(result.get("resolved")),
                "source": result.get("source"),
                "sha256": result.get("sha256"),
                "resourceDependencies": dependencies,
                "renderer": result.get("renderer"),
                "minecraftVersion": result.get("minecraftVersion"),
                "missingDefinition": bool(result.get("missingDefinition")),
                "sourceDefinitionMissing": bool(result.get("sourceDefinitionMissing")),
                "unresolvedResource": bool(result.get("unresolvedResource")),
                "displayPlaceholder": bool(result.get("displayPlaceholder")),
                "compatibilityFallback": compatibility_fallback,
            }
        )
        if result.get("diagnostic"):
            diagnostics.append(result["diagnostic"])
        if result.get("resolved") and result.get("sha256"):
            binary_assets.append(
                {
                    "kind": request["kind"],
                    "source": result.get("source"),
                    "target": result.get("target"),
                    "sha256": result.get("sha256"),
                    "renderer": result.get("renderer"),
                    "minecraftVersion": result.get("minecraftVersion"),
                }
            )

    sounds_root = resource / "assets" / "manosaba" / "sounds"
    public_sounds = public / "assets" / "sounds"
    if sounds_root.exists() and public_sounds.exists():
        for target in sorted(public_sounds.glob("*.ogg")):
            source = sounds_root / target.name
            if not source.exists():
                continue
            changed += int(copy_if_changed(source, target, check))
            binary_assets.append(
                {
                    "kind": "sound",
                    "source": source.relative_to(resource).as_posix(),
                    "target": target.relative_to(public).as_posix(),
                    "sha256": sha256_file(source),
                }
            )
    binary_assets.sort(key=lambda asset: (asset["kind"], asset["target"]))
    return domain, registry, binary_assets, changed, diagnostics
