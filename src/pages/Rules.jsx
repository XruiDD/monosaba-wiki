import { useEffect, useState } from "react";
import { FACTIONS, DAMAGE_LABELS } from "../data/constants.js";

export default function RulesPage({ focus }) {
  const damageTypes = Object.entries(DAMAGE_LABELS).filter(([k]) => k !== "total_test");
  const [pulse, setPulse] = useState(null);

  useEffect(() => {
    if (!focus) return;
    setPulse(focus);
    setTimeout(() => {
      const el = document.querySelector(`[data-faction-id="${focus}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    const t = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(t);
  }, [focus]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 伍 · THE ORDER</div>
        <h1 className="page-title">规则与阵营</h1>
        <p className="page-dek">
          三方阵营，两种结局，一间牢房。欢迎阅读《魔法少女的悖演重构》地图内「囚庭演定」审判玩法的骨架——明白这些，你才会明白自己为什么还活着。
        </p>
        <div className="warden-quote">「规则这种东西——你打破过，就会开始怕它。」— 典狱长</div>
      </div>

      <div className="divider">三方阵营</div>
      <div className="factions-grid">
        {FACTIONS.map((f) => (
          <div
            key={f.id}
            data-faction-id={f.id}
            className={`faction-card card ${pulse === f.id ? "focus-pulse" : ""}`}
            style={{"--f-color": f.color}}
          >
            <div className="corner tl"/><div className="corner tr"/>
            <div className="corner bl"/><div className="corner br"/>
            <div className="faction-head">
              <div className="faction-ko mono">{f.en}</div>
              <div className="faction-zh serif">{f.zh}</div>
            </div>
            <div className="faction-gist serif">{f.gist}</div>
            <div className="divider" style={{margin: "14px 0 10px"}}>条款</div>
            <ul className="faction-list">
              {f.detail.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="divider">核心循环</div>
      <div className="loop-flow">
        {[
          {k: "01", t: "任务与探索", d: "分配日常任务，用放大镜调查发光点，收集线索与饰品"},
          {k: "02", t: "未确认死亡", d: "某具遗体被调查后，启动『调查阶段』—— 4 分钟"},
          {k: "03", t: "魔女审判",   d: "所有存活玩家被传唤至审判庭，可出示线索"},
          {k: "04", t: "投票与处刑", d: "累积两轮最高票 / 超时最高票者被处刑"},
          {k: "05", t: "继续或结束", d: "达成阵营胜利条件前，回到循环第一步"},
        ].map((s) => (
          <div key={s.k} className="loop-step card">
            <div className="corner tl"/><div className="corner tr"/>
            <div className="corner bl"/><div className="corner br"/>
            <div className="ls-num mono">{s.k}</div>
            <div className="ls-title serif">{s.t}</div>
            <div className="ls-desc">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="divider">伤害类型 · 卷宗编码</div>
      <div className="dmg-grid">
        {damageTypes.map(([k, v]) => (
          <div key={k} className="dmg-chip" style={{borderColor: v.color}}>
            <div className="dmg-en mono" style={{color: v.color}}>{v.en}</div>
            <div className="dmg-zh serif">{v.zh}</div>
          </div>
        ))}
      </div>

      <div className="divider">关键属性</div>
      <div className="attrs-grid">
        {[
          {n: "意志力",  en: "WILLPOWER", d: "低于 50% 概率触发『低意志影响』——预备魔女可能转化为『杀意魔女』。但意志力越低，魔法效果越强。"},
          {n: "魔力 MP", en: "MANA",      d: "施法消耗。低于 100 时每秒 +4，恢复上限 100，但累积上无封顶。"},
          {n: "压力值",  en: "PRESSURE",  d: "游戏行为会持续改变。别人死亡、任务失败、特殊道具都可影响。"},
          {n: "越狱进度",en: "BREAKOUT",  d: "完成任务累积。达到 100% 即可判定『预备魔女』胜利。"},
        ].map((a) => (
          <div key={a.en} className="attr-card card">
            <div className="corner tl"/><div className="corner tr"/>
            <div className="corner bl"/><div className="corner br"/>
            <div className="attr-en mono accent">{a.en}</div>
            <div className="attr-zh serif">{a.n}</div>
            <div className="attr-desc muted">{a.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
