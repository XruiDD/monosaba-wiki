/* 伪装成搜索框的按钮：点击打开搜索面板，支持 / 和 Ctrl+K 提示 */
export default function SearchButton({ onClick }) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return (
    <button className="search-btn" onClick={onClick} title="打开搜索面板 ( / 或 Ctrl+K )">
      <span className="sicon">⌕</span>
      <span className="search-btn-label faint">搜索档案库……</span>
      <span className="search-btn-kbd">
        <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  );
}
