import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pinyin } from "pinyin-pro";
import { ITEMS_DATA } from "../data/items.js";
import { ACC_DATA, TEAM } from "../data/accessories.js";
import { typeLabel } from "../data/constants.js";

/* 中文 → 拼音工具
 * full    "仪礼剑" → "yilijian"
 * initial "仪礼剑" → "ylj"
 */
const _pyCache = new Map();
function pyFull(s) {
  if (!s) return "";
  if (_pyCache.has("f:" + s)) return _pyCache.get("f:" + s);
  const v = pinyin(s, { toneType: "none", type: "array", nonZh: "consecutive" })
    .join("")
    .toLowerCase();
  _pyCache.set("f:" + s, v);
  return v;
}
function pyInitial(s) {
  if (!s) return "";
  if (_pyCache.has("i:" + s)) return _pyCache.get("i:" + s);
  const v = pinyin(s, { toneType: "none", pattern: "first", type: "array", nonZh: "consecutive" })
    .join("")
    .toLowerCase();
  _pyCache.set("i:" + s, v);
  return v;
}
function hasChinese(s) {
  return /[\u4e00-\u9fff]/.test(s || "");
}

const RECENT_KEY = "manosaba.search.recent";
const MAX_RECENT = 8;

/* ─── 模糊匹配打分 ──────────────────────────────
   返回数值：0 = 不匹配；越高越优先。
   规则：完全相等 >> 前缀 >> 连续子串 >> 子序列（全部字符按顺序出现）
*/
function fuzzyScore(text, needle) {
  if (!text || !needle) return 0;
  const t = String(text).toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;

  if (t === n) return 1000;
  if (t.startsWith(n)) return 700 - Math.min(200, t.length);
  const idx = t.indexOf(n);
  if (idx >= 0) return 500 - idx * 4 - Math.min(100, t.length);

  // 子序列：needle 每个字符在 text 中按顺序出现
  let i = 0, j = 0, consec = 0, best = 0, first = -1;
  while (i < t.length && j < n.length) {
    if (t[i] === n[j]) {
      if (first < 0) first = i;
      j++; consec++;
      best = Math.max(best, consec);
    } else consec = 0;
    i++;
  }
  if (j === n.length) {
    return 150 + best * 15 - Math.min(80, first);
  }
  return 0;
}

/* 针对单个条目，尝试多字段匹配 + 拼音匹配，取加权最高 */
function entryScore(e, q) {
  const scores = [
    fuzzyScore(e.name, q) * 3.0,
    fuzzyScore(e.en || "", q) * 2.0,
    fuzzyScore(e.sub, q) * 1.5,
    fuzzyScore(e.kind, q) * 1.5,
    fuzzyScore(e.extra || "", q) * 0.8,
  ];
  // 拼音匹配：query 看起来像英文/字母时，把条目名字和分类转拼音对比
  if (/^[a-z]/i.test(q) && hasChinese(e.name)) {
    scores.push(fuzzyScore(pyFull(e.name), q) * 2.5);
    scores.push(fuzzyScore(pyInitial(e.name), q) * 2.8);   // 首字母匹配权重略高
    scores.push(fuzzyScore(pyFull(e.kind || ""), q) * 1.2);
  }
  return Math.max(...scores);
}

/* 把匹配到的字符片段高亮出来 —— 简单连续子串高亮 */
function Highlight({ text, query }) {
  if (!query || !text) return text || null;
  const t = String(text);
  const q = query.toLowerCase();
  const lower = t.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) {
    // fallback: 高亮每个匹配的字符（子序列模式）
    let j = 0;
    const out = [];
    for (let i = 0; i < t.length; i++) {
      if (j < q.length && lower[i] === q[j]) {
        out.push(<mark key={i}>{t[i]}</mark>);
        j++;
      } else out.push(t[i]);
    }
    return <>{out}</>;
  }
  return (
    <>
      {t.slice(0, idx)}
      <mark>{t.slice(idx, idx + q.length)}</mark>
      {t.slice(idx + q.length)}
    </>
  );
}

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, MAX_RECENT);
  } catch { return []; }
}
function saveRecent(entry) {
  try {
    const list = loadRecent().filter((r) => r.id !== entry.id);
    list.unshift(entry);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch { /* noop */ }
}

export default function SearchPalette({ open, onClose, magicsRaw, tasksRaw, navigate }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(() => loadRecent());
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setRecent(loadRecent());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* 构建索引：为每个可跳转对象生成一条记录 */
  const index = useMemo(() => {
    const idx = [];

    ITEMS_DATA.forEach((i) =>
      idx.push({
        id: `item:${i.slug}`,
        kind: "道具",
        name: i.name,
        sub: typeLabel(i.type),
        extra: `${i.lore || ""} ${i.cd || ""}`,
        page: "items",
        focus: i.slug,
        icon: `assets/items/${i.iconSlug || i.slug}.png`,
        badge: i.rarity === "witch" ? "魔女" : i.rarity === "warden" ? "典狱长" : null,
        badgeClass: "danger",
      }),
    );

    ACC_DATA.forEach((a) =>
      idx.push({
        id: `acc:${a.slug}`,
        kind: "饰品",
        name: a.name,
        sub: a.team.toUpperCase(),
        extra: a.effect,
        page: "chars",
        focus: a.slug,
        icon: `assets/characters/${a.img}`,
        color: TEAM[a.team],
      }),
    );

    (magicsRaw || []).forEach((m) =>
      (m.variants || []).slice(1).forEach((v, vi) =>
        idx.push({
          id: `magic:${m.id}:${vi}`,
          kind: "魔法",
          name: `${m.zh_name} · ${v.name}`,
          sub: `MAGIC · ${String(m.id).padStart(2, "0")}`,
          extra: (v.lore || []).join(" "),
          page: "magics",
          focus: String(m.id),
          icon: `assets/magics/${(v.item_model || "").replace("magics:", "")}.png`,
        }),
      ),
    );

    (tasksRaw || []).forEach((t, i) =>
      idx.push({
        id: `task:${t.category || i}`,
        kind: "任务",
        name: t.name,
        sub: t.type || "任务",
        extra: `${t.background || ""} ${t.objective || ""} ${t.reward || ""}`,
        page: "tasks",
        focus: t.category || String(i),
      }),
    );

    // 规则页面 + 三阵营
    idx.push({ id: "page:rules",    kind: "页面", name: "规则与阵营", sub: "RULES",    page: "rules" });
    idx.push({ id: "faction:witch",      kind: "阵营", name: "魔女阵营",   sub: "WITCH",    page: "rules", focus: "witch" });
    idx.push({ id: "faction:witch_prep", kind: "阵营", name: "预备魔女",   sub: "PREP.",    page: "rules", focus: "witch_prep" });
    idx.push({ id: "faction:witch_kill", kind: "阵营", name: "杀意魔女",   sub: "KILLER",   page: "rules", focus: "witch_kill" });

    // 教程 5 章
    const chapterNames = ["引子·三个阵营", "魔法与意志力", "地图与探索", "死亡与审判", "终章·悖演残响"];
    chapterNames.forEach((n, i) => idx.push({
      id: `tut:${i}`, kind: "教程",
      name: `CAM ${i + 1} · ${n}`,
      sub: "WARDEN", page: "tutorial", focus: String(i),
    }));

    // 其他页面
    idx.push({ id: "page:home",     kind: "页面", name: "首页",       sub: "HOME",     page: "home" });
    idx.push({ id: "page:tutorial", kind: "页面", name: "典狱长旁白", sub: "TUTORIAL", page: "tutorial" });
    idx.push({ id: "page:items",    kind: "页面", name: "道具大全",   sub: "ITEMS",    page: "items" });
    idx.push({ id: "page:magics",   kind: "页面", name: "魔法总表",   sub: "GRIMOIRE", page: "magics" });
    idx.push({ id: "page:chars",    kind: "页面", name: "饰品图鉴",   sub: "ACC.",     page: "chars" });
    idx.push({ id: "page:tasks",    kind: "页面", name: "任务与线索", sub: "TRIALS",   page: "tasks" });

    return idx;
  }, [magicsRaw, tasksRaw]);

  const results = useMemo(() => {
    const term = q.trim();
    if (!term) return [];
    return index
      .map((e) => ({ e, s: entryScore(e, term) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.e);
  }, [q, index]);

  const showing = q.trim() ? results : recent.map((r) => index.find((x) => x.id === r.id)).filter(Boolean);

  const pick = useCallback(
    (r) => {
      if (!r) return;
      saveRecent({ id: r.id, page: r.page, focus: r.focus || null });
      navigate(r.page, r.focus || null);
      onClose();
    },
    [navigate, onClose],
  );

  // 选中项跟随滚动
  useEffect(() => {
    const el = listRef.current?.querySelector(".palette-item.active");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [active]);

  // 当结果变化时把 active 夹到范围内
  useEffect(() => {
    setActive((i) => Math.max(0, Math.min(i, showing.length - 1)));
  }, [showing.length]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(showing.length - 1, i + 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter")     { e.preventDefault(); pick(showing[active]); }
    else if (e.key === "Tab" && showing[active]) {
      // Tab = 跳到该结果的分类页但不关闭
      e.preventDefault();
      navigate(showing[active].page);
    }
  };

  if (!open) return null;

  const clearRecent = () => {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* noop */ }
    setRecent([]);
  };

  // 为当前列表分组显示（仅搜索时带 kind 头）
  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-head">
          <span className="sicon">⌕</span>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="搜索 · 道具 / 魔法 / 任务 / 饰品 / 页面 …… （支持模糊匹配）"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {q && (
            <button className="palette-clear" onClick={() => { setQ(""); inputRef.current?.focus(); }} title="清空">
              ×
            </button>
          )}
          <kbd className="palette-esc">Esc</kbd>
        </div>

        <div className="palette-body" ref={listRef}>
          {/* 空态 */}
          {!q.trim() && recent.length === 0 && (
            <div className="palette-hint">
              <div className="palette-hint-title">输入关键字检索全部档案</div>
              <div className="palette-hint-sub">
                · 道具 {ITEMS_DATA.length} 件
                · 饰品 {ACC_DATA.length} 件
                · 魔法变体 {(magicsRaw || []).reduce((a, m) => a + ((m.variants?.length || 1) - 1), 0)}
                · 任务 {(tasksRaw || []).length}
                · 页面 7
              </div>
              <div className="palette-hint-sub" style={{ marginTop: 18 }}>
                支持汉字、英文、关键词片段 / 子序列匹配
              </div>
            </div>
          )}

          {/* 历史记录 */}
          {!q.trim() && recent.length > 0 && (
            <>
              <div className="palette-section">
                <span>最近访问</span>
                <button className="palette-section-btn" onClick={clearRecent}>清除</button>
              </div>
              {showing.map((r, i) => (
                <PaletteItem
                  key={r.id} r={r} i={i}
                  active={i === active} q=""
                  onHover={() => setActive(i)} onClick={() => pick(r)}
                />
              ))}
            </>
          )}

          {/* 搜索结果 */}
          {q.trim() && showing.length === 0 && (
            <div className="palette-hint">
              <div className="palette-hint-title faint">无匹配结果</div>
              <div className="palette-hint-sub">试试更短的关键词，或切换词语顺序</div>
            </div>
          )}

          {q.trim() && showing.length > 0 && (
            <GroupedResults list={showing} active={active} q={q} onHover={setActive} pick={pick}/>
          )}
        </div>

        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Tab</kbd> 跳到分类</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  );
}

function GroupedResults({ list, active, q, onHover, pick }) {
  // 保持排序（按分数），同时穿插 kind 分隔（仅当相邻 kind 变化时）
  const out = [];
  let lastKind = null;
  list.forEach((r, i) => {
    if (r.kind !== lastKind) {
      out.push(
        <div key={`k-${i}`} className="palette-section">
          <span>{r.kind}</span>
        </div>,
      );
      lastKind = r.kind;
    }
    out.push(
      <PaletteItem
        key={r.id} r={r} i={i}
        active={i === active} q={q}
        onHover={() => onHover(i)} onClick={() => pick(r)}
      />,
    );
  });
  return out;
}

function PaletteItem({ r, active, q, onHover, onClick }) {
  return (
    <div
      className={`palette-item ${active ? "active" : ""}`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <div className="palette-item-left">
        {r.icon && (
          <div className="palette-item-icon">
            <img
              src={r.icon}
              alt=""
              className="pixel"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        )}
        {!r.icon && (
          <div className="palette-item-icon ph" style={{ background: r.color || undefined }}>
            {r.name?.[0] || "?"}
          </div>
        )}
        <div className="palette-item-body">
          <div className="palette-item-name">
            <Highlight text={r.name} query={q}/>
          </div>
          <div className="palette-item-meta">
            <span className="palette-kind">{r.kind}</span>
            <span className="dot">·</span>
            <span className="palette-sub"><Highlight text={r.sub} query={q}/></span>
            {r.badge && <span className={`chip tiny ${r.badgeClass || ""}`}>{r.badge}</span>}
          </div>
        </div>
      </div>
      <div className="palette-item-arrow">→</div>
    </div>
  );
}
