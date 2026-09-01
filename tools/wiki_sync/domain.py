from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .common import (
    component_text,
    deep_merge,
    json_lore_lines,
    json_rich_text,
    lore_lines,
    normalize_identifier,
    object_field,
    primitive,
    rich_lore_lines,
    sha256_text,
    slugify,
    split_top_level,
)


TAG_TO_CATEGORY = {
    "weapon": "weapon",
    "medicine": "medical",
    "medical": "medical",
    "food": "food",
    "tool": "tool",
    "clue": "clue",
    "key": "tool",
    "trap": "tool",
    "arcane": "arcane",
    "archive": "archive",
    "accessory": "accessory",
    "system": "system",
    "record": "archive",
    "magic props": "arcane",
    "magical props": "arcane",
    "weapon/magic props": "weapon",
    "weapon/magical props": "weapon",
    "magical weapon": "weapon",
    "ammo": "weapon",
}
TAG_TO_SUBCATEGORY = {
    "weapon": None,
    "medicine": None,
    "medical": None,
    "food": None,
    "tool": None,
    "clue": None,
    "key": "钥匙",
    "trap": "陷阱",
    "arcane": None,
    "archive": None,
    "accessory": None,
    "system": None,
    "record": "记录",
    "magic props": None,
    "magical props": None,
    "weapon/magic props": "魔法武器",
    "weapon/magical props": "魔法武器",
    "magical weapon": "魔法武器",
    "ammo": "弹药",
}
TERMINAL_METADATA_TAGS = {"scp-079"}
WEAPON_CATEGORY_TAGS = {"近战", "远程", "弹药", "魔法"}

MAGIC_VARIANT_ORDER = {"unlock": 0, "a": 1, "b": 2, "c": 3}
MAGIC_VARIANT_LABEL = {"unlock": "未解锁", "a": "通常术", "b": "联携术", "c": "解放术"}


def raw_component(components: dict, key: str) -> str:
    value = components.get(key)
    if value is None:
        return ""
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def component_number(components: dict, key: str) -> int | float | None:
    value = components.get(key)
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        parsed = primitive(value)
        return parsed if isinstance(parsed, (int, float)) else None
    return None


def object_number(raw: str, key: str) -> int | float | None:
    parsed = primitive(object_field(raw, key))
    return parsed if isinstance(parsed, (int, float)) else None


def object_bool(raw: str, key: str) -> bool | None:
    parsed = primitive(object_field(raw, key))
    return parsed if isinstance(parsed, bool) else None


def object_string(raw: str, key: str) -> str:
    value = object_field(raw, key)
    return str(primitive(value) if value else "")


def item_name_marker(components: dict) -> str:
    value = components.get("item_name")
    if isinstance(value, (dict, list)):
        return json_rich_text(value).strip().lower()
    if not isinstance(value, str):
        return ""
    if value[:1] in "[{":
        try:
            return json_rich_text(json.loads(value)).strip().lower()
        except json.JSONDecodeError:
            pass
    parsed = primitive(value)
    return parsed.strip().lower() if isinstance(parsed, str) else ""


def normalize_terminal_tag(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().replace("_", " "))


def lore_line_classification(value: str) -> tuple[str, str | None] | None:
    marker = normalize_terminal_tag(value)
    if marker in TAG_TO_CATEGORY:
        return TAG_TO_CATEGORY[marker], TAG_TO_SUBCATEGORY[marker]
    compact = marker.replace(" ", "")
    if compact in {"杂项", "其他", "其它"}:
        return "other", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*钥匙", compact):
        return "tool", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋|附魔)*材料", compact):
        return "material", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*(?:药物|药品|医疗)", compact):
        return "medical", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*食物", compact):
        return "food", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋|钝拙|锐利)*(?:近战|远程)(?:弹药)?", compact):
        return "weapon", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*(?:武器|弹药)", compact):
        return "weapon", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*(?:魔法|超自然)道具", compact):
        return "arcane", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*(?:医疗|药物|药品)道具", compact):
        return "medical", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*食物道具", compact):
        return "food", value.strip()
    if re.fullmatch(r"(?:独特|主动|被动|天赋)*道具", compact):
        return "prop", value.strip()
    return None


def classify_item(lore: list[str], components: dict) -> tuple[str, str | None, set[int]]:
    matches = [
        (index, classification[0], classification[1])
        for index, line in enumerate(lore)
        if (classification := lore_line_classification(line))
    ]
    classified_lines = {index for index, _, _ in matches}
    if item_name_marker(components) == "weapon":
        weapon_match = next((match for match in reversed(matches) if match[1] == "weapon"), None)
        selected = weapon_match or (matches[0] if matches else None)
        return "weapon", selected[2] if selected else None, classified_lines
    if not matches:
        return "other", None, classified_lines
    specific_matches = [match for match in matches if match[1] not in {"prop", "other"}]
    selected = specific_matches[-1] if specific_matches else matches[0]
    return selected[1], selected[2], classified_lines


def classify_item_group(
    records: list[dict],
    fallback_category: str,
    fallback_subcategory: str | None,
) -> tuple[str, str | None]:
    sorted_records = sorted(records, key=lambda record: record["source"]["file"])
    weapon_marker = any(
        item_name_marker(record["definition"]["components"]) == "weapon"
        for record in sorted_records
    )
    chinese_matches: list[tuple[str, str, str]] = []
    for record in sorted_records:
        for line in record["presentation"].get("lore") or []:
            classification = lore_line_classification(line)
            if classification and re.search(r"[\u3400-\u9fff]", line):
                chinese_matches.append((classification[0], classification[1] or line.strip(), record["source"]["file"]))
    if weapon_marker:
        weapon_matches = [match for match in chinese_matches if match[0] == "weapon"]
        return "weapon", weapon_matches[0][1] if weapon_matches else fallback_subcategory if fallback_category == "weapon" else None
    if not chinese_matches:
        return fallback_category, fallback_subcategory
    preferred_matches = [match for match in chinese_matches if match[0] != "other"] or chinese_matches
    categories = {category for category, _, _ in preferred_matches}
    if len(categories) > 1:
        sources = ", ".join(f"{category}@{source}" for category, _, source in preferred_matches)
        raise ValueError(f"Conflicting Chinese item classifications: {sources}")
    category = preferred_matches[0][0]
    subcategory_counts = Counter(subcategory for _, subcategory, _ in preferred_matches)
    subcategory = sorted(subcategory_counts, key=lambda value: (-subcategory_counts[value], value))[0]
    return category, subcategory


def item_category_tag(category: str, subcategory: str | None) -> str | None:
    if category != "weapon":
        return subcategory
    compact = (subcategory or "").replace(" ", "")
    if "弹药" in compact:
        return "弹药"
    if "魔法" in compact or "超自然" in compact:
        return "魔法"
    if "近战" in compact:
        return "近战"
    if "远程" in compact:
        return "远程"
    return None


def lore_cooldown(lore: list[str]) -> tuple[int | float | None, set[int]]:
    matches: list[tuple[int, float]] = []
    for index, line in enumerate(lore):
        match = re.fullmatch(r"\s*([0-9]+(?:\.[0-9]+)?)\s*s\s*⌚\s*", line, re.IGNORECASE)
        if match:
            matches.append((index, float(match.group(1))))
    if not matches:
        return None, set()
    value = matches[0][1]
    return int(value) if value.is_integer() else value, {index for index, _ in matches}


def lore_food_stats(lore: list[str]) -> tuple[int | float | None, int | float | None, set[int]]:
    matches: list[tuple[int, float, float]] = []
    for index, line in enumerate(lore):
        match = re.fullmatch(
            r"\s*([0-9]+(?:\.[0-9]+)?)\s*🍖\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*🍖\s*",
            line,
        )
        if match:
            matches.append((index, float(match.group(1)), float(match.group(2))))
    if not matches:
        return None, None, set()
    _, nutrition, saturation = matches[0]
    normalized_nutrition = int(nutrition) if nutrition.is_integer() else nutrition
    normalized_saturation = int(saturation) if saturation.is_integer() else saturation
    return normalized_nutrition, normalized_saturation, {index for index, _, _ in matches}


def lore_combat_stats(
    lore: list[str],
) -> tuple[int | float | None, int | float | None, int | float | None, set[int]]:
    for index, line in enumerate(lore):
        melee_match = re.fullmatch(
            r"\s*([0-9]+(?:\.[0-9]+)?)\s*🗡\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*s?\s*⌚\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*📏\s*",
            line,
            re.IGNORECASE,
        )
        ranged_match = re.fullmatch(
            r"\s*([0-9]+(?:\.[0-9]+)?)\s*🏹\s*\|\s*([0-9]+(?:\.[0-9]+)?)\s*s?\s*⌚\s*",
            line,
            re.IGNORECASE,
        )
        match = melee_match or ranged_match
        if not match:
            continue
        values = [float(value) for value in match.groups()]
        normalized = [int(value) if value.is_integer() else value for value in values]
        return normalized[0], normalized[1], normalized[2] if melee_match else None, {index}
    return None, None, None, set()


def parse_attributes(components: dict) -> list[dict]:
    value = components.get("attribute_modifiers")
    if isinstance(value, list):
        result = []
        for item in value:
            if isinstance(item, dict):
                result.append(
                    {
                        "type": normalize_identifier(str(item.get("type", ""))),
                        "amount": item.get("amount"),
                        "operation": item.get("operation"),
                        "slot": item.get("slot"),
                        "id": item.get("id"),
                        "raw": item,
                    }
                )
        return result
    raw = raw_component(components, "attribute_modifiers")
    result = []
    for part in split_top_level(raw):
        result.append(
            {
                "type": normalize_identifier(object_string(part, "type")),
                "amount": object_number(part, "amount"),
                "operation": object_string(part, "operation") or None,
                "slot": object_string(part, "slot") or None,
                "id": object_string(part, "id") or None,
                "raw": part,
            }
        )
    return [item for item in result if item["type"] or item["amount"] is not None]


def parse_effects(components: dict) -> list[dict]:
    effects: list[dict] = []
    seen: set[tuple] = set()
    consumable = components.get("consumable")
    if isinstance(consumable, dict):
        for consume_effect in consumable.get("on_consume_effects", []) or []:
            for effect in consume_effect.get("effects", []) or []:
                if not isinstance(effect, dict):
                    continue
                record = {
                    "id": normalize_identifier(str(effect.get("id", ""))),
                    "durationTicks": effect.get("duration"),
                    "amplifier": effect.get("amplifier", 0),
                    "showParticles": effect.get("show_particles"),
                    "showIcon": effect.get("show_icon"),
                    "raw": effect,
                }
                key = (record["id"], record["durationTicks"], record["amplifier"])
                if key not in seen:
                    seen.add(key)
                    effects.append(record)
        return effects

    raw = raw_component(components, "consumable") + " " + raw_component(components, "food")
    for match in re.finditer(r"(?:active_effects|effects)\s*:\s*\[", raw):
        start = match.end() - 1
        block = raw[start:]
        depth = 0
        end = len(block)
        for index, char in enumerate(block):
            if char == "[":
                depth += 1
            elif char == "]":
                depth -= 1
                if depth == 0:
                    end = index + 1
                    break
        for part in split_top_level(block[:end]):
            effect_id = object_string(part, "id")
            if not effect_id:
                continue
            record = {
                "id": normalize_identifier(effect_id),
                "durationTicks": object_number(part, "duration"),
                "amplifier": object_number(part, "amplifier") or 0,
                "showParticles": object_bool(part, "show_particles"),
                "showIcon": object_bool(part, "show_icon"),
                "raw": part,
            }
            key = (record["id"], record["durationTicks"], record["amplifier"])
            if key not in seen:
                seen.add(key)
                effects.append(record)
    return effects


def parse_consumable(components: dict) -> dict | None:
    value = components.get("consumable")
    if value is None:
        return None
    if isinstance(value, dict):
        return {
            "consumeSeconds": value.get("consume_seconds"),
            "animation": value.get("animation"),
            "sound": value.get("sound"),
            "hasParticles": value.get("has_consume_particles"),
            "effects": parse_effects(components),
            "raw": value,
        }
    raw = str(value)
    return {
        "consumeSeconds": object_number(raw, "consume_seconds"),
        "animation": object_string(raw, "animation") or None,
        "sound": object_string(raw, "sound") or None,
        "hasParticles": object_bool(raw, "has_consume_particles"),
        "effects": parse_effects(components),
        "raw": raw,
    }


def parse_food(components: dict) -> dict | None:
    value = components.get("food")
    if value is None:
        return None
    if isinstance(value, dict):
        return {
            "nutrition": value.get("nutrition"),
            "saturation": value.get("saturation"),
            "canAlwaysEat": value.get("can_always_eat"),
            "raw": value,
        }
    raw = str(value)
    return {
        "nutrition": object_number(raw, "nutrition"),
        "saturation": object_number(raw, "saturation"),
        "canAlwaysEat": object_bool(raw, "can_always_eat"),
        "raw": raw,
    }


def parse_cooldown(components: dict) -> dict | None:
    value = components.get("use_cooldown")
    if value is None:
        return None
    if isinstance(value, dict):
        return {"seconds": value.get("seconds"), "group": value.get("cooldown_group"), "raw": value}
    raw = str(value)
    return {
        "seconds": object_number(raw, "seconds"),
        "group": object_string(raw, "cooldown_group") or None,
        "raw": raw,
    }


def item_identity(record: dict) -> tuple[str, str]:
    presentation = record["presentation"]
    return presentation.get("itemModel", ""), presentation.get("name", "")


def choose_item_record(records: list[dict]) -> dict:
    rank = {"give": 0, "recipe": 1, "regive": 2}
    return sorted(records, key=lambda record: (rank.get(record["source"]["kind"], 9), record["source"]["file"]))[0]


def item_id_base(record: dict) -> str:
    presentation = record["presentation"]
    return slugify(presentation.get("itemModel") or Path(record["source"]["file"]).stem)


def build_item_id(record: dict, collisions: Counter, used: set[str]) -> str:
    candidate = item_id_base(record)
    if collisions[candidate] > 1:
        source_slug = slugify(Path(record["source"]["file"]).stem)
        candidate = f"{candidate}__{source_slug}"
    if candidate in used:
        identity = "|".join(item_identity(record)) + "|" + record["source"]["file"]
        candidate = f"{candidate}__{sha256_text(identity)[:8]}"
    used.add(candidate)
    return candidate


def item_domain_record(item_id: str, canonical: dict, records: list[dict]) -> dict:
    definition = canonical["definition"]
    presentation = canonical["presentation"]
    components = definition["components"]
    lore = list(presentation.get("lore") or [])
    rich_lore = rich_lore_lines(presentation.get("loreComponent"))
    if [line["plainText"] for line in rich_lore] != lore:
        raise ValueError(f"Rich lore differs from plain lore: {presentation.get('name') or item_id}")
    category, subcategory, classified_lines = classify_item(lore, components)
    category, subcategory = classify_item_group(records, category, subcategory)
    lore_cooldown_seconds, cooldown_lines = lore_cooldown(lore)
    lore_nutrition, lore_saturation, food_stat_lines = lore_food_stats(lore)
    lore_damage, combat_cooldown_seconds, lore_attack_range, combat_stat_lines = lore_combat_stats(lore)
    single_use_lines = {index for index, line in enumerate(lore) if line.strip() == "一次性"}
    single_use = bool(single_use_lines)
    metadata_lines = {
        index for index, line in enumerate(lore)
        if normalize_terminal_tag(line) in TERMINAL_METADATA_TAGS
    }
    hidden_description_lines = (
        classified_lines
        | metadata_lines
        | cooldown_lines
        | food_stat_lines
        | combat_stat_lines
        | single_use_lines
    )
    description_indices = [index for index in range(len(lore)) if index not in hidden_description_lines]
    description = [lore[index] for index in description_indices]
    description_rich = [
        {"line": description_index, "segments": rich_lore[lore_index]["segments"]}
        for description_index, lore_index in enumerate(description_indices)
        if any(segment["type"] == "sprite" for segment in rich_lore[lore_index]["segments"])
    ]
    attributes = parse_attributes(components)
    food = parse_food(components)
    consumable = parse_consumable(components)
    cooldown = parse_cooldown(components)
    attribute_stats: dict[str, int | float] = {}
    for attribute in attributes:
        attr = attribute.get("type", "").split(":")[-1]
        amount = attribute.get("amount")
        if attr and isinstance(amount, (int, float)):
            attribute_stats[attr] = attribute_stats.get(attr, 0) + amount
    max_damage = component_number(components, "max_damage")
    damage = component_number(components, "damage")
    player_cooldown_seconds = (
        combat_cooldown_seconds
        if combat_cooldown_seconds is not None
        else lore_cooldown_seconds
        if lore_cooldown_seconds is not None
        else cooldown.get("seconds")
        if cooldown
        else None
    )
    if single_use:
        player_cooldown_seconds = None
    attack_damage_bonus = attribute_stats.get("attack_damage")
    player_damage = lore_damage
    if player_damage is None and isinstance(attack_damage_bonus, (int, float)):
        total_damage = round(float(attack_damage_bonus) + 1, 10)
        player_damage = int(total_damage) if total_damage.is_integer() else total_damage
    tags = [
        line for index, line in enumerate(lore[:2])
        if len(line) <= 24 and index not in combat_stat_lines
    ]
    if subcategory:
        tags.append(subcategory)
    tags.extend(normalize_terminal_tag(lore[index]) for index in sorted(metadata_lines))
    sources = [
        {
            "recordId": record["recordId"],
            "file": record["source"]["file"],
            "kind": record["source"]["kind"],
            "function": record["source"].get("function"),
        }
        for record in sorted(records, key=lambda record: record["recordId"])
    ]
    return {
        "id": item_id,
        "name": presentation.get("name") or item_id,
        "category": category,
        "subcategory": subcategory,
        "categoryTag": item_category_tag(category, subcategory),
        "singleUse": single_use,
        "tags": list(dict.fromkeys(tags)),
        "lore": lore,
        "description": description,
        "descriptionRich": description_rich,
        "minecraft": {
            "baseItem": definition.get("baseItem"),
            "itemModel": presentation.get("itemModel"),
            "count": definition.get("count", 1),
            "maxStackSize": component_number(components, "max_stack_size"),
            "maxDamage": max_damage,
            "damage": damage,
            "remainingDurability": max_damage - damage if isinstance(max_damage, (int, float)) and isinstance(damage, (int, float)) else None,
            "food": food,
            "consumable": consumable,
            "cooldown": cooldown,
            "attributes": attributes,
            "effects": parse_effects(components),
            "customData": components.get("custom_data"),
            "components": components,
        },
        "stats": {
            "cooldownSeconds": player_cooldown_seconds,
            "damage": player_damage,
            "attackRange": lore_attack_range,
            "consumeSeconds": consumable.get("consumeSeconds") if consumable else None,
            "nutrition": lore_nutrition if lore_nutrition is not None else food.get("nutrition") if food else None,
            "saturation": lore_saturation if lore_saturation is not None else food.get("saturation") if food else None,
            "durability": max_damage,
            "attackDamageBonus": attack_damage_bonus,
            "attackSpeedBonus": attribute_stats.get("attack_speed"),
            "movementSpeedBonus": attribute_stats.get("movement_speed"),
            "entityInteractionRangeBonus": attribute_stats.get("entity_interaction_range"),
            "blockInteractionRangeBonus": attribute_stats.get("block_interaction_range"),
        },
        "recipeIds": sorted({record.get("recipeId") for record in records if record.get("recipeId")}),
        "sources": sources,
        # One model may render differently for different components (for
        # example potion colors and player profiles), so every normalized Wiki
        # item owns its output file instead of sharing one by model id.
        "image": {"path": f"assets/items/{slugify(item_id)}.png", "resolved": False, "source": None},
    }


def apply_item_override(item: dict, overrides: dict) -> dict:
    patches = []
    by_id = overrides.get("byId", {})
    by_model = overrides.get("byModel", {})
    by_name = overrides.get("byName", {})
    if item["minecraft"]["itemModel"] in by_model:
        patches.append(by_model[item["minecraft"]["itemModel"]])
    if item["name"] in by_name:
        patches.append(by_name[item["name"]])
    if item["id"] in by_id:
        patches.append(by_id[item["id"]])
    for patch in patches:
        item = deep_merge(item, patch)
    if not any("categoryTag" in patch for patch in patches):
        item["categoryTag"] = item_category_tag(item["category"], item.get("subcategory"))
    if item["category"] == "weapon" and item.get("categoryTag") not in WEAPON_CATEGORY_TAGS:
        raise ValueError(f"Weapon item has no normalized category tag: {item['name']} ({item['id']})")
    item["provenance"] = {"overrideApplied": bool(patches)}
    return item


def build_items(raw_records: list[dict], overrides: dict) -> tuple[list[dict], dict[str, str], set[str]]:
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for record in raw_records:
        model, name = item_identity(record)
        if not name:
            continue
        groups[(model, name)].append(record)
    canonical_by_identity = {identity: choose_item_record(records) for identity, records in groups.items()}
    collisions = Counter(item_id_base(record) for record in canonical_by_identity.values())
    used: set[str] = set()
    items: list[dict] = []
    record_to_item: dict[str, str] = {}
    hidden_record_ids: set[str] = set()
    for identity in sorted(groups, key=lambda value: (value[0], value[1])):
        records = groups[identity]
        canonical = canonical_by_identity[identity]
        item_id = build_item_id(canonical, collisions, used)
        item = apply_item_override(item_domain_record(item_id, canonical, records), overrides)
        if item.get("hidden") is True:
            hidden_record_ids.update(record["recordId"] for record in records)
            continue
        items.append(item)
        for record in records:
            record_to_item[record["recordId"]] = item_id
    items.sort(key=lambda item: (item.get("order", 9999), item["category"], item["name"], item["id"]))
    return items, record_to_item, hidden_record_ids


def normalize_ingredient(value: Any) -> dict:
    if isinstance(value, str):
        return {"item": normalize_identifier(value), "raw": value}
    if isinstance(value, list):
        alternatives = [normalize_ingredient(entry) for entry in value]
        return {
            "item": alternatives[0].get("item") if alternatives else None,
            "alternatives": alternatives,
            "raw": value,
        }
    if isinstance(value, dict):
        base = value.get("base")
        base_item = base if isinstance(base, str) else base.get("item") if isinstance(base, dict) else None
        item = value.get("item") or value.get("id") or base_item or value.get("tag") or ""
        components = value.get("components")
        if not isinstance(components, dict) and isinstance(base, dict):
            components = base.get("components")
        components = components if isinstance(components, dict) else {}
        item_model = components.get("minecraft:item_model") or components.get("item_model")
        return {
            "item": normalize_identifier(str(item)) if item else None,
            "itemModel": normalize_identifier(str(item_model)) if item_model else None,
            "raw": value,
        }
    return {"item": None, "raw": value}


def link_recipe_ingredient(ingredient: dict, items: list[dict], item_id_override: str | None = None) -> dict:
    items_by_id = {item["id"]: item for item in items}
    items_by_model = {
        normalize_identifier(item["minecraft"].get("itemModel", "")): item
        for item in items
        if item["minecraft"].get("itemModel")
    }
    identifier = ingredient.get("item") or ""
    model = ingredient.get("itemModel") or ""
    linked = items_by_id.get(item_id_override) if item_id_override else None
    if not linked and identifier and not identifier.startswith("minecraft:"):
        linked = items_by_id.get(identifier.split(":", 1)[-1]) or items_by_model.get(identifier)
    if not linked and model:
        linked = items_by_model.get(model)
    if linked:
        ingredient["itemId"] = linked["id"]
    if ingredient.get("alternatives"):
        ingredient["alternatives"] = [link_recipe_ingredient(entry, items) for entry in ingredient["alternatives"]]
    return ingredient


def build_recipes(
    raw_records: list[dict],
    raw_items: list[dict],
    record_to_item: dict[str, str],
    items: list[dict],
    overrides: dict,
) -> list[dict]:
    result_items = {record.get("recipeId"): record for record in raw_items if record.get("recipeId")}
    items_by_id = {item["id"]: item for item in items}
    recipes = []
    for record in raw_records:
        document = record.get("document")
        if not isinstance(document, dict):
            recipes.append({"id": record["id"], "source": record["source"], "parseError": record.get("parseError")})
            continue
        result_record = result_items.get(record["id"])
        shaped = isinstance(document.get("pattern"), list)
        ingredients = []
        if isinstance(document.get("ingredients"), list):
            ingredients = [normalize_ingredient(value) for value in document["ingredients"]]
        elif isinstance(document.get("key"), dict):
            ingredients = [
                {"symbol": symbol, **normalize_ingredient(value)} for symbol, value in document["key"].items()
            ]
        elif "ingredient" in document:
            ingredients = [{"role": "ingredient", **normalize_ingredient(document["ingredient"])}]
        for role in ("input", "material"):
            if role in document:
                ingredients.append({"role": role, **normalize_ingredient(document[role])})
        recipe_override = overrides.get("byId", {}).get(record["id"], {})
        ingredient_overrides = recipe_override.get("ingredientItems", {})
        ingredients = [
            link_recipe_ingredient(
                ingredient,
                items,
                ingredient_overrides.get(ingredient.get("symbol"))
                or ingredient_overrides.get(ingredient.get("role"))
                or ingredient_overrides.get(ingredient.get("item")),
            )
            for ingredient in ingredients
        ]
        result_item_id = recipe_override.get("resultItemId")
        if not result_item_id and result_record:
            result_item_id = record_to_item.get(result_record["recordId"])
        result_item = items_by_id.get(result_item_id)
        recipes.append(
            {
                "id": record["id"],
                "type": normalize_identifier(str(document.get("type", ""))),
                "stageLabel": recipe_override.get("stageLabel"),
                "pattern": document.get("pattern") if shaped else None,
                "ingredients": ingredients,
                "result": {
                    "itemId": result_item_id,
                    "baseItem": result_record["definition"]["baseItem"] if result_record else None,
                    "name": (result_record["presentation"].get("name") if result_record else None)
                    or (result_item.get("name") if result_item else None),
                    "count": document.get("result", {}).get("count", 1),
                    "raw": document.get("result"),
                },
                "source": record["source"],
                "rawDocument": document,
            }
        )
    return sorted(recipes, key=lambda recipe: recipe["id"])


def magic_lore_stats(lore: list[str]) -> dict:
    joined = "\n".join(lore)
    mp = None
    cooldown = None
    duration = None
    unlock = None
    mp_match = re.search(r"魔力消耗\s*[:：]?\s*([0-9.]+)\s*MP", joined, re.IGNORECASE)
    if not mp_match:
        mp_match = re.search(r"([0-9.]+)\s*🔮", joined)
    cooldown_match = re.search(r"冷却时间\s*[:：]?\s*([0-9.]+)\s*s", joined, re.IGNORECASE)
    if not cooldown_match:
        cooldown_match = re.search(r"([0-9.]+)\s*s\s*⌚", joined, re.IGNORECASE)
    duration_match = re.search(r"持续时间\s*[:：]?\s*([^\n]+)", joined)
    unlock_match = re.search(r"解锁条件\s*[:：]?\s*([^\n]+)", joined)
    if mp_match:
        mp = float(mp_match.group(1))
    if cooldown_match:
        cooldown = float(cooldown_match.group(1))
    if duration_match:
        duration = duration_match.group(1).strip()
    if unlock_match:
        unlock = unlock_match.group(1).strip()
    return {"mpCost": mp, "cooldownSeconds": cooldown, "duration": duration, "unlockCondition": unlock}


def magic_unlock_condition(raw: dict, branch_id: int, generation: str, lore_condition: str | None) -> str | None:
    runtime_records = [
        record for record in raw.get("unlocks", [])
        if record["branchId"] == branch_id and record["generation"] == generation
    ]
    if not runtime_records:
        return lore_condition
    minimum_values = {record["minimumValue"] for record in runtime_records}
    if len(minimum_values) != 1:
        raise ValueError(f"Conflicting magic unlock thresholds for branch {branch_id}: {sorted(minimum_values)}")
    minimum = next(iter(minimum_values))
    metric_match = re.search(r"(压力值|魔女化值)", lore_condition or "")
    metric = metric_match.group(1) if metric_match else "压力值"
    return f"{metric}大于 {minimum - 1} 后右键即可解锁"


def build_magics(raw: dict, overrides: dict) -> list[dict]:
    grouped: dict[int, list[dict]] = defaultdict(list)
    for record in raw.get("variants", []):
        grouped[record["branchId"]].append(record)
    properties = raw.get("properties", {}).get("branches", {})
    magics = []
    for branch_id in sorted(grouped):
        all_records = grouped[branch_id]
        generation = "modern" if any(record["generation"] == "modern" for record in all_records) else "legacy"
        selected = [record for record in all_records if record["generation"] == generation]
        # Some files may contain multiple item commands; keep the richest one per variant.
        by_variant: dict[str, list[dict]] = defaultdict(list)
        for record in selected:
            by_variant[record["variant"]].append(record)
        prop = properties.get(str(branch_id), {})
        prop_fields = prop.get("fields", {})
        variants = []
        unlock_lore_condition = None
        unlock_item_source = None
        for variant_key in sorted(by_variant, key=lambda key: MAGIC_VARIANT_ORDER.get(key, 99)):
            candidates = by_variant[variant_key]
            candidate = max(candidates, key=lambda record: len(record["item"]["presentation"].get("lore", [])))
            item = candidate["item"]
            presentation = item["presentation"]
            lore = presentation.get("lore", [])
            stats = magic_lore_stats(lore)
            if variant_key == "unlock":
                unlock_lore_condition = stats["unlockCondition"]
                unlock_item_source = item["source"]["file"]
                continue
            property_index = MAGIC_VARIANT_ORDER.get(variant_key)
            if property_index and prop_fields:
                stats["mpCost"] = prop_fields.get(f"dmp{property_index}", stats["mpCost"])
                stats["cooldownSeconds"] = prop_fields.get(f"cd{property_index}", stats["cooldownSeconds"])
            variants.append(
                {
                    "id": variant_key,
                    "kind": MAGIC_VARIANT_LABEL.get(variant_key, variant_key.upper()),
                    "name": presentation.get("name") or MAGIC_VARIANT_LABEL.get(variant_key, variant_key),
                    "lore": lore,
                    "stats": stats,
                    "minecraft": {
                        "baseItem": item["definition"]["baseItem"],
                        "itemModel": presentation.get("itemModel"),
                        "components": item["definition"]["components"],
                    },
                    "source": item["source"]["file"],
                    "image": {"path": f"assets/magics/{slugify(presentation.get('itemModel', 'missingno'))}.png", "resolved": False, "source": None},
                }
            )
        unlock_condition = magic_unlock_condition(raw, branch_id, generation, unlock_lore_condition)
        unlock_runtime_sources = sorted({
            record["source"] for record in raw.get("unlocks", [])
            if record["branchId"] == branch_id and record["generation"] == generation
        })
        if unlock_condition:
            unlock_variant = next((variant for variant in variants if variant["id"] == "b"), None)
            if unlock_variant is None:
                raise ValueError(f"Magic branch {branch_id} has an unlock condition but no B variant")
            unlock_variant["stats"]["unlockCondition"] = unlock_condition
            unlock_variant["unlockSources"] = unlock_runtime_sources or ([unlock_item_source] if unlock_item_source else [])
        modern_unlock_value = prop_fields.get("unlock_value") if generation == "modern" else None
        if modern_unlock_value is not None:
            release_variant = next((variant for variant in variants if variant["id"] == "c"), None)
            if release_variant is not None:
                release_variant["stats"]["unlockCondition"] = (
                    f"压力值大于 {modern_unlock_value} 后，丢出联携术即可解锁"
                )
                release_variant["unlockSources"] = list(dict.fromkeys(filter(None, [
                    raw.get("properties", {}).get("source"),
                    next((variant["source"] for variant in variants if variant["id"] == "b"), None),
                ])))
        profile = {
            "characterName": prop_fields.get("name"),
            "roleName": prop_fields.get("role_name"),
            "unlockValue": prop_fields.get("unlock_value"),
        }
        branch = {
            "id": branch_id,
            "name": raw.get("names", {}).get(str(branch_id)) or profile["roleName"] or f"魔法 {branch_id}",
            "generation": generation,
            "profile": profile,
            "variants": variants,
            "sources": sorted({record["item"]["source"]["file"] for record in all_records}),
            "propertySource": raw.get("properties", {}).get("source") if prop else None,
        }
        branch = deep_merge(branch, overrides.get("byId", {}).get(str(branch_id), {}))
        magics.append(branch)
    return magics


def build_tasks(raw_records: list[dict], overrides: dict) -> list[dict]:
    tasks = []
    seen = set()
    for record in raw_records:
        fields = record["fields"]
        identity = (record["category"], fields.get("name"))
        if not fields.get("name") or identity in seen:
            continue
        seen.add(identity)
        task_id = slugify(record["category"] or Path(record["source"]).stem)
        task = {
            "id": task_id,
            "category": record["category"],
            **fields,
            "source": record["source"],
            "rawPayload": record["rawPayload"],
        }
        tasks.append(deep_merge(task, overrides.get("byId", {}).get(task_id, {})))
    return tasks


def build_talents(raw_records: list[dict], overrides: dict) -> list[dict]:
    talents = []
    for record in raw_records:
        talent_id = str(record["id"])
        talent = {
            "id": record["id"],
            "name": record["fields"]["name"],
            "color": record["fields"]["color"],
            "effect": record["fields"]["effect"],
            "description": record["fields"]["description"],
            "function": record["function"],
            "icon": record.get("icon", {}).get("icon") if record.get("icon") else None,
            "sources": record["sources"],
            "rawPayload": record["rawPayload"],
        }
        talents.append(deep_merge(talent, overrides.get("byId", {}).get(talent_id, {})))
    return talents


def build_damage(raw_records: list[dict], overrides: dict) -> list[dict]:
    records = []
    for raw in raw_records:
        base = {
            "id": raw["id"],
            "name": raw["id"].removesuffix("_damage").replace("_", " "),
            "label": raw["id"].removesuffix("_damage").upper(),
            "color": "#7f94a8",
            "messages": raw["messages"],
            "scoreboardObjectives": raw["scoreboardObjectives"],
            "commandKinds": raw["commandKinds"],
            "sources": raw["sources"],
            "severityStages": [stage for stage in ("mild", "moderate", "severe") if any(stage in source for source in raw["sources"])],
        }
        records.append(deep_merge(base, overrides.get("byId", {}).get(raw["id"], {})))
    return records


def build_effects(raw_records: list[dict], items: list[dict], overrides: dict) -> list[dict]:
    grouped: dict[str, dict] = {}

    def effect_record(effect_id: str) -> dict:
        return grouped.setdefault(
            effect_id,
            {
                "id": effect_id,
                "name": effect_id.split(":")[-1].replace("_", " "),
                "commandApplications": [],
                "itemApplications": [],
                "sources": set(),
            },
        )

    for raw in raw_records:
        record = effect_record(raw["effect"])
        record["commandApplications"].append(
            {
                "target": raw["target"],
                "durationSeconds": raw["duration"],
                "amplifier": raw["amplifier"],
                "hideParticles": raw["hideParticles"],
                "source": raw["source"],
                "rawCommand": raw["rawCommand"],
            }
        )
        record["sources"].add(raw["source"])
    for item in items:
        for effect in item["minecraft"]["effects"]:
            if not effect.get("id"):
                continue
            record = effect_record(effect["id"])
            record["itemApplications"].append(
                {
                    "itemId": item["id"],
                    "itemName": item["name"],
                    "durationTicks": effect.get("durationTicks"),
                    "amplifier": effect.get("amplifier"),
                }
            )
            record["sources"].update(source["file"] for source in item["sources"])

    result = []
    for effect_id in sorted(grouped):
        record = grouped[effect_id]
        record["sources"] = sorted(record["sources"])
        result.append(deep_merge(record, overrides.get("byId", {}).get(effect_id, {})))
    return result


def build_tutorials(raw_records: list[dict]) -> list[dict]:
    return [
        {
            "id": record["id"],
            "documents": record["documents"],
            "functions": record["functions"],
            "functionSources": [function["source"] for function in record["functions"]],
        }
        for record in raw_records
    ]


def build_domain(raw: dict, overrides: dict) -> tuple[dict, set[str]]:
    items, record_to_item, hidden_item_record_ids = build_items(
        raw["items"]["records"], overrides.get("items", {})
    )
    recipes = build_recipes(
        raw["recipes"]["records"],
        raw["items"]["records"],
        record_to_item,
        items,
        overrides.get("recipes", {}),
    )
    item_by_id = {item["id"]: item for item in items}
    for recipe in recipes:
        result_id = recipe.get("result", {}).get("itemId")
        if result_id in item_by_id and recipe["id"] not in item_by_id[result_id]["recipeIds"]:
            item_by_id[result_id]["recipeIds"].append(recipe["id"])
            item_by_id[result_id]["recipeIds"].sort()
    domain = {
        "items": items,
        "recipes": recipes,
        "magics": build_magics(raw["magics"], overrides.get("magics", {})),
        "tasks": build_tasks(raw["tasks"]["records"], overrides.get("tasks", {})),
        "talents": build_talents(raw["talents"]["records"], overrides.get("talents", {})),
        "damage": build_damage(raw["damage"]["records"], overrides.get("damage", {})),
        "effects": build_effects(raw["effects"]["records"], items, overrides.get("effects", {})),
        "tutorials": build_tutorials(raw["tutorials"]["records"]),
    }
    return domain, hidden_item_record_ids
