import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTweaks } from "./hooks/useTweaks";
import { useBgm } from "./hooks/useBgm";
import { preloadWikiDatasets, useWikiData, type WikiDatasetName } from "./hooks/useWikiData";
import { pageLabel } from "./data/constants";
import type { Navigate, PageId, WikiData } from "./types/wiki";

import HomePage from "./pages/Home";
import SearchButton from "./components/SearchButton";
import AudioToggle from "./components/AudioToggle";
import CommunityCompact from "./components/CommunityCompact";

const loadItemsPage = () => import("./pages/Items");
const loadRecipesPage = () => import("./pages/Recipes");
const loadMagicsPage = () => import("./pages/Magics");
const loadCharactersPage = () => import("./pages/Characters");
const loadTasksPage = () => import("./pages/Tasks");
const loadRulesPage = () => import("./pages/Rules");
const loadTutorialPage = () => import("./pages/Tutorial");
const loadTalentsPage = () => import("./pages/Talents");
const loadSystemsPage = () => import("./pages/Systems");
const loadSearchPalette = () => import("./components/SearchPalette");

const ItemsPage = lazy(loadItemsPage);
const RecipesPage = lazy(loadRecipesPage);
const MagicsPage = lazy(loadMagicsPage);
const CharactersPage = lazy(loadCharactersPage);
const TasksPage = lazy(loadTasksPage);
const RulesPage = lazy(loadRulesPage);
const TutorialPage = lazy(loadTutorialPage);
const TalentsPage = lazy(loadTalentsPage);
const SystemsPage = lazy(loadSystemsPage);
const SearchPalette = lazy(loadSearchPalette);
const TweaksPanel = lazy(() => import("./components/TweaksPanel"));

const PAGE_IDS = new Set<PageId>(["home", "items", "recipes", "magics", "talents", "chars", "tasks", "systems", "rules", "tutorial"]);
const PAGE_DATASETS: Record<PageId, readonly WikiDatasetName[]> = {
  home: [],
  items: ["items", "recipes"],
  recipes: ["items", "recipes"],
  magics: ["magics"],
  talents: ["talents"],
  chars: [],
  tasks: ["tasks"],
  systems: ["damage"],
  rules: [],
  tutorial: ["tutorials"],
};
const SEARCH_DATASETS: readonly WikiDatasetName[] = ["items", "recipes", "magics", "tasks", "talents", "damage"];
const PAGE_MODULE_PRELOADERS: Partial<Record<PageId, () => Promise<unknown>>> = {
  items: loadItemsPage,
  recipes: loadRecipesPage,
  magics: loadMagicsPage,
  talents: loadTalentsPage,
  chars: loadCharactersPage,
  tasks: loadTasksPage,
  systems: loadSystemsPage,
  rules: loadRulesPage,
  tutorial: loadTutorialPage,
};

interface RouteState {
  page: PageId;
  focus: string | null;
}

interface NavEntry {
  id: PageId;
  label: string;
  count: number | string;
}

function parseHash(): RouteState {
  const h = window.location.hash.replace("#", "");
  if (!h) return { page: "home", focus: null };
  const [rawPage, ...rest] = h.split("/");
  const page = PAGE_IDS.has(rawPage as PageId) ? rawPage as PageId : "home";
  return { page, focus: rest.length ? decodeURIComponent(rest.join("/")) : null };
}

function datasetCount(data: WikiData, name: WikiDatasetName) {
  return data.catalog?.counts[name] ?? data[name].length;
}

export default function App() {
  const { tweaks, update, editMode } = useTweaks();
  const [route, setRoute] = useState(parseHash);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const page = route.page;
  const focus = route.focus;
  const requiredDatasets = useMemo(
    () => [...PAGE_DATASETS[page], ...(paletteOpen ? SEARCH_DATASETS : [])],
    [page, paletteOpen],
  );
  const { data: wikiData, catalogReady, loaded, error: dataError } = useWikiData(requiredDatasets);
  const routeDataReady = PAGE_DATASETS[page].every((name) => loaded.has(name));
  const searchDataReady = SEARCH_DATASETS.every((name) => loaded.has(name));

  // 受限 WebView 等到首次明确交互后再加载音频，避免首屏同时解码音频与绘制页面。
  const deferBgmUntilGesture = document.documentElement.dataset.renderProfile === "lite";
  const bgm = useBgm("assets/sounds/opening.ogg", {
    volume: 0.5,
    loop: true,
    deferUntilGesture: deferBgmUntilGesture,
  });

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      setMobileNavOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add("mobile-nav-open");
    const focusTimer = window.setTimeout(() => mobileCloseRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
      if (event.key === "Tab" && mobileNavRef.current) {
        const focusable = [...mobileNavRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])")]
          .filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("mobile-nav-open");
      restoreFocusRef.current?.focus();
    };
  }, [mobileNavOpen]);

  const navigate = useCallback<Navigate>((p, focusKey = null) => {
    const hash = focusKey ? `${p}/${encodeURIComponent(focusKey)}` : p;
    setMobileNavOpen(false);
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const preloadPage = useCallback((target: PageId) => {
    const moduleRequest = PAGE_MODULE_PRELOADERS[target]?.();
    const dataRequest = preloadWikiDatasets(PAGE_DATASETS[target]);
    void Promise.all([moduleRequest, dataRequest]).catch(() => {
      // 导航后的加载态会显示实际错误；预加载失败不打断当前页面。
    });
  }, []);

  const openSearch = useCallback(() => {
    setMobileNavOpen(false);
    void loadSearchPalette();
    void preloadWikiDatasets(SEARCH_DATASETS).catch(() => {
      // 搜索浮层内会显示实际加载错误。
    });
    setPaletteOpen(true);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const inInput = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        if (paletteOpen) setPaletteOpen(false);
        else openSearch();
        return;
      }
      if (event.key === "/" && !inInput) {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "Escape") setPaletteOpen(false);
      if (!inInput) {
        if (event.key === "1") update({ variant: "gothic" });
        if (event.key === "2") update({ variant: "monitor" });
        if (event.key === "3") update({ variant: "paper" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, paletteOpen, update]);

  if (!catalogReady) {
    return dataError
      ? <FullPageMessage title="档案载入失败。" detail={String(dataError.message || dataError)}/>
      : <FullPageMessage title="档案载入中……"/>;
  }

  const navItems: NavEntry[] = [
    { id: "home", label: "首页", count: "" },
    { id: "items", label: "道具大全", count: datasetCount(wikiData, "items") },
    { id: "recipes", label: "合成配方", count: datasetCount(wikiData, "recipes") },
    { id: "magics", label: "魔法总表", count: datasetCount(wikiData, "magics") },
    { id: "talents", label: "天赋档案", count: datasetCount(wikiData, "talents") },
    { id: "chars", label: "饰品图鉴", count: 16 },
    { id: "tasks", label: "任务档案", count: datasetCount(wikiData, "tasks") },
    { id: "systems", label: "伤害机制", count: datasetCount(wikiData, "damage") },
    { id: "rules", label: "规则与阵营", count: "" },
    { id: "tutorial", label: "典狱长旁白", count: "" },
  ];

  const globalLayer = (
    <>
      <AudioToggle muted={bgm.muted} onToggle={bgm.toggleMute}/>
      {paletteOpen && (
        searchDataReady ? (
          <Suspense fallback={<PaletteMessage title="搜索索引载入中……"/>}>
            <SearchPalette
              open
              onClose={() => setPaletteOpen(false)}
              wikiData={wikiData}
              navigate={navigate}
            />
          </Suspense>
        ) : (
          <PaletteMessage title={dataError ? "搜索索引载入失败" : "搜索索引载入中……"} detail={dataError?.message}/>
        )
      )}
      {editMode && (
        <Suspense fallback={null}>
          <TweaksPanel tweaks={tweaks} update={update}/>
        </Suspense>
      )}
    </>
  );

  // 首页：无侧栏的剧场式全屏
  if (page === "home") {
    return (
      <>
        <HomePage wikiData={wikiData} navigate={navigate} preloadPage={preloadPage}/>
        {globalLayer}
      </>
    );
  }

  return (
    <>
      <div className="app">
        <aside className="sidebar desktop-sidebar">
          <WikiNavigation page={page} items={navItems} navigate={navigate} openSearch={openSearch} preloadPage={preloadPage}/>
        </aside>

        <header className="mobile-header">
          <button
            className="mobile-header-btn"
            type="button"
            aria-label="打开卷宗目录"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-wiki-navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <button className="mobile-header-title serif" type="button" onClick={() => navigate("home")}>囚庭演定</button>
          <button className="mobile-header-btn" type="button" aria-label="搜索全部档案" onClick={openSearch}>
            <span aria-hidden="true">⌕</span>
          </button>
        </header>

        <main className="main" id="wiki-main" aria-busy={!routeDataReady}>
          {dataError && !routeDataReady
            ? <PageMessage title="本卷载入失败" detail={dataError.message}/>
            : routeDataReady
              ? (
                <Suspense fallback={<PageMessage title="卷宗展开中……"/>}>
                  {page === "items" && <ItemsPage items={wikiData.items} recipes={wikiData.recipes} focus={focus}/>}
                  {page === "recipes" && <RecipesPage recipes={wikiData.recipes} items={wikiData.items} focus={focus}/>}
                  {page === "magics" && <MagicsPage magics={wikiData.magics} focus={focus}/>}
                  {page === "talents" && <TalentsPage talents={wikiData.talents} focus={focus}/>}
                  {page === "chars" && <CharactersPage focus={focus}/>}
                  {page === "tasks" && <TasksPage tasksRaw={wikiData.tasks} focus={focus}/>}
                  {page === "systems" && <SystemsPage damage={wikiData.damage} focus={focus}/>}
                  {page === "rules" && <RulesPage focus={focus}/>}
                  {page === "tutorial" && <TutorialPage tutorials={wikiData.tutorials} focus={focus}/>}
                </Suspense>
              )
              : <PageMessage title="本卷载入中……"/>}
        </main>

        <div className="foot-status">
          <span>MANOSABA · WIKI — {pageLabel(page)}</span>
          <span className="foot-shortcuts">
            <kbd>/</kbd> 搜索 &nbsp; <kbd>Ctrl</kbd>+<kbd>K</kbd> 面板 &nbsp; <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 切换方向
          </span>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="mobile-navigation-layer">
          <button className="mobile-nav-backdrop" type="button" aria-label="关闭卷宗目录" onClick={() => setMobileNavOpen(false)}/>
          <aside ref={mobileNavRef} id="mobile-wiki-navigation" className="sidebar mobile-sidebar" role="dialog" aria-modal="true" aria-label="卷宗目录">
            <button ref={mobileCloseRef} className="mobile-nav-close" type="button" aria-label="关闭卷宗目录" onClick={() => setMobileNavOpen(false)}>×</button>
            <WikiNavigation page={page} items={navItems} navigate={navigate} openSearch={openSearch} preloadPage={preloadPage}/>
          </aside>
        </div>
      )}
      {globalLayer}
    </>
  );
}

function WikiNavigation({ page, items, navigate, openSearch, preloadPage }: {
  page: PageId;
  items: NavEntry[];
  navigate: Navigate;
  openSearch: () => void;
  preloadPage: (page: PageId) => void;
}) {
  return (
    <>
      <button className="sidebar-title" type="button" onClick={() => navigate("home")} title="返回首页">
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

      <SearchButton onClick={openSearch}/>

      <nav aria-label="卷宗目录">
        <div className="nav-section">卷宗目录</div>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${page === item.id ? "active" : ""}`}
            aria-current={page === item.id ? "page" : undefined}
            onPointerEnter={() => preloadPage(item.id)}
            onFocus={() => preloadPage(item.id)}
            onClick={() => navigate(item.id)}
          >
            <span>{item.label}</span>
            {item.count !== "" && <span className="count">{item.count}</span>}
          </button>
        ))}
      </nav>

      <CommunityCompact/>
    </>
  );
}

function FullPageMessage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="home-stage" role="status">
      <div className="warden-lines">
        <p className="warden-line">{title}</p>
        {detail && <p className="warden-line past mono">{detail}</p>}
      </div>
    </div>
  );
}

function PageMessage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="page-loading" role="status">
      <span className="page-loading-mark" aria-hidden="true">◇</span>
      <span>{title}</span>
      {detail && <span className="page-loading-detail mono">{detail}</span>}
    </div>
  );
}

function PaletteMessage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="palette-backdrop" role="status">
      <div className="palette palette-loading">
        <span className="page-loading-mark" aria-hidden="true">◇</span>
        <span>{title}</span>
        {detail && <span className="page-loading-detail mono">{detail}</span>}
      </div>
    </div>
  );
}
