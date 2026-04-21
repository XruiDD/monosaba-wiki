import { useState } from "react";

const MAPMAKER = {
  qq: "866346020",
  link: "https://qm.qq.com/q/ziYWYOqUta",
  title: "缘梦织绘 · 官方群",
  sub: "《魔法少女的悖演重构》地图制作方 · Minecraft 地图原创作者",
  cta: "加入玩家/作者交流",
};

const SPARKMC = {
  qq: "1043700021",
  link: "https://qm.qq.com/q/vMyaOXE9mo",
  title: "SparkMC 社群",
  sub: "本站开发者 · 服务器运营组",
  cta: "网站反馈 / 联机讨论",
};

const SERVERS = [
  { name: "电信线路",     addr: "mc.tlspark.cn:27776",     note: "推荐电信用户" },
  { name: "BGP 线路",      addr: "94w6equ5.dldun.cn:27777", note: "多网互联 · 移动/联通优先" },
];

const ORIGINAL_SITE = {
  url: "https://manosaba.com/",
  host: "manosaba.com",
};

export default function CommunityBoard() {
  const [copied, setCopied] = useState(null);

  const copy = async (addr) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* noop */ }
  };

  return (
    <section className="community-board">
      <div className="cb-divider">
        <span className="cb-divider-line"/>
        <span className="cb-divider-text serif">入 · 庭 · 之 · 门</span>
        <span className="cb-divider-line"/>
      </div>

      {/* ① 地图制作方（最高优先级·大号 banner） */}
      <a href={MAPMAKER.link} target="_blank" rel="noopener noreferrer"
         className="cb-headline">
        <span className="cb-corner tl"/><span className="cb-corner tr"/>
        <span className="cb-corner bl"/><span className="cb-corner br"/>

        <div className="cb-headline-crest" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2.2"/>
            <path d="M32 10 L35.5 28 L52 32 L35.5 36 L32 54 L28.5 36 L12 32 L28.5 28 Z" fill="currentColor"/>
          </svg>
        </div>

        <div className="cb-headline-body">
          <div className="cb-kicker mono">Ⅰ · 地 图 制 作 方</div>
          <div className="cb-headline-title serif">{MAPMAKER.title}</div>
          <div className="cb-headline-sub mono">{MAPMAKER.sub}</div>
        </div>

        <div className="cb-headline-qq">
          <div className="cb-qq-label mono">OFFICIAL QQ</div>
          <div className="cb-qq-num big">{MAPMAKER.qq}</div>
          <div className="cb-headline-cta mono">
            <span>{MAPMAKER.cta}</span>
            <span className="cb-arrow">→</span>
          </div>
        </div>
      </a>

      {/* ② 本站社群 + ③ 服务器（并列） */}
      <div className="cb-grid-2">
        {/* SparkMC */}
        <a href={SPARKMC.link} target="_blank" rel="noopener noreferrer"
           className="cb-card">
          <span className="cb-corner tl"/><span className="cb-corner tr"/>
          <span className="cb-corner bl"/><span className="cb-corner br"/>

          <div className="cb-kicker mono">Ⅱ · 本 站 社 群</div>
          <div className="cb-title serif">{SPARKMC.title}</div>
          <div className="cb-sub mono">{SPARKMC.sub}</div>
          <div className="cb-qq">
            <span className="cb-qq-label mono">QQ</span>
            <span className="cb-qq-num">{SPARKMC.qq}</span>
          </div>
          <div className="cb-cta mono">
            <span>{SPARKMC.cta}</span>
            <span className="cb-arrow">→</span>
          </div>
        </a>

        {/* 服务器 */}
        <div className="cb-card cb-server-card">
          <span className="cb-corner tl"/><span className="cb-corner tr"/>
          <span className="cb-corner bl"/><span className="cb-corner br"/>

          <div className="cb-kicker mono">Ⅲ · 游 戏 服 务 器</div>
          <div className="cb-title serif">MC 服务器地址</div>
          <div className="cb-sub mono">内含多个地图游戏房间 · 按网络选线</div>

          <div className="cb-server-rows">
            {SERVERS.map((s) => (
              <div key={s.addr} className="cb-server-row">
                <div className="cb-sr-left">
                  <div className="cb-sr-name serif">{s.name}</div>
                  <div className="cb-sr-note mono">{s.note}</div>
                </div>
                <code className="cb-sr-addr">{s.addr}</code>
                <button
                  className={`cb-sr-copy mono ${copied === s.addr ? "copied" : ""}`}
                  onClick={() => copy(s.addr)}
                  title="点击复制到剪贴板"
                >
                  {copied === s.addr ? "✓ 已复制" : "复制"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ④ 原作致敬（最小，底部一行） */}
      <div className="cb-attribution">
        <span className="cb-attr-label mono">ORIGINAL WORK · 原作致敬</span>
        <span className="cb-attr-sep">·</span>
        <span className="cb-attr-text serif">
          《魔法少女的魔女审判》
          <span className="cb-attr-copy">© ACACIA</span>
        </span>
        <a href={ORIGINAL_SITE.url} target="_blank" rel="noopener noreferrer"
           className="cb-attr-link mono">
          {ORIGINAL_SITE.host} ↗
        </a>
      </div>
    </section>
  );
}
