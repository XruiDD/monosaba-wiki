import { useEffect, useState } from "react";
import { TWEAK_DEFAULTS } from "../data/constants";
import type { Tweaks } from "../data/constants";

export function useTweaks() {
  const [tweaks, setTweaks] = useState(() => {
    try {
      const s = localStorage.getItem("manosaba.tweaks");
      if (s) return { ...TWEAK_DEFAULTS, ...JSON.parse(s) as Partial<Tweaks> };
    } catch { /* noop */ }
    return TWEAK_DEFAULTS;
  });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    localStorage.setItem("manosaba.tweaks", JSON.stringify(tweaks));
    document.body.dataset.variant = tweaks.variant;
    document.body.dataset.density = tweaks.density;
  }, [tweaks]);

  useEffect(() => {
    function onMsg(e: MessageEvent<{ type?: string }>) {
      if (e.data?.type === "__activate_edit_mode") setEditMode(true);
      if (e.data?.type === "__deactivate_edit_mode") setEditMode(false);
    }
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch { /* noop */ }
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const update = (edits: Partial<Tweaks>) => {
    setTweaks((t) => ({ ...t, ...edits }));
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*"); } catch { /* noop */ }
  };
  return { tweaks, update, editMode };
}
