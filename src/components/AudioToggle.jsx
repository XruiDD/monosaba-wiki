/* 全站音乐开关按钮 */
export default function AudioToggle({ muted, onToggle }) {
  return (
    <button
      className="audio-toggle"
      onClick={onToggle}
      title={muted ? "当前静音，点击启用背景音乐" : "点击静音"}
      aria-label="toggle background music"
    >
      <span className="at-icon">{muted ? "🔇" : "♪"}</span>
      <span className="at-text mono">{muted ? "MUTED" : "ON"}</span>
    </button>
  );
}
