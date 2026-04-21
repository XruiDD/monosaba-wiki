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
    gist: "魔女与共犯。杀死所有非本阵营的玩家。",
    detail: [
      "『魔女』开局 3 分钟后获得『仪礼剑』：激活后 10 秒武器形态，20 攻击力，冷却 180s",
      "『共犯』无自带攻击手段——善用魔法与诡计",
      "游戏开始即知彼此身份",
    ],
  },
  {
    id: "witch_prep", zh: "预备魔女", en: "PREP.",
    color: "#c2a55a",
    gist: "多数玩家的起点。完成任务积攒越狱进度达 100%，或场上不再有另两阵营。",
    detail: [
      "魔法的第二技能初始锁定——意志力跌破门槛才解锁",
      "按时完成任务显著降低压力值",
      "意志力过低则有概率转化为『杀意魔女』",
    ],
  },
  {
    id: "witch_kill", zh: "杀意魔女", en: "KILLER",
    color: "#8a1f1b",
    gist: "由低意志力的预备魔女概率转化而来。杀死除自己以外的所有玩家。",
    detail: [
      "转化不可逆。身份不会广播给其他玩家",
      "意志力越低，魔法效果越强——反向 Buff",
      "孤狼胜利条件：场上只剩自己",
    ],
  },
];

export const DAMAGE_LABELS = {
  bleed_damage:    { zh: "出血",  en: "BLEED",     color: "#c93c38" },
  blunt_damage:    { zh: "钝伤",  en: "BLUNT",     color: "#a0845a" },
  burn_damage:     { zh: "灼伤",  en: "BURN",      color: "#e8894b" },
  drown_damage:    { zh: "溺水",  en: "DROWN",     color: "#5a8fa8" },
  explode_damage:  { zh: "震荡",  en: "EXPLODE",   color: "#e8c14b" },
  fall_damage:     { zh: "坠伤",  en: "FALL",      color: "#8a7550" },
  freeze_damage:   { zh: "冻伤",  en: "FREEZE",    color: "#6fb3d4" },
  inwall_damage:   { zh: "窒息",  en: "SUFFOCATE", color: "#5a5a5a" },
  shock_damage:    { zh: "触电",  en: "SHOCK",     color: "#e8e04b" },
  player_damage:   { zh: "近战",  en: "MELEE",     color: "#c2a55a" },
  projectile_damage:{ zh: "投射", en: "RANGED",    color: "#a8a8a8" },
  total_test:      { zh: "测试",  en: "TEST",      color: "#555" },
};

export const TWEAK_DEFAULTS = {
  variant: "monitor",
  showWardenQuotes: true,
  density: "comfortable",
};

/* 从 lore 中拆出 mp / cd / duration / description 行 */
export function parseVariant(variant) {
  const mp = [];
  const cd = [];
  const dur = [];
  const desc = [];
  const passive = [];
  let inPassive = false;
  for (const line of variant.lore || []) {
    if (!line) continue;
    if (/魔力消耗/.test(line))        mp.push(line.replace("魔力消耗:", "").trim());
    else if (/冷却时间/.test(line))   cd.push(line.replace("冷却时间:", "").trim());
    else if (/基础冷却/.test(line))   cd.push(line.replace("*基础冷却:", "").trim() + " ★");
    else if (/持续时间/.test(line))   dur.push(line.replace("持续时间:", "").trim());
    else if (line === "被动")         inPassive = true;
    else if (inPassive)               passive.push(line);
    else                              desc.push(line);
  }
  return { mp: mp[0], cd: cd[0], dur: dur[0], desc, passive };
}

export function typeLabel(t) {
  return {
    weapon: "武器", medical: "医疗", food: "食物",
    tool: "工具", arcane: "超自然", accessory: "饰品",
    system: "系统",
    clue: "线索", archive: "档案",
  }[t] || t;
}

export function pageLabel(p) {
  return { home:"首页", items:"道具大全", magics:"魔法总表", chars:"饰品图鉴", tasks:"任务档案", rules:"规则与阵营", tutorial:"典狱长旁白" }[p] || "";
}
