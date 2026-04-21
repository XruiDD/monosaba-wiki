import { useEffect } from "react";

export default function LicenseModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal license-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="page-kicker">LEGAL · 版权声明</div>
        <h2 className="serif" style={{fontSize: 26, margin: "6px 0 18px"}}>关于本站</h2>

        <div className="divider">三层权利分离</div>

        <div className="lic-rows">
          <div className="lic-row">
            <div className="lic-num">Ⅰ</div>
            <div className="lic-body">
              <div className="lic-title serif">《魔法少女的魔女审判》 原作</div>
              <div className="lic-desc">
                原作者 <b className="gold">ACACIA</b>。一切世界观、角色、设定版权归原作者所有。
                <a href="https://manosaba.com/" target="_blank" rel="noopener noreferrer" className="lic-link">
                  官网 manosaba.com ↗
                </a>
              </div>
            </div>
          </div>

          <div className="lic-row">
            <div className="lic-num">Ⅱ</div>
            <div className="lic-body">
              <div className="lic-title serif">《魔法少女的悖演重构》Minecraft 地图</div>
              <div className="lic-desc">
                制作方 <b className="gold">缘梦织绘</b>（地图内玩法「囚庭演定」即源自此地图）。
                本站展示的<b>物品名称、lore 描述、魔法设定、贴图、音频</b>
                等均源自此地图，版权归缘梦织绘所有。
                本站仅作<b>玩家资料整理</b>用途，禁止二次分发或商用。
              </div>
            </div>
          </div>

          <div className="lic-row">
            <div className="lic-num">Ⅲ</div>
            <div className="lic-body">
              <div className="lic-title serif">本站前端源代码</div>
              <div className="lic-desc">
                由 <b className="gold">SparkMC</b> 开发，基于 <span className="mono">MIT License</span> 开源。
                包括 React 组件、CSS、数据提取脚本、构建配置等。
                <br/>
                <a
                  href="https://github.com/XruiDD/monosaba-wiki"
                  target="_blank" rel="noopener noreferrer"
                  className="lic-link"
                >
                  GitHub · XruiDD/monosaba-wiki ↗
                </a>
                <br/>
                <span className="faint">仓库根目录的 <span className="mono">LICENSE</span> 和 <span className="mono">NOTICE.md</span> 文件详述各部分权利。</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divider">使用须知</div>

        <ul className="lic-list">
          <li>✓ 浏览、收藏、分享本站链接</li>
          <li>✓ Fork 前端代码做二次开发（遵循 MIT）</li>
          <li>✗ 复制 <span className="mono">public/assets/</span>、<span className="mono">src/data/items.js</span> 等内容作独立分发</li>
          <li>✗ 任何商业/营利用途</li>
        </ul>

        <div className="divider">联系与致敬</div>
        <p className="serif" style={{fontSize: 14, lineHeight: 1.9, color: "var(--ink-dim)"}}>
          内容有误或需要下架，请通过 <b>SparkMC QQ 群 1043700021</b> 联系。<br/>
          Minecraft 是 Mojang AB 的注册商标。原版贴图镜像来自 Misode&apos;s mcmeta。
        </p>

        <div className="lic-foot mono faint">
          本页内容等同于仓库 LICENSE / NOTICE.md · 本站非官方资料库
        </div>
      </div>
    </div>
  );
}
