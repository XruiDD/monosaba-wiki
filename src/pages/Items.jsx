import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS_DATA } from "../data/items.js";
import { typeLabel } from "../data/constants.js";

export default function ItemsPage({ focus }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [pulse, setPulse] = useState(null);
  const pulseRef = useRef(null);

  // 处理 focus：滚动到指定 slug 的卡片，脉冲高亮 + 打开 modal
  useEffect(() => {
    if (!focus) return;
    const target = ITEMS_DATA.find((i) => i.slug === focus);
    if (!target) return;
    setTypeFilter("all");  // 确保该条目在当前过滤中可见
    setPulse(focus);
    // 等 DOM 渲染后滚动
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-item-slug="${focus}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    // 脉冲 2.4 秒后清除
    clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(t);
  }, [focus]);

  const types = [
    { id: "all", label: "全部" },
    { id: "weapon", label: "武器" },
    { id: "medical", label: "医疗" },
    { id: "food", label: "食物" },
    { id: "tool", label: "工具" },
    { id: "arcane", label: "超自然" },
  ];

  const typeCounts = useMemo(() => types.reduce((acc, t) => {
    acc[t.id] = t.id === "all" ? ITEMS_DATA.length : ITEMS_DATA.filter((i) => i.type === t.id).length;
    return acc;
  }, {}), []);

  const filtered = typeFilter === "all"
    ? ITEMS_DATA
    : ITEMS_DATA.filter((i) => i.type === typeFilter);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 壹 · ITEMS ARCHIVE</div>
        <h1 className="page-title">道具大全</h1>
        <p className="page-dek">
          本牢房中已登录的 {ITEMS_DATA.length} 件物品。武器、线索、饰品、处刑装置——每一件都在卷宗中编过号。
          你所持有的，决定了你在审判庭上能说出的那几句话。
        </p>
        <div className="warden-quote">「随身物品不止是你的，也是将来指向你的证物。」— 典狱长</div>
      </div>

      <div className="filters">
        {types.map((t) => (
          <button key={t.id}
            className={`filter-btn ${typeFilter === t.id ? "active" : ""}`}
            onClick={() => setTypeFilter(t.id)}>
            {t.label} <span className="faint">· {typeCounts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="items-grid">
        {filtered.map((it) => (
          <button
            key={it.source || it.slug}
            data-item-slug={it.slug}
            className={`item-card card ${pulse === it.slug ? "focus-pulse" : ""}`}
            onClick={() => setSelected(it)}
          >
            <div className="corner tl"/><div className="corner tr"/>
            <div className="corner bl"/><div className="corner br"/>
            <div className="flex gap-16" style={{alignItems: "flex-start"}}>
              <div className="icon-frame">
                <img src={`assets/items/${it.iconSlug || it.slug}.png`} className="pixel" alt={it.name}
                  onError={(e) => {
                    const img = e.currentTarget;
                    // 先回退到 base slug，再回退到隐藏
                    if (it.iconSlug && it.iconSlug !== it.slug && img.src.includes(`${it.slug}.png`)) {
                      img.src = `assets/items/${it.iconSlug}.png`;
                    } else {
                      img.style.display = "none";
                    }
                  }}/>
              </div>
              <div style={{flex: 1, textAlign: "left"}}>
                <div className="item-name serif">{it.name}</div>
                <div className="flex gap-4 mt-8" style={{flexWrap: "wrap"}}>
                  <span className="chip">{typeLabel(it.type)}</span>
                  {it.cd && <span className="chip">CD {it.cd}</span>}
                </div>
                {it.lore && (
                  <p className="item-lore" style={{whiteSpace: "pre-line"}}>{it.lore}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && <ItemModal item={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}

function ItemModal({ item, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="flex gap-20 mb-16" style={{alignItems: "flex-start"}}>
          <div className="icon-frame lg">
            <img src={`assets/items/${item.iconSlug || item.slug}.png`} className="pixel" alt={item.name}
              onError={(e) => {
                const img = e.currentTarget;
                if (item.iconSlug && item.iconSlug !== item.slug && img.src.includes(`${item.slug}.png`)) {
                  img.src = `assets/items/${item.iconSlug}.png`;
                }
              }}/>
          </div>
          <div style={{flex: 1}}>
            <div className="page-kicker">{typeLabel(item.type).toUpperCase()} · {item.slug}</div>
            <h2 className="serif" style={{fontSize: 32, margin: "6px 0 10px"}}>{item.name}</h2>
            <div className="flex gap-4" style={{flexWrap: "wrap"}}>
              {item.mp && <span className="chip">MP {item.mp}</span>}
              {item.cd && <span className="chip">冷却 {item.cd}</span>}
              {item.dur && <span className="chip">持续 {item.dur}</span>}
              {item.food && <span className="chip">{item.food}</span>}
            </div>
          </div>
        </div>
        <div className="divider">道具描述</div>
        <p className="serif" style={{fontSize: 17, lineHeight: 1.9, whiteSpace: "pre-line"}}>{item.lore || "—"}</p>
        <div className="divider">卷宗备注</div>
        <p className="muted tiny mono">
          FILE ID: {item.slug.toUpperCase()} · CATEGORY: {item.type.toUpperCase()}
          {item.model && <> · MODEL: {item.model}</>}
        </p>
      </div>
    </div>
  );
}
