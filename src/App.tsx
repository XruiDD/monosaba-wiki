import { useCallback, useEffect, useState } from "react";
import { useTweaks } from "./hooks/useTweaks";
import { useBgm } from "./hooks/useBgm";
import { useWikiData } from "./hooks/useWikiData";
import { pageLabel } from "./data/constants";
import type { PageId } from "./types/wiki";

import HomePage from "./pages/Home";
import ItemsPage from "./pages/Items";
import MagicsPage from "./pages/Magics";
import CharactersPage from "./pages/Characters";
import TasksPage from "./pages/Tasks";
import RulesPage from "./pages/Rules";
import TutorialPage from "./pages/Tutorial";
import TalentsPage from "./pages/Talents";
import RecipesPage from "./pages/Recipes";
import SystemsPage from "./pages/Systems";

import SearchButton from "./components/SearchButton";
import SearchPalette from "./components/SearchPalette";
import AudioToggle from "./components/AudioToggle";
import TweaksPanel from "./components/TweaksPanel";
import CommunityCompact from "./components/CommunityCompact";

const PAGE_IDS = new Set<PageId>(["home", "items", "recipes", "magics", "talents", "chars", "tasks", "systems", "rules", "tutorial"]);

interface RouteState {
  page: PageId;
  focus: string | null;
}

function parseHash(): RouteState {
  const h = window.location.hash.replace("#", "");
  if (!h) return { page: "home", focus: null };
  const [rawPage, ...rest] = h.split("/");
  const page = PAGE_IDS.has(rawPage as PageId) ? rawPage as PageId : "home";
  return { page, focus: rest.length ? decodeURIComponent(rest.join("/")) : null };
}

export default function App() {
  const { tweaks, update, editMode } = useTweaks();
  const [route, setRoute] = useState(parseHash);
  const page = route.page;
  const focus = route.focus;
  const { data: wikiData, ready: dataReady, error: dataError } = useWikiData();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 全站常驻背景音乐（跨页面保持播放）
  const bgm = useBgm("assets/sounds/opening.ogg", { volume: 0.5, loop: true });

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((p: PageId, focusKey: string | null = null) => {
    const hash = focusKey ? `${p}/${encodeURIComponent(focusKey)}` : p;
    window.location.hash = hash;
    window.scrollTo(0, 0);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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

  if (dataError) {
    return (
      <div className="home-stage">
        <div className="warden-lines">
          <p className="warden-line">档案载入失败。</p>
          <p className="warden-line past mono">{String(dataError.message || dataError)}</p>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: PageId; label: string; count: number | string }> = [
    { id: "home",     label: "首页",       count: ""                      },
    { id: "items",    label: "道具大全",   count: wikiData.items.length   },
    { id: "recipes",  label: "合成配方",   count: wikiData.recipes.length },
    { id: "magics",   label: "魔法总表",   count: wikiData.magics.length  },
    { id: "talents",  label: "天赋档案",   count: wikiData.talents.length },
    { id: "chars",    label: "饰品图鉴",   count: 16                      },
    { id: "tasks",    label: "任务档案",   count: wikiData.tasks.length   },
    { id: "systems",  label: "伤害机制",   count: wikiData.damage.length  },
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
        wikiData={wikiData}
        navigate={navigate}
      />
      {editMode && <TweaksPanel tweaks={tweaks} update={update}/>}
    </>
  );

  // 首页：无侧栏的剧场式全屏
  if (page === "home") {
    return (
      <>
        <HomePage wikiData={wikiData} navigate={navigate}/>
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
          {page === "items"    && <ItemsPage items={wikiData.items} recipes={wikiData.recipes} focus={focus}/>}
          {page === "recipes"  && <RecipesPage recipes={wikiData.recipes} items={wikiData.items} focus={focus}/>}
          {page === "magics"   && <MagicsPage magics={wikiData.magics} focus={focus}/>}
          {page === "talents"  && <TalentsPage talents={wikiData.talents} focus={focus}/>}
          {page === "chars"    && <CharactersPage focus={focus}/>}
          {page === "tasks"    && <TasksPage tasksRaw={wikiData.tasks} focus={focus}/>}
          {page === "systems"  && <SystemsPage damage={wikiData.damage} focus={focus}/>}
          {page === "rules"    && <RulesPage focus={focus}/>}
          {page === "tutorial" && <TutorialPage tutorials={wikiData.tutorials} focus={focus}/>}
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
