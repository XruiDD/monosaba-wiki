/* ============================================
   囚庭演定 Wiki · 常量 & 解析工具
   ============================================ */

export const CHARACTERS = [
  { slug: "yuki",    name: "月代雪",       en: "Yuki",    group: "green",  desc: "有人死亡时额外增加 15 点压力值", tags: ["被动", "压力·增"] },
  { slug: "maago",   name: "宝生玛格",     en: "Maago",   group: "green",  desc: "攻击实体回 1 点血", tags: ["回血"] },
  { slug: "arisa",   name: "紫藤亚里沙",   en: "Arisa",   group: "green",  desc: "空手攻击概率附带火焰附加", tags: ["火焰"] },
  { slug: "sherii",  name: "橘雪莉",       en: "Sherii",  group: "green",  desc: "加 2 点基础伤害", tags: ["攻击·增"] },
  { slug: "hiro",    name: "二阶堂希罗",   en: "Hiro",    group: "orange", desc: "按时完成任务减 10 压力值，未完成加 20", tags: ["任务驱动"] },
  { slug: "meruru",  name: "冰上梅露露",   en: "Meruru",  group: "orange", desc: "每隔 10 秒回复 1 点生命", tags: ["自愈"] },
  { slug: "miria",   name: "佐伯米莉亚",   en: "Miria",   group: "orange", desc: "附近 4 格每 20 秒降压，自己加压", tags: ["团队·减压"] },
  { slug: "warden",  name: "典狱长",       en: "Warden",  group: "orange", desc: "可以免死一次（包括死刑）", tags: ["复活", "上位"] },
  { slug: "ema",     name: "樱羽艾玛",     en: "Ema",     group: "pink",   desc: "附近 5 格有别人时每 16 秒降压 1", tags: ["社恐·逆"] },
  { slug: "kurobe",  name: "典狱长(黑)",   en: "Kurobe",  group: "pink",   desc: "钥匙执事·见 2 楼牢房", tags: ["未公开"] },
  { slug: "reia",    name: "莲见蕾雅",     en: "Reia",    group: "pink",   desc: "每隔 15 秒让附近 8 格内所有人看向自己", tags: ["控场"] },
  { slug: "anan",    name: "夏目安安",     en: "Anan",    group: "pink",   desc: "血量低于 10 触发定身 + 虚弱 AOE（3 分钟 CD）", tags: ["濒死·反击"] },
  { slug: "hanna",   name: "远野汉娜",     en: "Hanna",   group: "yellow", desc: "减少重力，可以跳两格高，奔跑加速", tags: ["机动"] },
  { slug: "noa",     name: "城崎诺亚",     en: "Noa",     group: "yellow", desc: "每 22 秒召唤随机生物", tags: ["召唤"] },
  { slug: "koko",    name: "泽渡可可",     en: "Koko",    group: "yellow", desc: "感知附近 16 格内的人数", tags: ["侦察"] },
  { slug: "nanoka",  name: "黑部奈叶香",   en: "Nanoka", group: "yellow", desc: "附近 6 格没人时每 16 秒降压 1", tags: ["独行"] },
];

export const GROUP_COLORS = {
  green:  "#50f77a",
  orange: "#ffd085",
  pink:   "#ffd0f6",
  yellow: "#ffff85",
};

export const FACTIONS = [
  {
    id: "witch", zh: "魔女阵营", en: "WITCH",
    color: "#c93c38",
    gist: "魔女与共犯。胜利条件为杀死所有非本阵营的玩家。",
    detail: [
      "『魔女』在第一天第二轮任务结束后解锁『仪礼剑』：激活后武器形态持续 10 秒，伤害 21；冷却按开局人数为 180–400 秒",
      "只有『魔女』持有仪礼剑；『共犯』与魔女共享阵营胜利条件",
      "游戏开始时，魔女与共犯都会看到双方的身份名单；解放术也会直接解锁",
    ],
  },
  {
    id: "witch_prep", zh: "预备魔女", en: "PREP.",
    color: "#c2a55a",
    gist: "多数玩家的起点。胜利条件为越狱进度达到 100，或场上只剩预备魔女。",
    detail: [
      "开局受到 25% 的攻击伤害抑制；转化为杀意魔女后解除",
      "额外魔法形态不会统一解锁，而是按各分支自己的条件开放",
      "压力值达到 50 后会开始受到低意志影响，并有概率触发低意志事件",
    ],
  },
  {
    id: "witch_kill", zh: "杀意魔女", en: "KILLER",
    color: "#8a1f1b",
    gist: "由高压力下的预备魔女在低意志事件中概率转化而来。胜利条件为成为唯一存活者。",
    detail: [
      "转化不可逆，身份变化只通知本人，不会立即向其他玩家广播",
      "持续获得生命恢复 II，并解除预备魔女的攻击伤害抑制",
      "压力越高，多数魔法效果越强，但受到的负面影响也会更严重",
    ],
  },
];

export interface Tweaks {
  variant: "gothic" | "monitor" | "paper";
  showWardenQuotes: boolean;
  density: "comfortable" | "compact";
}

export const TWEAK_DEFAULTS: Tweaks = {
  variant: "monitor",
  showWardenQuotes: true,
  density: "comfortable",
};

export function typeLabel(t: string) {
  const labels: Record<string, string> = {
    weapon: "武器", prop: "道具", medical: "医药", food: "食物",
    material: "材料", tool: "工具", arcane: "魔法", accessory: "饰品",
    system: "系统",
    clue: "线索", archive: "档案", other: "杂项",
  };
  return labels[t] || t;
}

export function pageLabel(p: string) {
  const labels: Record<string, string> = { home:"首页", items:"道具大全", recipes:"合成配方", magics:"魔法总表", talents:"天赋档案", chars:"饰品图鉴", tasks:"任务档案", systems:"伤害机制", rules:"规则与阵营", tutorial:"典狱长旁白" };
  return labels[p] || "";
}
