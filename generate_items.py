"""
Read the real extracted props.json and generate src/data/items.js
with 100% original lore and all 176 items.
"""
import json
import re
from pathlib import Path

ROOT = Path(r"D:\src\manosaba")
PROPS_JSON = ROOT / "wiki_source" / "data" / "props.json"
OUT = ROOT / "monosaba-wiki" / "src" / "data" / "items.js"

# 已知结尾标签 → 类型
TAG_TO_TYPE = {
    "weapon":  "weapon",
    "medicine":"medical",
    "medical": "medical",
    "food":    "food",
    "tool":    "tool",
    "clue":    "clue",
    "key":     "tool",
    "trap":    "tool",
    "arcane":  "arcane",
    "archive": "archive",
    "accessory":"accessory",
    "system":  "system",
    "record":  "archive",
}

# 名称/category 关键字 → 类型的 fallback
NAME_KEYWORDS = [
    (re.compile(r"剑|刀|枪|弩|矛|斧|矢|弓|匕|鞭|棒|炸|雷|左轮|magnum|baton|gun|spear|crossbow|dart"), "weapon"),
    (re.compile(r"药|针|绷带|纱布|止血|镇静|医疗|adrenaline|血清"), "medical"),
    (re.compile(r"钥匙|keys?"), "tool"),
    (re.compile(r"放大镜|探测|线索|证据|记录|卷宗|证物|书|卡"), "clue"),
    (re.compile(r"梨|苹果|巧克力|糖|面包|food"), "food"),
    (re.compile(r"法杖|咒|魔法|光尘|防御矩阵|水晶球|塔罗|死亡记录|deathbook|staff"), "arcane"),
    (re.compile(r"徽章|按钮|处刑|放逐|典狱长|warden"), "system"),
    (re.compile(r"伞|锚|球杆|砖|绳|凿|螺丝|烛台|火把|稻草|扫帚|刷|镜|指南针|项链|雕像|肥皂|苏打|棒|树枝|compass|broom|brush|mirror|anchor|rope"), "tool"),
    (re.compile(r"饰品|发带|戒指|花|胸针|pendant|hairband|ring"), "accessory"),
]

def classify_type(name, lore, category, model):
    # 1. 标签行（最准）
    if lore:
        tag = lore[-1].strip().lower()
        if tag in TAG_TO_TYPE:
            return TAG_TO_TYPE[tag]
    # 2. 源路径关键字
    c = (category or "").lower()
    if "/potion" in c:
        return "medical"
    if "/keys" in c or "key_" in c:
        return "tool"
    if "/magnum" in c or "/electric_grenade" in c or "/crossbow" in c or "/simple_spear" in c:
        return "weapon"
    # 3. 名称
    blob = f"{name or ''} {model or ''} {category or ''}"
    for pat, t in NAME_KEYWORDS:
        if pat.search(blob):
            return t
    # 4. 默认工具
    return "tool"


def classify_rarity(source, name):
    s = (source or "").lower()
    if "/unique/" in s:
        return "unique"
    if "ceremonial" in s or "仪礼" in (name or ""):
        return "witch"
    if "prison_warden" in s or "典狱长" in (name or ""):
        return "warden"
    return None


# 从 item_model 或 source 推 slug（对应 assets/items/<slug>.png）
def derive_slug(item):
    im = (item.get("item_model") or "").strip()
    if im and ":" in im:
        ns, path = im.split(":", 1)
        # skip minecraft: prefix (vanilla)
        if ns == "minecraft":
            # fall through to source file stem
            pass
        else:
            return path.split("/")[-1]
    # fallback to source file stem
    src = item.get("source") or ""
    stem = Path(src).stem
    # strip _give suffix if present
    if stem.endswith("_give"):
        stem = stem[:-5]
    return stem or "unknown"


def separate_lore(lore):
    """Strip trailing tag line and any stat lines. Return (desc_lines, stats_dict)."""
    if not lore:
        return [], {}
    desc = []
    stats = {}
    # drop final tag
    last = lore[-1].strip().lower() if lore else ""
    body = lore[:-1] if last in TAG_TO_TYPE else lore[:]
    for line in body:
        line = line.strip()
        if not line:
            continue
        if "魔力消耗" in line:
            stats["mp"] = line.replace("魔力消耗:", "").strip()
        elif "冷却时间" in line or "基础冷却" in line:
            stats["cd"] = re.sub(r"[*★]?基础?冷却[时间]*:?", "", line).strip() + (" ★" if "基础" in line else "")
        elif "持续时间" in line:
            stats["dur"] = line.replace("持续时间:", "").strip()
        else:
            desc.append(line)
    return desc, stats


def build_entry(item, owner):
    slug = derive_slug(item)
    name = item.get("name") or "(未命名)"
    lore = item.get("lore") or []
    desc, stats = separate_lore(lore)
    typ = classify_type(name, lore, item.get("category") or item.get("group"), item.get("item_model"))
    rarity = classify_rarity(item.get("source"), name)

    entry = {
        "slug": slug,
        "name": name,
        "type": typ,
        "owner": owner,        # general | anan | mtiao | myc | songbing | tiroaw
        "lore": "\n".join(desc) if desc else "",
        "model": item.get("item_model") or "",
        "source": item.get("source") or "",
    }
    if rarity:
        entry["rarity"] = rarity
    if "mp" in stats:  entry["mp"] = stats["mp"]
    if "cd" in stats:  entry["cd"] = stats["cd"]
    if "dur" in stats: entry["dur"] = stats["dur"]
    food = item.get("food")
    if food:
        entry["food"] = food
    return entry


def main():
    data = json.loads(PROPS_JSON.read_text(encoding="utf-8"))
    all_items = []

    for it in data.get("general", []):
        all_items.append(build_entry(it, "general"))

    for code, info in (data.get("characters") or {}).items():
        for it in info.get("items", []):
            all_items.append(build_entry(it, code))

    # Group stats
    by_owner = {}
    by_type = {}
    for e in all_items:
        by_owner[e["owner"]] = by_owner.get(e["owner"], 0) + 1
        by_type[e["type"]] = by_type.get(e["type"], 0) + 1
    print(f"Total: {len(all_items)}")
    print(f"By owner: {by_owner}")
    print(f"By type: {by_type}")

    # Write JS
    lines = [
        "/* ===========================================================",
        "   囚庭演定 Wiki · 道具数据（自动生成，原文 lore）",
        "   来源：wiki_source/data/props.json（数据包实装）",
        "   =========================================================== */",
        "",
        "export const ITEMS_DATA = [",
    ]
    for e in all_items:
        parts = []
        parts.append(f'slug: {json.dumps(e["slug"], ensure_ascii=False)}')
        parts.append(f'name: {json.dumps(e["name"], ensure_ascii=False)}')
        parts.append(f'type: {json.dumps(e["type"], ensure_ascii=False)}')
        parts.append(f'owner: {json.dumps(e["owner"], ensure_ascii=False)}')
        if e.get("rarity"):
            parts.append(f'rarity: {json.dumps(e["rarity"], ensure_ascii=False)}')
        if e.get("mp"):
            parts.append(f'mp: {json.dumps(e["mp"], ensure_ascii=False)}')
        if e.get("cd"):
            parts.append(f'cd: {json.dumps(e["cd"], ensure_ascii=False)}')
        if e.get("dur"):
            parts.append(f'dur: {json.dumps(e["dur"], ensure_ascii=False)}')
        if e.get("food"):
            parts.append(f'food: {json.dumps(e["food"], ensure_ascii=False)}')
        parts.append(f'lore: {json.dumps(e["lore"], ensure_ascii=False)}')
        parts.append(f'model: {json.dumps(e["model"], ensure_ascii=False)}')
        parts.append(f'source: {json.dumps(e["source"], ensure_ascii=False)}')
        lines.append("  { " + ", ".join(parts) + " },")
    lines.append("];")
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
