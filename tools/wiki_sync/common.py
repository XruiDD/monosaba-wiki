from __future__ import annotations

import ast
import hashlib
import json
import re
from pathlib import Path
from typing import Any


TEXT_RE = re.compile(
    r'(?<![\w])(?:"text"|text)\s*:\s*("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')',
    re.DOTALL,
)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def active_text(text: str) -> str:
    """Remove full-line comments and join Minecraft command continuations."""
    text = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    return re.sub(r"\\\s*\n\s*", "", text)


def decode_string(token: str) -> str:
    token = token.strip()
    if not token:
        return ""
    if token[0] not in "\"'":
        return token
    try:
        return ast.literal_eval(token)
    except (SyntaxError, ValueError):
        body = token[1:-1]
        return body.replace(r"\n", "\n").replace(r'\"', '"').replace(r"\'", "'").replace(r"\\", "\\")


def balanced_value(text: str, start: int) -> tuple[str, int]:
    while start < len(text) and text[start].isspace():
        start += 1
    if start >= len(text):
        return "", start
    first = text[start]
    if first in "\"'":
        escaped = False
        for index in range(start + 1, len(text)):
            char = text[index]
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == first:
                return text[start : index + 1], index + 1
        return text[start:], len(text)
    if first not in "[{(":
        match = re.match(r"[^,\]\s}]+", text[start:])
        value = match.group(0) if match else ""
        return value, start + len(value)

    pairs = {"[": "]", "{": "}", "(": ")"}
    stack = [pairs[first]]
    quote = None
    escaped = False
    for index in range(start + 1, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "\"'":
            quote = char
        elif char in pairs:
            stack.append(pairs[char])
        elif stack and char == stack[-1]:
            stack.pop()
            if not stack:
                return text[start : index + 1], index + 1
    return text[start:], len(text)


def split_top_level(value: str) -> list[str]:
    value = value.strip()
    if len(value) >= 2 and value[0] in "[{(" and value[-1] in "]})":
        value = value[1:-1]
    parts: list[str] = []
    start = 0
    stack: list[str] = []
    quote = None
    escaped = False
    pairs = {"[": "]", "{": "}", "(": ")"}
    for index, char in enumerate(value):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "\"'":
            quote = char
        elif char in pairs:
            stack.append(pairs[char])
        elif stack and char == stack[-1]:
            stack.pop()
        elif char == "," and not stack:
            part = value[start:index].strip()
            if part:
                parts.append(part)
            start = index + 1
    tail = value[start:].strip()
    if tail:
        parts.append(tail)
    return parts


def split_assignment(value: str, separators: str = "=:") -> tuple[str, str] | None:
    stack: list[str] = []
    quote = None
    escaped = False
    pairs = {"[": "]", "{": "}", "(": ")"}
    for index, char in enumerate(value):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "\"'":
            quote = char
        elif char in pairs:
            stack.append(pairs[char])
        elif stack and char == stack[-1]:
            stack.pop()
        elif char in separators and not stack:
            return value[:index].strip(), value[index + 1 :].strip()
    return None


def parse_snbt_map(value: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for part in split_top_level(value):
        assignment = split_assignment(part)
        if not assignment:
            continue
        key, raw = assignment
        key = key.strip().strip("\"'")
        key = key.removeprefix("minecraft:")
        result[key] = raw
    return result


def object_field(value: str, key: str) -> str:
    for part in split_top_level(value):
        assignment = split_assignment(part, ":")
        if not assignment:
            continue
        found, raw = assignment
        if found.strip().strip("\"'").removeprefix("minecraft:") == key.removeprefix("minecraft:"):
            return decode_string(raw) if raw[:1] in "\"'" else raw.strip()
    return ""


def primitive(value: str) -> Any:
    value = value.strip()
    if not value:
        return None
    if value[:1] in "\"'":
        return decode_string(value)
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    numeric = re.fullmatch(r"(-?(?:\d+(?:\.\d*)?|\.\d+))(?:[bBsSlLfFdD])?", value)
    if numeric:
        number = numeric.group(1)
        return float(number) if "." in number else int(number)
    return value


def component_text(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value[:1] in "\"'":
        return decode_string(value)
    return "".join(decode_string(match.group(1)) for match in TEXT_RE.finditer(value))


def json_rich_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "".join(json_rich_text(item) for item in value)
    if isinstance(value, dict):
        return str(value.get("text", "")) + json_rich_text(value.get("extra", []))
    return ""


def _rich_identifier(value: Any, default_namespace: str = "minecraft") -> str:
    if value is None:
        return ""
    identifier = str(value).strip()
    return identifier if ":" in identifier else f"{default_namespace}:{identifier}"


def _snbt_rich_segments(value: str) -> list[dict]:
    value = value.strip()
    if not value:
        return []
    if value[:1] in "\"'":
        text = decode_string(value)
        return [{"type": "text", "text": text}] if text else []
    if value.startswith("["):
        return [
            segment
            for part in split_top_level(value)
            if part[:1] not in "\"'"
            for segment in _snbt_rich_segments(part)
        ]
    if not value.startswith("{"):
        return []
    fields = parse_snbt_map(value)
    segments: list[dict] = []
    text = primitive(fields.get("text", ""))
    if isinstance(text, str) and text:
        segments.append({"type": "text", "text": text})
    sprite = primitive(fields.get("sprite", ""))
    if isinstance(sprite, str) and sprite:
        atlas = primitive(fields.get("atlas", "")) or "minecraft:gui"
        segments.append(
            {
                "type": "sprite",
                "atlas": _rich_identifier(atlas),
                "sprite": _rich_identifier(sprite),
            }
        )
    if fields.get("extra"):
        segments.extend(_snbt_rich_segments(fields["extra"]))
    return segments


def _json_rich_segments(value: Any) -> list[dict]:
    if isinstance(value, str):
        return [{"type": "text", "text": value}] if value else []
    if isinstance(value, list):
        return [segment for part in value for segment in _json_rich_segments(part)]
    if not isinstance(value, dict):
        return []
    segments: list[dict] = []
    text = value.get("text")
    if isinstance(text, str) and text:
        segments.append({"type": "text", "text": text})
    sprite = value.get("sprite")
    if isinstance(sprite, str) and sprite:
        segments.append(
            {
                "type": "sprite",
                "atlas": _rich_identifier(value.get("atlas") or "minecraft:gui"),
                "sprite": _rich_identifier(sprite),
            }
        )
    segments.extend(_json_rich_segments(value.get("extra", [])))
    return segments


def _rich_lines(segments: list[dict]) -> list[dict]:
    lines: list[list[dict]] = [[]]
    for segment in segments:
        if segment["type"] == "sprite":
            lines[-1].append(segment)
            continue
        parts = re.split(r"\r?\n", segment["text"])
        for index, part in enumerate(parts):
            if part:
                lines[-1].append({"type": "text", "text": part})
            if index < len(parts) - 1:
                lines.append([])
    result = []
    for line in lines:
        plain_text = "".join(segment.get("text", "") for segment in line).strip()
        if plain_text or any(segment["type"] == "sprite" for segment in line):
            result.append({"plainText": plain_text, "segments": line})
    return result


def rich_lore_lines(value: Any) -> list[dict]:
    if isinstance(value, str):
        return [
            line
            for part in split_top_level(value)
            for line in _rich_lines(_snbt_rich_segments(part))
        ]
    if isinstance(value, list):
        return [line for part in value for line in _rich_lines(_json_rich_segments(part))]
    return []


def lore_lines(value: str) -> list[str]:
    return [line["plainText"] for line in rich_lore_lines(value)]


def json_lore_lines(value: Any) -> list[str]:
    return [line["plainText"] for line in rich_lore_lines(value)]


def normalize_identifier(value: str, default_namespace: str = "minecraft") -> str:
    value = decode_string(value).strip()
    if not value:
        return ""
    return value if ":" in value else f"{default_namespace}:{value}"


def slugify(value: str) -> str:
    value = value.split(":")[-1].split("/")[-1]
    value = re.sub(r"[^a-zA-Z0-9_$()-]+", "_", value).strip("_").lower()
    return value or "record"


def json_document(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False) + "\n"


def deep_merge(base: dict, patch: dict) -> dict:
    merged = dict(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged
