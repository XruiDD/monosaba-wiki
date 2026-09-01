export const recipeLabel = (type = "") => ({
  crafting_shaped: "有序合成",
  crafting_shapeless: "无序合成",
  crafting_transmute: "转化合成",
  campfire_cooking: "营火烹饪",
}[type.split(":").pop() ?? ""] ?? type.split(":").pop() ?? type);
