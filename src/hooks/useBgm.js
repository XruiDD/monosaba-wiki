import { useEffect, useRef, useState } from "react";

/**
 * 最大兼容度的背景音乐自动播放：
 *
 * 浏览器自动播放策略：Chrome/Safari/Firefox/iOS 默认**禁止有声自动播放**，
 * 但 **静音自动播放始终允许**（除非用户在浏览器设置里全局禁用）。
 *
 * 本 hook 的策略：
 *   1. 组件挂载时创建 <audio>，muted=true、autoplay、loop、playsInline（iOS 必需）
 *   2. 立刻调用 play() —— 因为静音所以不会被拒
 *   3. 监听全局任意"用户手势"事件（pointerdown / keydown / touchstart / scroll / wheel）
 *   4. 首次手势触发时 unmute + 再 play() 一次（处理罕见的 muted 都不给播的情况）
 *   5. 页面切到后台时自动暂停；切回时恢复（节电 + 隐私）
 *
 * 结果：99% 的用户在进入首屏后的第一次点击/敲键/滑动瞬间就会听到音乐，
 * 剩余 1%（从未交互就关闭页面的）本就不该听到。
 */
export function useBgm(src, { volume = 0.5, loop = true } = {}) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    if (!src) return;

    const audio = new Audio();
    audio.src = src;
    audio.loop = loop;
    audio.volume = volume;
    audio.muted = true;            // 关键：静音 → 允许 autoplay
    audio.preload = "auto";
    audio.autoplay = true;
    audio.setAttribute("playsinline", "");  // iOS Safari
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    let unlocked = false;
    let disposed = false;

    // 尝试静音播放
    const tryMutedPlay = () => {
      audio.play()
        .then(() => { if (!disposed) setPlaying(true); })
        .catch(() => {
          // 连静音都被拒（极少）→ 等手势
          if (!disposed) setNeedsGesture(true);
        });
    };
    tryMutedPlay();

    // 手势解锁 —— 第一次任何交互就取消静音
    const unlock = () => {
      if (unlocked || disposed) return;
      unlocked = true;
      audio.muted = false;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          if (disposed) return;
          setPlaying(true);
          setMuted(false);
          setNeedsGesture(false);
        }).catch(() => {
          // 罕见：用户在浏览器里彻底禁用了该域名音频，只能静音播放
          if (disposed) return;
          audio.muted = true;
          audio.play().catch(() => {});
          setMuted(true);
        });
      }
    };

    const GESTURE_EVENTS = [
      "pointerdown", "mousedown", "touchstart", "touchend",
      "keydown", "scroll", "wheel",
    ];
    const opts = { capture: true, passive: true };
    GESTURE_EVENTS.forEach((e) => window.addEventListener(e, unlock, opts));

    // 后台暂停
    const onVisibility = () => {
      if (document.hidden) audio.pause();
      else if (unlocked) audio.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 播放状态同步
    const onPlay = () => !disposed && setPlaying(true);
    const onPause = () => !disposed && setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      disposed = true;
      GESTURE_EVENTS.forEach((e) => window.removeEventListener(e, unlock, opts));
      document.removeEventListener("visibilitychange", onVisibility);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
      audio.load();
      audioRef.current = null;
    };
  }, [src, volume, loop]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setMuted(a.muted);
    if (!a.muted && a.paused) a.play().catch(() => {});
  };

  return { playing, muted, needsGesture, toggle, toggleMute };
}
