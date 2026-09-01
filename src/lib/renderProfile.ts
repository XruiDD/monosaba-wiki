export type RenderProfile = "full" | "lite";

export type RenderProfileReason =
  | "qq-tbs"
  | "android-webview"
  | "uc-browser"
  | "development-override"
  | null;

export interface RenderProfileDetection {
  profile: RenderProfile;
  reason: RenderProfileReason;
}

/**
 * 只识别已知容易在本项目全屏特效下掉帧的内核。
 * 普通 Android Chrome 不含这些特征，应始终保留完整视觉效果。
 */
export function detectRenderProfile(userAgent: string): RenderProfileDetection {
  const isQqOrTbs = /(?:MQQBrowser|\bTBS\/|\bQQ\/[\d.]+)/i.test(userAgent);
  if (isQqOrTbs) return { profile: "lite", reason: "qq-tbs" };

  const isAndroid = /Android/i.test(userAgent);
  const isAndroidWebView = isAndroid && (
    /(?:^|[;(\s])wv(?:[;)\s]|$)/i.test(userAgent)
    || /Version\/4\.0\s+Chrome\//i.test(userAgent)
  );
  if (isAndroidWebView) return { profile: "lite", reason: "android-webview" };

  if (/\bUCBrowser\/[\d.]+/i.test(userAgent)) {
    return { profile: "lite", reason: "uc-browser" };
  }

  return { profile: "full", reason: null };
}

export function applyRenderProfile({ profile, reason }: RenderProfileDetection) {
  const root = document.documentElement;
  root.dataset.renderProfile = profile;

  if (reason) root.dataset.renderProfileReason = reason;
  else delete root.dataset.renderProfileReason;
}
