import { useEffect, useRef, useState } from "react";
import type { StyleWithVariables, TalentRecord } from "../types/wiki";

export default function TalentsPage({ talents, focus }: { talents: TalentRecord[]; focus: string | null }) {
  const [pulse, setPulse] = useState<number | null>(null);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focus) return;
    const id = Number.parseInt(focus, 10);
    if (Number.isNaN(id)) return;
    setPulse(id);
    const timer = setTimeout(() => document.querySelector(`[data-talent-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    if (pulseRef.current) clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(timer);
  }, [focus]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 叁 · TALENT REGISTRY</div>
        <h1 className="page-title">天赋档案</h1>
        <p className="page-dek">
          共收录 {talents.length} 项天赋。它们会带来不同的初始道具与特殊能力，也可能悄悄改变你在牢房中的生存方式。
        </p>
        <div className="warden-quote">「所谓天赋，不过是你醒来后首先发现的那一道裂痕。」— 典狱长</div>
      </div>
      <div className="talent-grid">
        {talents.map((talent) => (
          <article
            key={talent.id}
            data-talent-id={talent.id}
            className={`card talent-card ${pulse === talent.id ? "focus-pulse" : ""}`}
            style={{ "--talent-color": talent.color || "var(--accent)" } as StyleWithVariables}
          >
            <div className="corner tl"/><div className="corner tr"/><div className="corner bl"/><div className="corner br"/>
            <div className="talent-number mono">TALENT · {String(talent.id).padStart(2, "0")}</div>
            <h2 className="serif talent-name">{talent.name}</h2>
            <p className="talent-effect">{talent.effect}</p>
            <div className="divider">卷宗记述</div>
            <p className="muted serif">{talent.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
