import { useState } from "react";

export default function CommunityCompact() {
  const [copied, setCopied] = useState(null);

  const copy = async (addr) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* noop */ }
  };

  return (
    <div className="community-compact">
      <div className="cc-sec-label mono">社群 / 服务器</div>

      <a className="cc-link" href="https://manosaba.com/" target="_blank" rel="noopener noreferrer">
        <span className="cc-link-dot primary"/>
        <span className="cc-link-body">
          <span className="cc-link-title">原作官网</span>
          <span className="cc-link-qq mono">manosaba.com ↗</span>
        </span>
      </a>

      <a className="cc-link" href="https://qm.qq.com/q/ziYWYOqUta" target="_blank" rel="noopener noreferrer">
        <span className="cc-link-dot"/>
        <span className="cc-link-body">
          <span className="cc-link-title">缘梦织绘群</span>
          <span className="cc-link-qq mono">866346020</span>
        </span>
      </a>

      <a className="cc-link" href="https://qm.qq.com/q/vMyaOXE9mo" target="_blank" rel="noopener noreferrer">
        <span className="cc-link-dot"/>
        <span className="cc-link-body">
          <span className="cc-link-title">SparkMC 群</span>
          <span className="cc-link-qq mono">1043700021</span>
        </span>
      </a>

      <a className="cc-link" href="https://github.com/XruiDD/monosaba-wiki" target="_blank" rel="noopener noreferrer">
        <span className="cc-link-dot"/>
        <span className="cc-link-body">
          <span className="cc-link-title">GitHub 开源</span>
          <span className="cc-link-qq mono">XruiDD/monosaba-wiki ↗</span>
        </span>
      </a>

      <div className="cc-server-mini">
        <button className="cc-srv-row" onClick={() => copy("mc.tlspark.cn:27776")}>
          <span className="cc-srv-label mono">电信</span>
          <span className="cc-srv-addr mono">mc.tlspark.cn:27776</span>
          <span className="cc-srv-copy mono">{copied === "mc.tlspark.cn:27776" ? "✓" : "⎘"}</span>
        </button>
        <button className="cc-srv-row" onClick={() => copy("94w6equ5.dldun.cn:27777")}>
          <span className="cc-srv-label mono">BGP</span>
          <span className="cc-srv-addr mono">94w6equ5.dldun.cn:27777</span>
          <span className="cc-srv-copy mono">{copied === "94w6equ5.dldun.cn:27777" ? "✓" : "⎘"}</span>
        </button>
      </div>
    </div>
  );
}
