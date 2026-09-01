import { useEffect, useMemo, useRef, useState } from "react";
import { MinecraftItemIcon } from "../components/MinecraftItemIcon";
import { MINECRAFT_ITEMS } from "../data/minecraftItems";
import { recipeLabel } from "../data/recipeLabels";
import type { ItemRecord, RecipeIngredient, RecipeRecord } from "../types/wiki";

interface RecipesPageProps {
  recipes: RecipeRecord[];
  items: ItemRecord[];
  focus: string | null;
}

export default function RecipesPage({ recipes, items, focus }: RecipesPageProps) {
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const itemModelMap = useMemo(() => new Map(
    items.filter((item) => item.minecraft.itemModel).map((item) => [item.minecraft.itemModel as string, item]),
  ), [items]);
  const [pulse, setPulse] = useState<string | null>(null);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focus || !recipes.some((recipe) => recipe.id === focus)) return;
    setPulse(focus);
    const timer = setTimeout(() => {
      document.querySelector(`[data-recipe-id="${CSS.escape(focus)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    if (pulseRef.current) clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(timer);
  }, [focus, recipes]);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 肆 · CRAFTING RECORDS</div>
        <h1 className="page-title">合成配方</h1>
        <p className="page-dek">
          囚庭工坊封存着 {recipes.length} 份配方。那些被拆散、拼合与重塑的物件，至今仍替它们的主人保守着秘密。
        </p>
        <div className="warden-quote">「你把东西放上工作台，也把意图留在了那里。」— 典狱长</div>
      </div>

      <div className="recipe-grid">
        {recipes.map((recipe) => {
          const resultItem = recipe.result?.itemId ? itemMap.get(recipe.result.itemId) : undefined;
          const resultName = recipe.result?.name || resultItem?.name || recipe.id;
          return (
            <article key={recipe.id} data-recipe-id={recipe.id} className={`card recipe-card ${pulse === recipe.id ? "focus-pulse" : ""}`}>
              <div className="corner tl"/><div className="corner tr"/><div className="corner bl"/><div className="corner br"/>
              <div className="page-kicker">{recipeLabel(recipe.type)}{recipe.stageLabel ? ` · ${recipe.stageLabel}` : ""}</div>
              <h2 className="serif recipe-name">
                {resultItem
                  ? <a className="recipe-result-name-link" href={`#items/${encodeURIComponent(resultItem.id)}`}>{resultName}</a>
                  : resultName}
              </h2>
              <div className="recipe-workbench">
                <CraftingGrid recipe={recipe} itemMap={itemMap} itemModelMap={itemModelMap}/>
                <span className="recipe-arrow" aria-hidden="true">→</span>
                <ResultSlot recipe={recipe} item={resultItem}/>
              </div>
              {resultItem && <a className="chip accent recipe-link" href={`#items/${encodeURIComponent(resultItem.id)}`}>查看道具详情 →</a>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

interface GridProps {
  recipe: RecipeRecord;
  itemMap: Map<string, ItemRecord>;
  itemModelMap: Map<string, ItemRecord>;
}

export function CraftingGrid({ recipe, itemMap, itemModelMap }: GridProps) {
  const slots = recipe.pattern ? shapedSlots(recipe) : shapelessSlots(recipe);
  return (
    <div className="craft-grid" aria-label={`${recipeLabel(recipe.type)}九宫格`}>
      {slots.map((ingredient, index) => (
        <IngredientSlot key={index} ingredient={ingredient} itemMap={itemMap} itemModelMap={itemModelMap}/>
      ))}
    </div>
  );
}

function shapedSlots(recipe: RecipeRecord): Array<RecipeIngredient | null> {
  const ingredientBySymbol = new Map(recipe.ingredients.map((ingredient) => [ingredient.symbol, ingredient]));
  return Array.from({ length: 9 }, (_, index) => {
    const row = recipe.pattern?.[Math.floor(index / 3)] ?? "";
    const symbol = row.padEnd(3, " ")[index % 3];
    return symbol && symbol !== " " ? ingredientBySymbol.get(symbol) ?? null : null;
  });
}

function shapelessSlots(recipe: RecipeRecord): Array<RecipeIngredient | null> {
  const slots: Array<RecipeIngredient | null> = Array(9).fill(null);
  const offset = recipe.type.endsWith("campfire_cooking") ? 4 : 0;
  recipe.ingredients.slice(0, 9 - offset).forEach((ingredient, index) => { slots[index + offset] = ingredient; });
  return slots;
}

interface IngredientSlotProps {
  ingredient: RecipeIngredient | null;
  itemMap: Map<string, ItemRecord>;
  itemModelMap: Map<string, ItemRecord>;
}

function IngredientSlot({ ingredient, itemMap, itemModelMap }: IngredientSlotProps) {
  if (!ingredient) return <div className="craft-slot empty" aria-label="空气"/>;
  const custom = (ingredient.itemId ? itemMap.get(ingredient.itemId) : undefined)
    ?? (ingredient.itemModel ? itemModelMap.get(ingredient.itemModel) : undefined)
    ?? (ingredient.item && !ingredient.item.startsWith("minecraft:") ? itemModelMap.get(ingredient.item) : undefined);
  const vanilla = ingredient.item ? MINECRAFT_ITEMS[ingredient.item] : undefined;
  const name = custom?.name ?? vanilla?.name ?? ingredient.item?.split(":").pop()?.replaceAll("_", " ") ?? "未知材料";
  const image = custom?.image.path ?? vanilla?.image ?? "assets/items/placeholder.png";
  const content = (
    <>
      <MinecraftItemIcon className="craft-item pixel" src={image} alt=""/>
      <span>{name}</span>
    </>
  );
  return custom
    ? <a className="craft-slot" href={`#items/${encodeURIComponent(custom.id)}`} title={`查看 ${name}`}>{content}</a>
    : <div className="craft-slot" title={name}>{content}</div>;
}

export function ResultSlot({ recipe, item }: { recipe: RecipeRecord; item?: ItemRecord }) {
  const base = recipe.result?.baseItem ? MINECRAFT_ITEMS[recipe.result.baseItem] : undefined;
  const image = item?.image.path ?? base?.image ?? "assets/items/placeholder.png";
  const name = recipe.result?.name || item?.name || base?.name || "合成结果";
  const content = (
    <>
      <MinecraftItemIcon className="craft-result-image pixel" src={image} alt={name}/>
      {(recipe.result?.count ?? 1) > 1 && <span className="craft-count">{recipe.result?.count}</span>}
    </>
  );
  return item
    ? <a className="craft-result-slot" href={`#items/${encodeURIComponent(item.id)}`} title={`查看 ${name}`}>{content}</a>
    : <div className="craft-result-slot" title={name}>{content}</div>;
}
