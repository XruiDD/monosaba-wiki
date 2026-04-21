import { useEffect, useRef, useState } from "react";
import { ITEMS_DATA } from "../data/items.js";
import CommunityBoard from "../components/CommunityBoard.jsx";
import LicenseModal from "../components/LicenseModal.jsx";

const OPENING_SEEN_KEY = "manosaba.openingSeen";

export default function HomePage({ navigate }) {
  // 如果看过开场，直接跳到 phase 3
  const [phase, setPhase] = useState(() => {
    try {
      if (localStorage.getItem(OPENING_SEEN_KEY) === "1") return 3;
    } catch { /* noop */ }
    return 0;
  });
  const [lineIdx, setLineIdx] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const LINES = [
    "——咳咳。",
    "欢迎光临。",
    "你，被选中了。",
    "在这里，每一次沉默都会被记入卷宗；",
    "每一次发言，都将被庭上八双眼睛反复咀嚼。",
    "这并非游戏——这是『囚庭演定』。",
  ];

  useEffect(() => {
    if (phase >= 3) return;
    if (skipped) { setPhase(3); return; }
    // 黑场 → 猫头鹰封印（更长的静默沉淀）
    const t1 = setTimeout(() => setPhase(1), 1500);
    // 封印 → 旁白（猫头鹰停留更久，让用户看清）
    const t2 = setTimeout(() => setPhase(2), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [skipped, phase]);

  useEffect(() => {
    if (phase !== 2 || skipped) return;
    if (lineIdx >= LINES.length) {
      // 最后一句停留更久，再进菜单
      const t = setTimeout(() => setPhase(3), 2400);
      return () => clearTimeout(t);
    }
    // 短句留短一点，长句留久一点（按字数 * 160 + 1400 的基数）
    const currentLen = LINES[lineIdx]?.length || 0;
    const hold = Math.min(3800, 1800 + currentLen * 140);
    const t = setTimeout(() => setLineIdx((i) => i + 1), hold);
    return () => clearTimeout(t);
  }, [phase, lineIdx, skipped]);

  // 到达菜单时，记录"已看过"标记
  useEffect(() => {
    if (phase >= 3) {
      try { localStorage.setItem(OPENING_SEEN_KEY, "1"); } catch { /* noop */ }
    }
  }, [phase]);

  return (
    <div className="home-stage">
      {phase < 3 && (
        <button className="skip-btn" onClick={() => setSkipped(true)}>
          跳过旁白 <span className="mono">[ SKIP ]</span>
        </button>
      )}

      {phase >= 1 && phase < 3 && (
        <div className="owl-seal" style={{ opacity: phase >= 1 ? 1 : 0 }}>
          <div className="owl-ring"/>
          <div className="owl-ring outer"/>
          <img src="assets/characters/warden.png" className="pixel" alt="warden"/>
        </div>
      )}

      {phase === 2 && (
        <div className="warden-lines">
          {LINES.slice(0, lineIdx).map((l, i) => (
            <p
              key={i}
              className={`warden-line ${i === lineIdx - 1 ? "current" : "past"}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {l}
            </p>
          ))}
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
        <p className="home-sub mono">MANOSABA · WIKI　——　非官方资料档案库</p>
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
