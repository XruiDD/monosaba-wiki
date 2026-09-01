import { useEffect, useRef, useState } from "react";
import type { MagicRecord } from "../types/wiki";

interface MagicsPageProps {
  magics: MagicRecord[];
  focus: string | null;
}

export default function MagicsPage({ magics, focus }: MagicsPageProps) {
  const [pulse, setPulse] = useState<number | null>(null);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focus) return;
    const id = Number.parseInt(focus, 10);
    if (Number.isNaN(id)) return;
    setPulse(id);
    const timer = setTimeout(() => document.querySelector(`[data-magic-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    if (pulseRef.current) clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(timer);
  }, [focus]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 贰 · GRIMOIRE</div>
        <h1 className="page-title">魔法总表</h1>
        <p className="page-dek">
          共 {magics.length} 个魔法分支。卷宗只列出可实际施放的魔法，解锁条件记在对应术式之下——记住这一点：
          在这里，痛苦是一把钥匙。
        </p>
        <div className="warden-quote">「魔力可以自动恢复，但你心里坏掉的那一块不会。」— 典狱长</div>
      </div>
      <div className="magics-grid">
        {magics.map((magic) => <MagicCard key={magic.id} magic={magic} pulse={pulse === magic.id}/>)}
      </div>
    </div>
  );
}

function MagicCard({ magic, pulse }: { magic: MagicRecord; pulse: boolean }) {
  const [variantIndex, setVariantIndex] = useState(0);
  const safeIndex = Math.min(variantIndex, Math.max(0, magic.variants.length - 1));
  const variant = magic.variants[safeIndex];
  if (!variant) return null;
  const description = variant.lore.filter((line) => (
    line !== variant.kind && !((line.includes("⌚") || line.includes("🔮")) && /\d/.test(line))
  ));

  return (
    <article data-magic-id={magic.id} className={`card magic-card ${pulse ? "focus-pulse" : ""}`}>
      <div className="corner tl"/><div className="corner tr"/><div className="corner bl"/><div className="corner br"/>
      <div className="magic-head">
        <div className="icon-frame">
          <img src={variant.image.path} className="pixel" alt={variant.name} loading="lazy" decoding="async" onError={(event) => {
            event.currentTarget.src = "assets/magics/missingno.png";
            event.currentTarget.onerror = null;
          }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="page-kicker" style={{ marginBottom: 2 }}>MAGIC · {String(magic.id).padStart(2, "0")}</div>
          <div className="magic-name serif">{magic.name}</div>
        </div>
      </div>

      <div className="magic-tabs">
        {magic.variants.map((entry, index) => (
          <button key={entry.id} className={`mtab ${safeIndex === index ? "active" : ""}`} onClick={() => setVariantIndex(index)}>
            {entry.id.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="magic-name-row">
        <span className="variant-name serif">{variant.kind} · {variant.name}</span>
      </div>

      {variant.stats.unlockCondition && (
        <div className="magic-unlock">
          <span>解锁条件</span>
          <strong>{variant.stats.unlockCondition}</strong>
        </div>
      )}

      <div className="magic-stats">
        {variant.stats.mpCost != null && <div className="stat"><span className="k">MP</span><span className="v">{variant.stats.mpCost}</span></div>}
        {variant.stats.cooldownSeconds != null && <div className="stat"><span className="k">CD</span><span className="v">{variant.stats.cooldownSeconds}s</span></div>}
        {variant.stats.duration && <div className="stat"><span className="k">持续</span><span className="v">{variant.stats.duration}</span></div>}
      </div>

      <div className="magic-desc">
        {description.length > 0
          ? description.map((line, index) => <p key={index}>{line}</p>)
          : <p className="faint">（无描述）</p>}
      </div>
    </article>
  );
}
