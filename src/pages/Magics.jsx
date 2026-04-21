import { useEffect, useRef, useState } from "react";
import { parseVariant } from "../data/constants.js";

export default function MagicsPage({ magicsRaw, focus }) {
  const [openId, setOpenId] = useState(null);
  const [pulse, setPulse] = useState(null);
  const pulseRef = useRef(null);

  useEffect(() => {
    if (!focus) return;
    const id = parseInt(focus, 10);
    if (Number.isNaN(id)) return;
    setOpenId(id);
    setPulse(id);
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-magic-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(t);
  }, [focus]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 贰 · GRIMOIRE</div>
        <h1 className="page-title">魔法总表</h1>
        <p className="page-dek">
          共 24 个魔法分支，每分支拥有『锁定』『第一变体』『第二变体』共三种形态。
          第二变体只在意志力低于门槛后解锁——记住这一点：
          在这里，痛苦是一把钥匙。
        </p>
        <div className="warden-quote">「魔力可以自动恢复，但你心里坏掉的那一块不会。」— 典狱长</div>
      </div>

      <div className="magics-grid">
        {magicsRaw.map((m) => (
          <MagicCard
            key={m.id}
            m={m}
            open={openId === m.id}
            pulse={pulse === m.id}
            onOpen={() => setOpenId(openId === m.id ? null : m.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MagicCard({ m, open, pulse }) {
  const variants = m.variants || [];
  const defaultIdx = Math.min(1, Math.max(0, variants.length - 1));
  const [variantIdx, setVariantIdx] = useState(defaultIdx);
  const safeIdx = Math.min(variantIdx, variants.length - 1);
  const variant = variants[safeIdx] || { name: "—", item_model: "magics:missingno", lore: [] };
  const parsed = parseVariant(variant);
  const locked = safeIdx === 0;
  const tabs = variants.map((v, i) => {
    const label = i === 0 ? "?" : String.fromCharCode(64 + i); // 1->A, 2->B, 3->C
    return { label, name: i === 0 ? "未解锁" : v.name, idx: i };
  });

  return (
    <div
      data-magic-id={m.id}
      className={`card magic-card ${open ? "open" : ""} ${pulse ? "focus-pulse" : ""}`}
    >
      <div className="corner tl"/><div className="corner tr"/>
      <div className="corner bl"/><div className="corner br"/>
      <div className="magic-head">
        <div className="icon-frame">
          <img
            src={`assets/magics/${variant.item_model.replace("magics:", "")}.png`}
            className="pixel" alt={variant.name}
            onError={(e) => { e.currentTarget.src = "assets/magics/missingno.png"; }}/>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div className="page-kicker" style={{marginBottom: 2}}>MAGIC · {String(m.id).padStart(2,"0")}</div>
          <div className="magic-name serif">{m.zh_name}</div>
        </div>
      </div>

      <div className="magic-tabs">
        {tabs.map((t) => (
          <button key={t.idx}
            className={`mtab ${safeIdx === t.idx ? "active" : ""} ${t.idx === 0 ? "locked" : ""}`}
            onClick={() => setVariantIdx(t.idx)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="magic-name-row">
        <span className={`variant-name serif ${locked ? "faint" : ""}`}>
          {locked ? "？？？ · 尚未解锁" : variant.name}
        </span>
      </div>

      <div className="magic-stats">
        {parsed.mp && <div className="stat"><span className="k">MP</span><span className="v">{parsed.mp}</span></div>}
        {parsed.cd && <div className="stat"><span className="k">CD</span><span className="v">{parsed.cd}</span></div>}
        {parsed.dur && <div className="stat"><span className="k">持续</span><span className="v">{parsed.dur}</span></div>}
      </div>

      <div className="magic-desc">
        {parsed.desc.length > 0 ? parsed.desc.map((d, i) => <p key={i}>{d}</p>)
          : <p className="faint">（无描述）</p>}
        {parsed.passive.length > 0 && (
          <>
            <div className="divider" style={{margin: "14px 0 8px"}}>被动</div>
            {parsed.passive.map((d, i) => <p key={i} className="muted">{d}</p>)}
          </>
        )}
      </div>
    </div>
  );
}
