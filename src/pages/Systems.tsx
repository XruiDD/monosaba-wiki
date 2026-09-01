import { useEffect, useRef, useState } from "react";
import type { DamageRecord, StyleWithVariables } from "../types/wiki";

const STAGE_LABELS: Record<string, string> = { mild: "轻度", moderate: "中度", severe: "重度" };

export default function SystemsPage({ damage, focus }: { damage: DamageRecord[]; focus: string | null }) {
  const [pulse, setPulse] = useState<string | null>(null);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focus || !damage.some((record) => record.id === focus)) return;
    setPulse(focus);
    const timer = setTimeout(() => document.querySelector(`[data-system-id="${CSS.escape(focus)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    if (pulseRef.current) clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(timer);
  }, [focus, damage]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 伍 · DAMAGE SYSTEM</div>
        <h1 className="page-title">伤害机制</h1>
        <p className="page-dek">
          这里收录了 {damage.length} 类伤害与异常状态。部分伤势会逐步恶化，请留意屏幕上的提示并及时寻找对应的治疗手段。
        </p>
        <div className="warden-quote">「疼痛不是惩罚，只是身体递交给你的证词。」— 典狱长</div>
      </div>
      <div className="system-grid">
        {damage.map((record) => (
          <article
            key={record.id}
            data-system-id={record.id}
            className={`card system-card ${pulse === record.id ? "focus-pulse" : ""}`}
            style={{ "--system-color": record.color } as StyleWithVariables}
          >
            <div className="system-label mono">{record.label}</div>
            <h2 className="serif">{record.name}</h2>
            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              {record.severityStages.map((stage) => <span className="chip" key={stage}>{STAGE_LABELS[stage] ?? stage}</span>)}
            </div>
            {record.messages.length > 0 && (
              <div className="system-messages">{record.messages.map((message, index) => <p key={index}>{message}</p>)}</div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
