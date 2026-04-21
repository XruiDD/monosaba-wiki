import { useEffect, useRef, useState } from "react";
import { ITEMS_DATA } from "../data/items.js";
import CommunityBoard from "../components/CommunityBoard.jsx";
import LicenseModal from "../components/LicenseModal.jsx";

// phase 语义：
//   -1  点击以继续（等待首次交互）
//    0  黑场
//    1  猫头鹰封印
//    2  典狱长旁白（打字机）
//    3  主菜单
export default function HomePage({ navigate }) {
  const [phase, setPhase] = useState(-1);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const LINES = [
    "——咳咳。",
    "欢迎光临。",
    "你，被选中了。",
    "在这里，每一次沉默都会被记入卷宗；",
    "每一次发言，都将被庭上八双眼睛反复咀嚼。",
    "这并非游戏——这是『囚庭演定』。",
  ];

  // 控制开场期间隐藏全站浮窗（音乐钮等）
  useEffect(() => {
    if (phase < 3) document.body.classList.add("opening-active");
    else document.body.classList.remove("opening-active");
    return () => document.body.classList.remove("opening-active");
  }, [phase]);

  // phase 0 → 1 → 2 推进（仅 phase < 2 时，且已经点击过继续）
  useEffect(() => {
    if (phase < 0) return;
    if (skipped) { setPhase(3); return; }
    if (phase >= 2) return;

    let t1, t2;
    if (phase === 0) t1 = setTimeout(() => setPhase(1), 1200);
    if (phase === 0 || phase === 1) {
      const delay = phase === 0 ? 4400 : 3200;
      t2 = setTimeout(() => setPhase(2), delay);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [skipped, phase]);

  // 逐字显示
  // 经估算：6 行 67 字，10 标点；60ms/字 + 200ms/标点 ≈ 5.4s 纯打字
  //         加 6 次停顿 ~5.2s，加 phase 0+1 = 4.4s，结尾 1.4s ≈ 16-17s 总开场
  useEffect(() => {
    if (phase !== 2 || skipped) return;
    if (lineIdx >= LINES.length) return;
    const line = LINES[lineIdx];
    if (charIdx >= line.length) return;
    const ch = line[charIdx];
    const delay = /[，。；！？——、『』「」]/.test(ch) ? 200 : 60;
    const t = setTimeout(() => setCharIdx((i) => i + 1), delay);
    return () => clearTimeout(t);
  }, [phase, lineIdx, charIdx, skipped]);

  // 一行写完 → 停顿 → 下一行
  useEffect(() => {
    if (phase !== 2 || skipped) return;
    if (lineIdx >= LINES.length) {
      const t = setTimeout(() => setPhase(3), 1400);
      return () => clearTimeout(t);
    }
    const line = LINES[lineIdx];
    if (charIdx < line.length) return;
    const hold = Math.min(1400, 500 + line.length * 40);
    const t = setTimeout(() => {
      setLineIdx((i) => i + 1);
      setCharIdx(0);
    }, hold);
    return () => clearTimeout(t);
  }, [phase, lineIdx, charIdx, skipped]);

  const beginOpening = () => {
    if (phase === -1) setPhase(0);
  };

  return (
    <div className="home-stage" onClick={phase === -1 ? beginOpening : undefined}>
      {/* 点击以继续：首屏门禁，浮窗全部隐藏 */}
      {phase === -1 && (
        <div className="opening-gate">
          <div className="gate-frame">
            <div className="gate-line"/>
            <div className="gate-hint serif">点击以继续</div>
            <div className="gate-sub mono">CLICK · ANYWHERE · TO · ENTER</div>
            <div className="gate-line"/>
          </div>
        </div>
      )}

      {phase >= 0 && phase < 3 && (
        <button className="skip-btn" onClick={() => setSkipped(true)}>
          跳过旁白 <span className="mono">[ SKIP ]</span>
        </button>
      )}

      {phase >= 1 && phase < 3 && (
        <div className="owl-seal" aria-hidden="true">
          <svg className="os-crest" viewBox="0 0 240 240" width="220" height="220">
            {/* 最外细圈 */}
            <circle cx="120" cy="120" r="108" fill="none"
                    stroke="rgb(var(--accent-rgb))" strokeWidth="0.8" opacity="0.35"/>
            {/* 中圈虚线 */}
            <circle cx="120" cy="120" r="92" fill="none"
                    stroke="rgb(var(--accent-rgb))" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.55"/>
            {/* 内圈描边 */}
            <circle cx="120" cy="120" r="64" fill="none"
                    stroke="rgb(var(--accent-rgb))" strokeWidth="1.2"/>
            {/* 四角法庭十字刻度 */}
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a} 120 120)`}>
                <line x1="120" y1="8" x2="120" y2="22"
                      stroke="rgb(var(--accent-rgb))" strokeWidth="1"/>
                <line x1="120" y1="28" x2="120" y2="34"
                      stroke="rgb(var(--accent-rgb))" strokeWidth="0.7" opacity="0.7"/>
              </g>
            ))}
            {/* 中心四角星印 */}
            <path
              d="M120 76 L126 114 L160 120 L126 126 L120 164 L114 126 L80 120 L114 114 Z"
              fill="rgb(var(--accent-rgb))"
              opacity="0.92"
            />
            {/* 中心小圆点 */}
            <circle cx="120" cy="120" r="3" fill="rgb(var(--accent-rgb))"/>
          </svg>
          <div className="os-glow"/>
        </div>
      )}

      {phase === 2 && (
        <div className="warden-lines">
          {LINES.map((line, i) => {
            if (i > lineIdx) return null;
            const isCurrent = i === lineIdx;
            const shown = isCurrent ? line.slice(0, charIdx) : line;
            const isTyping = isCurrent && charIdx < line.length;
            return (
              <p
                key={i}
                className={`warden-line ${isCurrent ? "current" : "past"} ${isTyping ? "typing" : ""}`}
              >
                {shown}
                {isCurrent && <span className="warden-caret"/>}
              </p>
            );
          })}
        </div>
      )}

      {phase >= 3 && <HomeMenu navigate={navigate}/>}
    </div>
  );
}

/* ============================================
   剧场式菜单：金线扫过 / 视差倾斜 / 烛光脉动 / 入场错峰
   ============================================ */
function HomeMenu({ navigate }) {
  const [licenseOpen, setLicenseOpen] = useState(false);
  const menu = [
    { id: "items",    t: "道具大全",   sub: "ITEMS · ARCHIVE",    n: `${ITEMS_DATA.length} 件`,  glyph: "◈", idx: "I"   },
    { id: "magics",   t: "魔法总表",   sub: "GRIMOIRE",           n: "24 × 3 变体",              glyph: "✦", idx: "II"  },
    { id: "chars",    t: "饰品图鉴",   sub: "ACCESSORIES",        n: "16 件 + 联动",              glyph: "❂", idx: "III" },
    { id: "tasks",    t: "任务与线索", sub: "DAILY TRIALS",       n: "24 份档案",                 glyph: "⚖", idx: "IV"  },
    { id: "rules",    t: "规则与阵营", sub: "THE ORDER",          n: "三方审判",                 glyph: "✚", idx: "V"   },
    { id: "tutorial", t: "典狱长旁白", sub: "WARDEN'S BRIEFING",  n: "五章节",                   glyph: "✎", idx: "VI"  },
  ];

  return (
    <div className="home-landing hv2">
      <BackgroundFX/>

      <header className="home-masthead hv2">
        <div className="home-map-title serif">《魔法少女的悖演重构》</div>
        <h1 className="home-title serif">
          <span className="ttl-char" style={{animationDelay: "0ms"}}>囚</span>
          <span className="ttl-char" style={{animationDelay: "80ms"}}>庭</span>
          <span className="ttl-char" style={{animationDelay: "160ms"}}>演</span>
          <span className="ttl-char" style={{animationDelay: "240ms"}}>定</span>
        </h1>
        <p className="home-sub mono">MANOSABA · WIKI　——　玩家整理 · 卷宗档案库</p>
      </header>

      <div className="home-menu-grid hv2">
        {menu.map((m, i) => (
          <MenuCard key={m.id} m={m} delay={400 + i * 90} onClick={() => navigate(m.id)}/>
        ))}
      </div>

      <CommunityBoard/>

      <div className="home-footer mono">
        <span>
          原著 <b className="gold">Acacia</b> · 出品{" "}
          <b className="gold">缘梦织绘</b> · 本站由 <b className="gold">SparkMC</b> 制作（MIT）
        </span>
        <span className="sep">·</span>
        <a
          className="home-footer-link mono"
          href="https://github.com/XruiDD/monosaba-wiki"
          target="_blank" rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
        <span className="sep">·</span>
        <button className="home-footer-link mono" onClick={() => setLicenseOpen(true)}>
          版权声明
        </button>
        <span className="sep">·</span>
        <span>
          搜索 <kbd>/</kbd> <kbd>Ctrl</kbd>+<kbd>K</kbd>
        </span>
      </div>

      <LicenseModal open={licenseOpen} onClose={() => setLicenseOpen(false)}/>
    </div>
  );
}

/* 单张菜单卡：鼠标视差倾斜 + 金线扫过 + 延迟浮起 */
function MenuCard({ m, delay, onClick }) {
  const ref = useRef(null);
  const rafRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = (y - 0.5) * -8;   // tilt up/down
    const ry = (x - 0.5) * 10;   // tilt left/right
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <button
      ref={ref}
      className={`menu-card ${visible ? "reveal" : ""}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* 金线扫过高光 */}
      <span className="mc-sweep" aria-hidden="true"/>
      {/* 鼠标跟随的径向柔光 */}
      <span className="mc-glow" aria-hidden="true"/>
      {/* 四角装饰 */}
      <span className="mc-corner tl"/><span className="mc-corner tr"/>
      <span className="mc-corner bl"/><span className="mc-corner br"/>

      <span className="mc-inner">
        <div className="mc-head">
          <span className="mc-idx serif">{m.idx}</span>
          <span className="mc-glyph">{m.glyph}</span>
        </div>
        <div className="mc-kicker mono">{m.sub}</div>
        <div className="mc-title serif">{m.t}</div>
        <div className="mc-meta mono">
          <span>{m.n}</span>
          <span className="mc-arrow">→</span>
        </div>
      </span>
    </button>
  );
}

/* 背景氛围层：径向光 + 噪点 + 缓动烛光 */
function BackgroundFX() {
  return (
    <div className="home-bg-fx" aria-hidden="true">
      <div className="bg-aurora"/>
      <div className="bg-noise"/>
      <div className="bg-candle"/>
      <div className="bg-vignette"/>
    </div>
  );
}
