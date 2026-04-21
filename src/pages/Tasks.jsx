import { useEffect, useMemo, useRef, useState } from "react";

// 把 category 解析成可自然排序的 key：
// "back_prison" → [["back_prison"]]
// "group/1_collect_drug" → [["group"], [1,"collect_drug"]]
// "private/explore/10_playroom" → [["private"], ["explore"], [10,"playroom"]]
// 数字段按数值排，保证 1 < 2 < ... < 10 < 11
function taskSortKey(t) {
  const cat = String(t.category || t.source || t.name || "");
  return cat.split("/").map((seg) => {
    const m = seg.match(/^(\d+)_?(.*)$/);
    if (m) return [parseInt(m[1], 10), m[2]];
    return [Number.POSITIVE_INFINITY, seg];
  });
}

function compareTaskKeys(a, b) {
  const ka = taskSortKey(a);
  const kb = taskSortKey(b);
  const n = Math.max(ka.length, kb.length);
  for (let i = 0; i < n; i++) {
    const xa = ka[i] || [Number.NEGATIVE_INFINITY, ""];
    const xb = kb[i] || [Number.NEGATIVE_INFINITY, ""];
    if (xa[0] !== xb[0]) return xa[0] - xb[0];
    if (xa[1] !== xb[1]) return xa[1] < xb[1] ? -1 : 1;
  }
  return 0;
}

export default function TasksPage({ tasksRaw, focus }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [pulse, setPulse] = useState(null);
  const pulseRef = useRef(null);

  // 按任务 id 自然排序
  const sorted = useMemo(() => [...tasksRaw].sort(compareTaskKeys), [tasksRaw]);
  const types = Array.from(new Set(sorted.map((t) => t.type)));
  const filtered = filter === "all" ? sorted : sorted.filter((t) => t.type === filter);

  // 定位到 focus 指定的任务
  useEffect(() => {
    if (!focus) return;
    const idx = sorted.findIndex((t) => (t.category || "") === focus);
    if (idx < 0) return;
    setFilter("all");
    setOpen(idx);
    setPulse(idx);
    setTimeout(() => {
      const el = document.querySelector(`[data-task-idx="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
  }, [focus, sorted]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 肆 · DAILY TRIALS</div>
        <h1 className="page-title">任务与线索</h1>
        <p className="page-dek">
          共 {tasksRaw.length} 份任务档案。完成会降压、累积越狱进度；未完成——会累积别的什么。
          点开任何一项，查看背景、目标、奖励与惩罚。
        </p>
        <div className="warden-quote">「守时的孩子有糖吃；迟到的孩子——也有。」— 典狱长</div>
      </div>

      <div className="filters">
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          全部 <span className="faint">· {tasksRaw.length}</span>
        </button>
        {types.map((t) => (
          <button key={t} className={`filter-btn ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t} <span className="faint">· {tasksRaw.filter((x) => x.type === t).length}</span>
          </button>
        ))}
      </div>

      <div className="tasks-list">
        {filtered.map((t, i) => (
          <div
            key={i}
            data-task-idx={sorted.indexOf(t)}
            className={`task-row card ${open === sorted.indexOf(t) ? "open" : ""} ${pulse === sorted.indexOf(t) ? "focus-pulse" : ""}`}
            onClick={() => setOpen(open === sorted.indexOf(t) ? null : sorted.indexOf(t))}
          >
            <div className="corner tl"/><div className="corner tr"/>
            <div className="corner bl"/><div className="corner br"/>
            <div className="task-head">
              <div className="task-num mono">#{String(i + 1).padStart(2, "0")}</div>
              <div style={{flex: 1}}>
                <div className="task-title serif">{t.name}</div>
                <div className="task-meta">
                  <span className="chip">{t.type}</span>
                  <span className="faint mono">{t.category}</span>
                </div>
              </div>
              <div className="task-caret">{open === sorted.indexOf(t) ? "−" : "+"}</div>
            </div>
            {open === sorted.indexOf(t) && (
              <div className="task-body">
                <div className="tb-block">
                  <div className="tb-k">背景</div>
                  <div className="tb-v serif">{t.background || "—"}</div>
                </div>
                <div className="tb-block">
                  <div className="tb-k">目标</div>
                  <div className="tb-v serif">{t.objective || "—"}</div>
                </div>
                <div className="tb-row">
                  <div className="tb-block">
                    <div className="tb-k accent">奖励</div>
                    <div className="tb-v">{t.reward || "无"}</div>
                  </div>
                  <div className="tb-block">
                    <div className="tb-k danger">惩罚</div>
                    <div className="tb-v">{t.punishment || "无"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
