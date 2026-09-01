import assert from "node:assert/strict";
import { detectRenderProfile, type RenderProfile } from "../src/lib/renderProfile.ts";

const cases: Array<{ name: string; expected: RenderProfile; userAgent: string }> = [
  {
    name: "Android Chrome",
    expected: "full",
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  },
  {
    name: "iOS Safari",
    expected: "full",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  },
  {
    name: "QQ TBS",
    expected: "lite",
    userAgent: "Mozilla/5.0 (Linux; Android 13; V2218A Build/TP1A.220624.014; wv) AppleWebKit/537.36 MQQBrowser/6.2 TBS/047301 Mobile Safari/537.36 QQ/9.1.5",
  },
  {
    name: "Android System WebView",
    expected: "lite",
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240505.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36",
  },
  {
    name: "UC Browser",
    expected: "lite",
    userAgent: "Mozilla/5.0 (Linux; U; Android 12; zh-CN) AppleWebKit/537.36 UCBrowser/15.5.8.1248 Mobile Safari/537.36",
  },
];

for (const testCase of cases) {
  assert.equal(
    detectRenderProfile(testCase.userAgent).profile,
    testCase.expected,
    `${testCase.name} 识别结果不正确`,
  );
}

console.log(`渲染模式识别检查通过（${cases.length} 个 User-Agent）。`);
