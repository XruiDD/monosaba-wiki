import { useEffect, useState } from "react";
import { FACTIONS } from "../data/constants";
import type { StyleWithVariables } from "../types/wiki";

export default function RulesPage({ focus }: { focus: string | null }) {
  const [pulse, setPulse] = useState<string | null>(null);

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
          三方阵营，四种终局，一间牢房。欢迎阅读《魔法少女的悖演重构》地图内「囚庭演定」审判玩法的骨架——明白这些，你才会明白自己为什么还活着。
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
            style={{"--f-color": f.color} as StyleWithVariables}
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
          {k: "01", t: "任务与探索", d: "首个引导任务结束后，魔力自然恢复、玩家受伤与物资点开始解禁；其后继续完成日常任务、调查发光点并收集线索与饰品"},
          {k: "02", t: "确认死亡",   d: "遗体被首次确认后进入调查流程；开场播报结束后约 4 分钟召开审判，调查保护期间不能直接攻击"},
          {k: "03", t: "魔女审判",   d: "所有存活玩家被传唤至审判庭；先进行 1 分 30 秒初议并票选嫌疑人，再进行 1 分 30 秒首次审问；若尚未触发处刑，则进入最长 15 分钟的自由辩论"},
          {k: "04", t: "投票与处刑", d: "每次发言或打断完整结束后进行投票；普通投票中累计两次成为最高票者会被处刑，辩论超时进入终审，终审最高票者直接处刑，只有终审全员弃票时全员受罚"},
          {k: "05", t: "继续或结束", d: "审判结束后核对终局：越狱进度达到 100 或场上只剩预备魔女；场上只剩魔女阵营；杀意魔女成为唯一存活者；或无人生还。若均未发生，新一轮任务照常开始"},
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

      <div className="divider">终局判定</div>
      <div className="attrs-grid">
        {[
          {n: "预备魔女胜利", en: "HAPPY END", d: "越狱进度达到 100，或场上只剩至少一名预备魔女。"},
          {n: "魔女阵营胜利", en: "BAD END", d: "场上不再有预备魔女与杀意魔女，且仍有魔女或共犯存活。"},
          {n: "杀意魔女胜利", en: "TRUE END?", d: "场上只剩一名存活者，且该玩家是杀意魔女。"},
          {n: "无人生还", en: "HAPPY END?", d: "场上没有任何玩家存活时进入的独立终局。"},
        ].map((ending) => (
          <div key={ending.en} className="attr-card card">
            <div className="corner tl"/><div className="corner tr"/>
            <div className="corner bl"/><div className="corner br"/>
            <div className="attr-en mono accent">{ending.en}</div>
            <div className="attr-zh serif">{ending.n}</div>
            <div className="attr-desc muted">{ending.d}</div>
          </div>
        ))}
      </div>

      <div className="divider">关键属性</div>
      <div className="attrs-grid">
        {[
          {n: "压力值与意志状态", en: "PRESSURE", d: "压力值范围为 0–100；界面中的『意志力』是它的反向表现。受到伤害、任务失败或使用特定道具都可能改变压力值；达到 50 后开始进入低意志影响区间。"},
          {n: "魔力 MP", en: "MANA", d: "首个引导任务结束后开启自然恢复：低于 100 时每 0.5 秒回复 1 点。审判期间魔力暂存并归零，闭庭后返还原值；其他效果可使魔力超过 100。"},
          {n: "低意志事件", en: "BREAKDOWN", d: "预备魔女的压力值达到 50 后会周期性接受触发检定，压力越高越容易开始。事件结果可能是压力缓解、转化为杀意魔女或死亡，部分天赋可以阻止转化。"},
          {n: "越狱进度", en: "BREAKOUT", d: "由任务结算增加或扣减；达到 100 时触发预备魔女胜利。场上只剩预备魔女时，同样会立即判定胜利。"},
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
