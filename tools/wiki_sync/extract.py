from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .common import (
    active_text,
    balanced_value,
    component_text,
    json_lore_lines,
    json_rich_text,
    lore_lines,
    normalize_identifier,
    object_field,
    parse_snbt_map,
    primitive,
    read_text,
    sha256_file,
    sha256_text,
    split_top_level,
)


PROP_NAMESPACE_RE = re.compile(r"^(?:general_props|props(?:_.+)?)$")
ITEM_COMMAND_RE = re.compile(
    r"(?:^|\s)(?:give\s+\S+|item\s+replace\s+.+?\s+with)\s+"
    r"(?P<item>(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+)\s*(?P<bracket>\[)",
    re.IGNORECASE,
)
EFFECT_COMMAND_RE = re.compile(
    r"(?:^|\s)(?:minecraft:)?effect\s+give\s+(?P<target>\S+)\s+"
    r"(?P<effect>(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+)"
    r"(?:\s+(?P<duration>\S+))?(?:\s+(?P<amplifier>\S+))?(?:\s+(?P<hide>\S+))?",
    re.IGNORECASE,
)


class SourceRegistry:
    """Deduplicated, byte-for-byte source payloads for the raw layer."""

    def __init__(self, root: Path, pack: str):
        self.root = root
        self.pack = pack
        self._records: dict[str, dict] = {}

    def add(self, path: Path, role: str) -> str:
        relative = path.relative_to(self.root).as_posix()
        # Decode without newline or BOM normalization so the JSON payload can
        # reproduce the original UTF-8 bytes exactly when encoded again.
        text = path.read_bytes().decode("utf-8")
        record = self._records.setdefault(
            relative,
            {
                "path": relative,
                "pack": self.pack,
                "sha256": sha256_file(path),
                "roles": [],
                "content": text,
            },
        )
        if role not in record["roles"]:
            record["roles"].append(role)
            record["roles"].sort()
        return relative

    def records(self) -> list[dict]:
        return [self._records[key] for key in sorted(self._records)]


def source_meta(path: Path, data_root: Path, source_id: str, kind: str) -> dict:
    relative = path.relative_to(data_root)
    namespace = relative.parts[0]
    function = ""
    if len(relative.parts) >= 3 and relative.parts[1] == "function":
        function = f"{namespace}:{Path(*relative.parts[2:]).with_suffix('').as_posix()}"
    return {
        "file": source_id,
        "namespace": namespace,
        "function": function,
        "kind": kind,
    }


def extract_item_commands(path: Path, data_root: Path, registry: SourceRegistry, kind: str) -> list[dict]:
    source_id = registry.add(path, f"item:{kind}")
    text = active_text(read_text(path))
    records: list[dict] = []
    for index, match in enumerate(ITEM_COMMAND_RE.finditer(text)):
        component_block, component_end = balanced_value(text, match.start("bracket"))
        components = parse_snbt_map(component_block)
        command_end = text.find("\n", component_end)
        if command_end < 0:
            command_end = len(text)
        command_start = text.rfind("\n", 0, match.start()) + 1
        command = text[command_start:command_end].strip()
        name_raw = components.get("custom_name") or components.get("item_name") or ""
        lore_raw = components.get("lore", "")
        name = component_text(name_raw).strip()
        lore = lore_lines(lore_raw)
        if not name and not lore:
            continue
        model = normalize_identifier(components.get("item_model", "") or match.group("item"))
        count_match = re.match(r"\s+(\d+)", text[component_end:command_end])
        records.append(
            {
                "recordId": f"{source_id}#{index + 1}",
                "source": source_meta(path, data_root, source_id, kind),
                "definition": {
                    "baseItem": normalize_identifier(match.group("item")),
                    "count": int(count_match.group(1)) if count_match else 1,
                    "components": components,
                },
                "presentation": {
                    "name": name,
                    "nameComponent": name_raw,
                    "lore": lore,
                    "loreComponent": lore_raw,
                    "itemModel": model,
                },
                "raw": {"command": command, "componentBlock": component_block},
            }
        )
    return records


def extract_prop_items(datapack: Path, registry: SourceRegistry) -> list[dict]:
    data_root = datapack / "data"
    records: list[dict] = []
    for namespace in sorted(data_root.iterdir()):
        if not namespace.is_dir() or not PROP_NAMESPACE_RE.match(namespace.name):
            continue
        for kind in ("give", "regive"):
            root = namespace / "function" / kind
            if not root.exists():
                continue
            for path in sorted(root.rglob("*.mcfunction")):
                records.extend(extract_item_commands(path, data_root, registry, kind))
    return records


def extract_recipe_result(record: dict, source_id: str, namespace: str) -> dict | None:
    result = record.get("result")
    if not isinstance(result, dict) or not result.get("id"):
        return None
    components = result.get("components") or {}
    if not isinstance(components, dict):
        components = {"_value": components}
    name_component = components.get("custom_name") or components.get("item_name") or ""
    lore_component = components.get("lore") or []
    name = json_rich_text(name_component).strip()
    lore = json_lore_lines(lore_component)
    model = normalize_identifier(str(components.get("item_model") or result.get("id")))
    return {
        "recordId": f"{source_id}#result",
        "source": {
            "file": source_id,
            "namespace": namespace,
            "function": "",
            "kind": "recipe",
        },
        "definition": {
            "baseItem": normalize_identifier(str(result["id"])),
            "count": int(result.get("count", 1)),
            "components": components,
        },
        "presentation": {
            "name": name,
            "nameComponent": name_component,
            "lore": lore,
            "loreComponent": lore_component,
            "itemModel": model,
        },
        "raw": {"json": result},
    }


def extract_recipes(datapack: Path, registry: SourceRegistry) -> tuple[list[dict], list[dict]]:
    data_root = datapack / "data"
    recipes: list[dict] = []
    item_records: list[dict] = []
    for namespace_dir in sorted(data_root.iterdir()):
        if namespace_dir.name == "minecraft" or not namespace_dir.is_dir():
            continue
        root = namespace_dir / "recipe"
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.json")):
            source_id = registry.add(path, "recipe")
            try:
                document = json.loads(read_text(path))
                error = None
            except json.JSONDecodeError as exc:
                document = None
                error = {"message": exc.msg, "line": exc.lineno, "column": exc.colno}
            recipe_id = f"{namespace_dir.name}:{path.relative_to(root).with_suffix('').as_posix()}"
            recipes.append(
                {
                    "id": recipe_id,
                    "source": source_id,
                    "document": document,
                    "parseError": error,
                }
            )
            if isinstance(document, dict):
                result = extract_recipe_result(document, source_id, namespace_dir.name)
                if result:
                    result["recipeId"] = recipe_id
                    item_records.append(result)
    return recipes, item_records


def extract_magic_properties(datapack: Path, registry: SourceRegistry) -> dict:
    path = datapack / "data" / "magic" / "function" / "magic_properties.mcfunction"
    if not path.exists():
        return {"source": None, "rawValue": "", "branches": {}}
    source_id = registry.add(path, "magic:properties")
    text = active_text(read_text(path))
    marker = re.search(r"magic_base\s+set\s+value\s*", text)
    payload, _ = balanced_value(text, marker.end()) if marker else ("", 0)
    branches: dict[str, dict] = {}
    for part in split_top_level(payload):
        assignment = None
        # Property keys are quoted numeric strings.
        match = re.match(r'\s*["\']?(\d+)["\']?\s*:\s*', part)
        if match:
            value, _ = balanced_value(part, match.end())
            assignment = (match.group(1), value)
        if not assignment:
            continue
        branch_id, raw = assignment
        fields = parse_snbt_map(raw.replace(":", "=", 0)) if False else {}
        # SNBT storage uses ':' rather than '='.
        for field in split_top_level(raw):
            match_field = re.match(r'\s*["\']?([\w.-]+)["\']?\s*:\s*(.*)', field, re.DOTALL)
            if match_field:
                fields[match_field.group(1)] = match_field.group(2).strip()
        branches[branch_id] = {
            "raw": raw,
            "fields": {key: primitive(value) for key, value in fields.items()},
        }
    return {"source": source_id, "rawValue": payload, "branches": branches}


def magic_variant_key(path: Path) -> tuple[int | None, str | None]:
    match = re.search(r"magic(\d+)(?:_)?(unlock|[a-z])(?:_give)?$", path.stem)
    if not match:
        return None, None
    return int(match.group(1)), match.group(2)


def extract_magic_unlocks(data_root: Path, registry: SourceRegistry) -> list[dict]:
    root = data_root / "magics" / "function" / "use"
    unlocks: list[dict] = []
    if not root.exists():
        return unlocks
    for path in sorted(root.rglob("*.mcfunction")):
        relative = path.relative_to(root)
        branch_match = re.match(r"(\d+)_", relative.parts[0]) if relative.parts else None
        if not branch_match:
            continue
        text = active_text(read_text(path))
        threshold_match = re.search(
            r"scoreboard\s+players\s+set\s+@s\[scores=\{witchProg=(\d+)\.\.\}\]\s+magic2\s+1",
            text,
        )
        minimum = int(threshold_match.group(1)) if threshold_match else None
        if minimum is None:
            # A few legacy branches grant B directly after this failure guard
            # instead of persisting magic2=1 (notably branch 19).
            guard_match = re.search(
                r"execute\s+if\s+entity\s+@s\[scores=\{witchProg=(?:-?\d+)?\.\.(-?\d+)\}\]\s+run\s+return",
                text,
            )
            if guard_match:
                minimum = int(guard_match.group(1)) + 1
        if minimum is None:
            continue
        unlocks.append(
            {
                "branchId": int(branch_match.group(1)),
                "variant": "b",
                "generation": "legacy",
                "objective": "witchProg",
                "minimumValue": minimum,
                "source": registry.add(path, "magic-unlock"),
            }
        )
    return unlocks


def extract_magics(datapack: Path, registry: SourceRegistry) -> dict:
    data_root = datapack / "data"
    roots = [
        (data_root / "magic" / "function" / "give", "modern"),
        (data_root / "magics" / "function" / "magic_give", "legacy"),
    ]
    variants: list[dict] = []
    for root, generation in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.mcfunction")):
            branch_id, key = magic_variant_key(path)
            if branch_id is None:
                continue
            records = extract_item_commands(path, data_root, registry, f"magic-{generation}")
            for item in records:
                variants.append(
                    {
                        "branchId": branch_id,
                        "variant": key,
                        "generation": generation,
                        "item": item,
                    }
                )

    names: dict[str, str] = {}
    listen = data_root / "magics" / "function" / "effection" / "6_listen" / "magic6a_times_6_at.mcfunction"
    if listen.exists():
        registry.add(listen, "magic:names")
        for line in active_text(read_text(listen)).splitlines():
            id_match = re.search(r"MagicSort\s+matches\s+(\d+)", line)
            texts = re.findall(r'(?:"text"|text)\s*:\s*"((?:\\.|[^"\\])*)"', line)
            if id_match and texts:
                names[id_match.group(1)] = bytes(texts[-1], "utf-8").decode("unicode_escape") if "\\u" in texts[-1] else texts[-1]
    return {
        "variants": variants,
        "unlocks": extract_magic_unlocks(data_root, registry),
        "names": names,
        "properties": extract_magic_properties(datapack, registry),
    }


def extract_tasks(datapack: Path, registry: SourceRegistry) -> list[dict]:
    data_root = datapack / "data"
    root = data_root / "tasks" / "function"
    records: list[dict] = []
    marker_re = re.compile(r"function\s+tasks:task_frame/task_msg\s*")
    for path in sorted(root.rglob("*.mcfunction")):
        text = active_text(read_text(path))
        for index, marker in enumerate(marker_re.finditer(text)):
            payload, _ = balanced_value(text, marker.end())
            source_id = registry.add(path, "task")
            fields = {
                "name": object_field(payload, "task_name"),
                "type": object_field(payload, "task_type"),
                "background": object_field(payload, "task_bg"),
                "objective": object_field(payload, "task_desc"),
                "reward": object_field(payload, "task_award"),
                "punishment": object_field(payload, "task_fail"),
            }
            records.append(
                {
                    "recordId": f"{source_id}#{index + 1}",
                    "source": source_id,
                    "category": path.relative_to(root).parent.as_posix(),
                    "fields": fields,
                    "rawPayload": payload,
                }
            )
    return records


def extract_talents(datapack: Path, registry: SourceRegistry) -> list[dict]:
    data_root = datapack / "data"
    root = data_root / "talent" / "function"
    storage_path = root / "api" / "descript" / "talent_desc_storage.mcfunction"
    give_path = root / "talent_give" / "give.mcfunction"
    storage_source = registry.add(storage_path, "talent:descriptions")
    give_source = registry.add(give_path, "talent:selection")
    storage_text = active_text(read_text(storage_path))
    give_text = active_text(read_text(give_path))
    function_map: dict[int, str] = {}
    for match in re.finditer(r"TalentSort\s+matches\s+(\d+)\s+run\s+function\s+([\w:/.-]+)", give_text):
        function_map[int(match.group(1))] = match.group(2)

    icon_map: dict[int, dict] = {}
    guide = data_root / "guide" / "advancement" / "talent"
    if guide.exists():
        for path in sorted(guide.glob("*.json")):
            if not path.stem.isdigit():
                continue
            source = registry.add(path, "talent:icon")
            try:
                document = json.loads(read_text(path))
            except json.JSONDecodeError:
                continue
            icon_map[int(path.stem)] = {"source": source, "icon": document.get("display", {}).get("icon")}

    records: list[dict] = []
    pattern = re.compile(r"data\s+modify\s+storage\s+talent:data\s+desc\.(\d+)\s+set\s+value\s*")
    for match in pattern.finditer(storage_text):
        talent_id = int(match.group(1))
        payload, _ = balanced_value(storage_text, match.end())
        function = function_map.get(talent_id, "")
        implementation = ""
        if function.startswith("talent:"):
            candidate = data_root / "talent" / "function" / f"{function.split(':', 1)[1]}.mcfunction"
            if candidate.exists():
                implementation = registry.add(candidate, "talent:implementation")
        records.append(
            {
                "id": talent_id,
                "fields": {
                    "name": object_field(payload, "name"),
                    "color": object_field(payload, "name_color"),
                    "effect": object_field(payload, "hover"),
                    "description": object_field(payload, "desc"),
                },
                "function": function,
                "icon": icon_map.get(talent_id),
                "sources": [source for source in (storage_source, give_source, implementation) if source],
                "rawPayload": payload,
            }
        )
    return records


def extract_damage(datapack: Path, registry: SourceRegistry) -> list[dict]:
    root = datapack / "data" / "damage" / "function" / "damages"
    records: list[dict] = []
    for directory in sorted(path for path in root.iterdir() if path.is_dir()):
        sources: list[str] = []
        messages: list[str] = []
        objectives: set[str] = set()
        commands: set[str] = set()
        for path in sorted(directory.rglob("*.mcfunction")):
            sources.append(registry.add(path, "damage"))
            text = active_text(read_text(path))
            for line in text.splitlines():
                command = line.strip().split(" ", 1)[0]
                if command:
                    commands.add(command.removeprefix("$"))
                objectives.update(re.findall(r"scores=\{([\w.-]+)=", line))
                objectives.update(re.findall(r"score\s+\S+\s+([\w.-]+)", line))
                if re.search(r"\b(?:tellraw|title)\b", line):
                    for text_match in re.finditer(r'(?:"text"|text)\s*:\s*"((?:\\.|[^"\\])*)"', line):
                        value = text_match.group(1).replace(r"\n", "\n").strip()
                        if value and value != "*" and "$" not in value and value not in messages:
                            messages.append(value)
        records.append(
            {
                "id": directory.name,
                "sources": sources,
                "messages": messages,
                "scoreboardObjectives": sorted(objectives),
                "commandKinds": sorted(commands),
            }
        )
    return records


def extract_tutorials(datapack: Path, registry: SourceRegistry) -> list[dict]:
    root = datapack / "data" / "lobby" / "function" / "tutorials"
    records: list[dict] = []
    for directory in sorted(path for path in root.iterdir() if path.is_dir()):
        documents = []
        functions = []
        for path in sorted(directory.rglob("*")):
            if not path.is_file():
                continue
            if path.suffix.lower() == ".md":
                source = registry.add(path, "tutorial:document")
                documents.append({"name": path.name, "source": source, "content": read_text(path)})
            elif path.suffix.lower() == ".mcfunction":
                source = registry.add(path, "tutorial:function")
                functions.append({"name": path.name, "source": source, "content": read_text(path)})
        records.append({"id": directory.name, "documents": documents, "functions": functions})
    return records


def wiki_module_roots(data_root: Path) -> list[Path]:
    roots = [
        path for path in data_root.iterdir()
        if path.is_dir() and (PROP_NAMESPACE_RE.match(path.name) or path.name in {"magic", "magics", "talent", "tasks", "damage"})
    ]
    tutorial_root = data_root / "lobby" / "function" / "tutorials"
    if tutorial_root.exists():
        roots.append(tutorial_root)
    return roots


def extract_effects(datapack: Path, registry: SourceRegistry) -> list[dict]:
    data_root = datapack / "data"
    records: list[dict] = []
    for root in wiki_module_roots(data_root):
        for path in sorted(root.rglob("*.mcfunction")):
            text = active_text(read_text(path))
            for line_number, line in enumerate(text.splitlines(), 1):
                for match in EFFECT_COMMAND_RE.finditer(line):
                    source = registry.add(path, "effect-command")
                    records.append(
                        {
                            "recordId": f"{source}#L{line_number}",
                            "source": source,
                            "effect": normalize_identifier(match.group("effect")),
                            "target": match.group("target"),
                            "duration": primitive(match.group("duration") or ""),
                            "amplifier": primitive(match.group("amplifier") or ""),
                            "hideParticles": primitive(match.group("hide") or ""),
                            "rawCommand": line.strip(),
                        }
                    )
    return records


def extract_all(datapack: Path) -> tuple[dict, SourceRegistry]:
    registry = SourceRegistry(datapack, "datapack")
    recipes, recipe_items = extract_recipes(datapack, registry)
    prop_items = extract_prop_items(datapack, registry)
    raw = {
        "items": {"records": [*prop_items, *recipe_items]},
        "recipes": {"records": recipes},
        "magics": extract_magics(datapack, registry),
        "tasks": {"records": extract_tasks(datapack, registry)},
        "talents": {"records": extract_talents(datapack, registry)},
        "damage": {"records": extract_damage(datapack, registry)},
        "effects": {"records": extract_effects(datapack, registry)},
        "tutorials": {"records": extract_tutorials(datapack, registry)},
    }
    # The normalized records intentionally expose only stable, user-facing
    # fields. The raw layer keeps every implementation file from the modules
    # represented by the Wiki so mechanics that are not yet understood by the
    # normalizer are still exported verbatim.
    data_root = datapack / "data"
    for root in wiki_module_roots(data_root):
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            try:
                registry.add(path, "module-source")
            except UnicodeDecodeError as exc:
                raise ValueError(f"Binary module source requires an explicit exporter: {path}") from exc
    return raw, registry
