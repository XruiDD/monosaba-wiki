/* =========================================================
   饰品数据 · 来自原作《囚庭演定》的 16 件饰品
   分队颜色：green / orange / pink / yellow
   ========================================================= */

export const TEAM = {
  green:  "#50f77a",
  orange: "#ffd085",
  pink:   "#ffd0f6",
  yellow: "#ffff85",
};

// 16 件饰品 + slug(贴图) + 分队 + 效果描述
export const ACC_DATA = [
  // —— 绿队 ——
  { slug: "yuki",    name: "月代雪",       team: "green",  img: "yuki.png",
    effect: "有人死亡时额外增加 15 点压力值" },
  { slug: "maago",   name: "宝生玛格",     team: "green",  img: "maago.png",
    effect: "攻击实体回 1 点血" },
  { slug: "arisa",   name: "紫藤亚里沙",   team: "green",  img: "arisa.png",
    effect: "~~空手~~ 攻击概率附带火焰附加" },
  { slug: "sherii",  name: "橘雪莉",       team: "green",  img: "sherii.png",
    effect: "加 2 点基础伤害" },
  // —— 橙队 ——
  { slug: "hiro",    name: "二阶堂希罗",   team: "orange", img: "hiro.png",
    effect: "按时完成任务减 10 压力值，未完成任务加 20 压力值" },
  { slug: "meruru",  name: "冰上梅露露",   team: "orange", img: "meruru.png",
    effect: "每隔 10 秒回复 1 点生命" },
  { slug: "miria",   name: "佐伯米莉亚",   team: "orange", img: "miria.png",
    effect: "每隔 20 秒附近 4 格内所有人减少一点压力值，自己增加一点压力值" },
  { slug: "kanshu",  name: "看守",         team: "orange", img: "warden.png",
    effect: "右键可以兑换成发带；1/5 概率给 6 秒伤害吸收 I" },
  // —— 粉队 ——
  { slug: "ema",     name: "樱羽艾玛",     team: "pink",   img: "ema.png",
    effect: "附近 5 格有别人时每 16 秒减 1 点压力值" },
  { slug: "kurobe",  name: "典狱长",       team: "pink",   img: "kurobe.png",
    effect: "可以免死一次（包括死刑）" },
  { slug: "reia",    name: "莲见蕾雅",     team: "pink",   img: "reia.png",
    effect: "每隔 15 秒让附近 8 格内所有人看向自己" },
  { slug: "anan",    name: "夏目安安",     team: "pink",   img: "anan.png",
    effect: "血量低于 10 点且附近 5 格内有人时，将附近 5 格内所有人定身并给予虚弱 10 秒。冷却 3 分钟" },
  // —— 黄队 ——
  { slug: "hanna",   name: "远野汉娜",     team: "yellow", img: "hanna.png",
    effect: "减少重力，可以跳两格高，加快奔跑速度" },
  { slug: "noa",     name: "城崎诺亚",     team: "yellow", img: "noa.png",
    effect: "每 22 秒召唤随机生物" },
  { slug: "koko",    name: "泽渡可可",     team: "yellow", img: "koko.png",
    effect: "感知附近 16 格内的人数" },
  { slug: "nanoka",  name: "黑部奈叶香",   team: "yellow", img: "nanoka.png",
    effect: "附近 6 格没有人时每 16 秒减 1 点压力值" },
];

// 联动效果
export const COMBO_DATA = [
  // 强联动
  { tier: "main", members: ["yuki","hiro"],                  name: "雪-希罗",        effect: "雪和希罗的饰品加减压力效果翻倍" },
  { tier: "main", members: ["yuki","ema"],                   name: "雪-艾玛",        effect: "每隔 5 秒加一点压力值" },
  { tier: "main", members: ["hiro","ema"],                   name: "希罗-艾玛",      effect: "每隔 15 秒随机回或扣 1 点血" },
  { tier: "main", members: ["ema","yuki","hiro"],            name: "艾玛-雪-希罗",   effect: "魔力值恒为 999，压力值加 999，血量减半" },
  { tier: "main", members: ["yuki","meruru","kurobe"],       name: "雪-梅露露-典狱长", effect: "获得生命恢复 II" },
  { tier: "main", members: ["hanna","sherii"],               name: "汉娜-雪莉",      effect: "绑定一人为恋人，对方死则自己死，但血量攻击×1.5。绑定永久，每人仅可触发一次——绑到死人会马上死" },
  { tier: "main", members: ["ema","sherii","hanna"],         name: "艾玛-雪莉-汉娜", effect: "做任务时额外触发一次奖励，解锁特殊任务与 BE（敬请期待）" },
  { tier: "main", members: ["anan","noa"],                   name: "安安-诺亚",      effect: "体型×0.8；诺亚饰品升级为召唤同队怪物（敬请期待）" },
  { tier: "main", members: ["nanoka","kanshu"],              name: "奈叶香-看守",    effect: "濒死时与距离最远的人交换位置，看守饰品强制兑换成发带" },
  // 二件套（弱）
  { tier: "minor", members: ["hiro","noa"],                  name: "希罗-诺亚",      effect: "诺亚生成生物的同时给予自己随机效果" },
  { tier: "minor", members: ["hiro","reia"],                 name: "希罗-蕾雅",      effect: "审判时将投自己的票数加 1" },
  { tier: "minor", members: ["ema","arisa"],                 name: "艾玛-亚里沙",    effect: "艾玛效果增强为减少附近 5 格内的人的压力值" },
  { tier: "minor", members: ["noa","reia"],                  name: "诺亚-蕾雅",      effect: "蕾雅效果 CD 减至 6 秒，触发同时自己+1 压力值" },
  { tier: "minor", members: ["maago","meruru"],              name: "玛格-梅露露",    effect: "每隔 10 秒随机加或减少 6 点压力值" },
  { tier: "minor", members: ["anan","miria"],                name: "安安-米莉亚",    effect: "处在娱乐室时，每 8 秒回复 1 点血和饱食度" },
  { tier: "minor", members: ["ema","meruru"],                name: "艾玛-梅露露",    effect: "每 8 秒加 1 点压力值；获得幸运（目前没什么用嘻嘻）" },
  // 彩蛋
  { tier: "easter", members: ["ema","sherii","hanna","meruru"], name: "究极隐藏成就",
    effect: "同时佩戴 艾玛 / 雪莉 / 汉娜 / 梅露露 饰品，获得究极隐藏成就 嘻嘻嘻嘻" },
];
