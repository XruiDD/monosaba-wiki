import { useCallback, useEffect, useState } from "react";
import { useTweaks } from "./hooks/useTweaks.js";
import { useBgm } from "./hooks/useBgm.js";
import { pageLabel } from "./data/constants.js";
import { ITEMS_DATA } from "./data/items.js";

import HomePage from "./pages/Home.jsx";
import ItemsPage from "./pages/Items.jsx";
import MagicsPage from "./pages/Magics.jsx";
import CharactersPage from "./pages/Characters.jsx";
import TasksPage from "./pages/Tasks.jsx";
import RulesPage from "./pages/Rules.jsx";
import TutorialPage from "./pages/Tutorial.jsx";

import SearchButton from "./components/SearchButton.jsx";
import SearchPalette from "./components/SearchPalette.jsx";
import AudioToggle from "./components/AudioToggle.jsx";
import TweaksPanel from "./components/TweaksPanel.jsx";
import CommunityCompact from "./components/CommunityCompact.jsx";

function parseHash() {
  const h = window.location.hash.replace("#", "");
  if (!h) return { page: "home", focus: null };
  const [page, ...rest] = h.split("/");
  return { page: page || "home", focus: rest.length ? decodeURIComponent(rest.join("/")) : null };
}

export default function App() {
  const { tweaks, update, editMode } = useTweaks();
  const [route, setRoute] = useState(parseHash);
  const page = route.page;
  const focus = route.focus;
  const [dataReady, setDataReady] = useState(false);
  const [magicsRaw, setMagicsRaw] = useState([]);
  const [tasksRaw, setTasksRaw] = useState([]);
  const [tutorialsRaw, setTutorialsRaw] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 全站常驻背景音乐（跨页面保持播放）
  const bgm = useBgm("assets/sounds/opening.ogg", { volume: 0.5, loop: true });

  useEffect(() => {
    Promise.all([
      fetch("data/magics.json").then((r) => r.json()),
      fetch("data/tasks.json").then((r) => r.json()),
      fetch("data/tutorials.json").then((r) => r.json()),
    ]).then(([m, t, tu]) => {
      setMagicsRaw(m);
      setTasksRaw(t);
      setTutorialsRaw(tu);
      setDataReady(true);
    }).catch((err) => {
      console.error(err);
      setDataReady(true);
    });
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((p, focusKey = null) => {
    const hash = focusKey ? `${p}/${encodeURIComponent(focusKey)}` : p;
    window.location.hash = hash;
    window.scrollTo(0, 0);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const inInput = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable);

      // Cmd+K / Ctrl+K — 打开搜索面板
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      // / — 打开搜索面板
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === "Escape") setPaletteOpen(false);
      if (!inInput) {
        if (e.key === "1") update({ variant: "gothic" });
        if (e.key === "2") update({ variant: "monitor" });
        if (e.key === "3") update({ variant: "paper" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [update]);

  if (!dataReady) {
    return (
      <div className="home-stage">
        <div className="warden-lines"><p className="warden-line">档案载入中……</p></div>
      </div>
    );
  }

  const navItems = [
    { id: "home",     label: "首页",       count: ""                      },
    { id: "items",    label: "道具大全",   count: ITEMS_DATA.length       },
    { id: "magics",   label: "魔法总表",   count: magicsRaw.length        },
    { id: "chars",    label: "饰品图鉴",   count: 16                      },
    { id: "tasks",    label: "任务档案",   count: tasksRaw.length         },
    { id: "rules",    label: "规则与阵营", count: ""                      },
    { id: "tutorial", label: "典狱长旁白", count: ""                      },
  ];

  // 全局浮层：在所有页面共享（包括 home），保证 AudioToggle + SearchPalette 不会因路由切换而卸载
  const globalLayer = (
    <>
      <AudioToggle muted={bgm.muted} onToggle={bgm.toggleMute}/>
      <SearchPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        magicsRaw={magicsRaw}
        tasksRaw={tasksRaw}
        navigate={navigate}
      />
      {editMode && <TweaksPanel tweaks={tweaks} update={update}/>}
    </>
  );

  // 首页：无侧栏的剧场式全屏
  if (page === "home") {
    return (
      <>
        <HomePage navigate={navigate} onOpenSearch={() => setPaletteOpen(true)}/>
        {globalLayer}
      </>
    );
  }

  // 其它页面：侧栏 + 主内容
  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <button
            className="sidebar-title"
            onClick={() => navigate("home")}
            title="返回首页"
          >
            <span className="st-rule"/>
            <span className="st-seal" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1.4 1.8" opacity="0.75"/>
                <path d="M12 5 L13.1 10.9 L19 12 L13.1 13.1 L12 19 L10.9 13.1 L5 12 L10.9 10.9 Z" fill="currentColor"/>
              </svg>
            </span>
            <span className="st-text">
              <span className="st-name serif">囚庭演定</span>
              <span className="st-sub mono">《魔法少女的悖演重构》</span>
            </span>
            <span className="st-rule"/>
          </button>

          <SearchButton onClick={() => setPaletteOpen(true)}/>

          <div className="nav-section">卷宗目录</div>
          {navItems.map((n) => (
            <div key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}>
              <span>{n.label}</span>
              {n.count !== "" && <span className="count">{n.count}</span>}
            </div>
          ))}

          <CommunityCompact/>
        </aside>

        <main className="main">
          {page === "items"    && <ItemsPage focus={focus}/>}
          {page === "magics"   && <MagicsPage magicsRaw={magicsRaw} focus={focus}/>}
          {page === "chars"    && <CharactersPage focus={focus}/>}
          {page === "tasks"    && <TasksPage tasksRaw={tasksRaw} focus={focus}/>}
          {page === "rules"    && <RulesPage focus={focus}/>}
          {page === "tutorial" && <TutorialPage tutorialsRaw={tutorialsRaw} focus={focus}/>}
        </main>

        <div className="foot-status">
          <span>MANOSABA · WIKI — {pageLabel(page)}</span>
          <span>
            <kbd>/</kbd> 搜索 &nbsp; <kbd>Ctrl</kbd>+<kbd>K</kbd> 面板 &nbsp; <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 切换方向
          </span>
        </div>
      </div>
      {globalLayer}
    </>
  );
}
