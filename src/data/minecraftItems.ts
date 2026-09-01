export interface MinecraftItemPresentation {
  name: string;
  image: string;
}

const item = (id: string, name: string): MinecraftItemPresentation => ({
  name,
  image: `assets/minecraft/items/${id}.png`,
});

export const MINECRAFT_ITEMS: Record<string, MinecraftItemPresentation> = {
  "minecraft:spectral_arrow": item("spectral_arrow", "光灵箭"),
  "minecraft:sunflower": item("sunflower", "向日葵"),
  "minecraft:stick": item("stick", "木棍"),
  "minecraft:rabbit_hide": item("rabbit_hide", "兔子皮"),
  "minecraft:copper_sword": item("copper_sword", "铜剑"),
  "minecraft:glass_pane": item("glass_pane", "玻璃板"),
  "minecraft:magma_block": item("magma_block", "岩浆块"),
  "minecraft:potion": item("potion", "普通药水"),
  "minecraft:blue_dye": item("blue_dye", "蓝色染料"),
  "minecraft:red_dye": item("red_dye", "红色染料"),
  "minecraft:magma_cream": item("magma_cream", "岩浆膏"),
  "minecraft:clay_ball": item("clay_ball", "黏土球"),
  "minecraft:prismarine_shard": item("prismarine_shard", "海晶碎片"),
  "minecraft:iron_bars": item("iron_bars", "铁栏杆"),
  "minecraft:yellow_glazed_terracotta": item("yellow_glazed_terracotta", "黄色带釉陶瓦"),
  "minecraft:green_glazed_terracotta": item("green_glazed_terracotta", "绿色带釉陶瓦"),
  "minecraft:red_glazed_terracotta": item("red_glazed_terracotta", "红色带釉陶瓦"),
  "minecraft:black_glazed_terracotta": item("black_glazed_terracotta", "黑色带釉陶瓦"),
  "minecraft:string": item("string", "线"),
  "minecraft:feather": item("feather", "羽毛"),
  "minecraft:book": item("book", "书"),
  "minecraft:paper": item("paper", "纸"),
  "minecraft:waxed_copper_door": item("waxed_copper_door", "涂蜡的铜门"),
  "minecraft:exposed_copper_door": item("exposed_copper_door", "斑驳的铜门"),
  "minecraft:waxed_exposed_copper_door": item("waxed_exposed_copper_door", "涂蜡的斑驳铜门"),
  "minecraft:oxeye_daisy": item("oxeye_daisy", "滨菊"),
  "minecraft:wheat": item("wheat", "小麦"),
  "minecraft:wooden_pickaxe": item("wooden_pickaxe", "木镐"),
  "minecraft:dandelion": item("dandelion", "蒲公英"),
  "minecraft:white_shulker_box": item("white_shulker_box", "白色潜影盒"),
  "minecraft:honey_bottle": item("honey_bottle", "蜂蜜瓶"),
  "minecraft:bone": item("bone", "骨头"),
  "minecraft:copper_chain": item("copper_chain", "铜链"),
  "minecraft:cactus_flower": item("cactus_flower", "仙人掌花"),
  "minecraft:crying_obsidian": item("crying_obsidian", "哭泣的黑曜石"),
  "minecraft:glowstone": item("glowstone", "荧石"),
  "minecraft:kelp": item("kelp", "海带"),
};
