import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MinecraftItemIcon } from "../components/MinecraftItemIcon";
import { recipeLabel } from "../data/recipeLabels";
import { typeLabel } from "../data/constants";
import type { ItemRecord, LoreSegment, RecipeIngredient, RecipeRecord } from "../types/wiki";
import { CraftingGrid, ResultSlot } from "./Recipes";

const CATEGORY_ORDER = ["weapon", "prop", "medical", "food", "material", "tool", "arcane", "clue", "accessory", "archive", "system", "other"];
const WEAPON_CATEGORY_TAG_ORDER = ["近战", "远程", "弹药", "魔法"];
const ALL_SUBCATEGORIES = "__all__";
const UNCATEGORIZED_SUBCATEGORY = "__none__";

interface ItemsPageProps {
  items: ItemRecord[];
  recipes: RecipeRecord[];
  focus: string | null;
}

export default function ItemsPage({ items, recipes, focus }: ItemsPageProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState(ALL_SUBCATEGORIES);
  const [selected, setSelected] = useState<ItemRecord | null>(null);
  const [pulse, setPulse] = useState<string | null>(null);
  const pulseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const itemModelMap = useMemo(() => new Map(
    items.filter((item) => item.minecraft.itemModel).map((item) => [item.minecraft.itemModel as string, item]),
  ), [items]);
  const recipeMap = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const recipesByIngredientItemId = useMemo(() => {
    const recipeMapByItem = new Map<string, RecipeRecord[]>();
    const collectInto = (ingredient: RecipeIngredient, itemIds: Set<string>) => {
      if (ingredient.itemId) itemIds.add(ingredient.itemId);
      ingredient.alternatives?.forEach((alternative) => collectInto(alternative, itemIds));
    };
    recipes.forEach((recipe) => {
      const itemIds = new Set<string>();
      recipe.ingredients.forEach((ingredient) => collectInto(ingredient, itemIds));
      itemIds.forEach((itemId) => recipeMapByItem.set(itemId, [...(recipeMapByItem.get(itemId) ?? []), recipe]));
    });
    return recipeMapByItem;
  }, [recipes]);

  useEffect(() => {
    if (!focus) return;
    const target = items.find((item) => item.id === focus);
    if (!target) return;
    setTypeFilter("all");
    setSubcategoryFilter(ALL_SUBCATEGORIES);
    setPulse(focus);
    setSelected(target);
    const timer = setTimeout(() => {
      document.querySelector(`[data-item-id="${CSS.escape(focus)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    if (pulseRef.current) clearTimeout(pulseRef.current);
    pulseRef.current = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(timer);
  }, [focus, items]);

  const categories = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return [
      { id: "all", label: "全部" },
      ...CATEGORY_ORDER.filter((id) => present.has(id)).map((id) => ({ id, label: typeLabel(id) })),
      ...[...present].filter((id) => !CATEGORY_ORDER.includes(id)).map((id) => ({ id, label: typeLabel(id) })),
    ];
  }, [items]);
  const counts = useMemo(() => Object.fromEntries(categories.map((category) => [
    category.id,
    category.id === "all" ? items.length : items.filter((item) => item.category === category.id).length,
  ])), [categories, items]);
  const subcategories = useMemo(() => {
    if (typeFilter === "all") return [];
    const categoryItems = items.filter((item) => item.category === typeFilter);
    const countsByName = new Map<string, number>();
    let unclassifiedCount = 0;
    for (const item of categoryItems) {
      if (item.categoryTag) {
        countsByName.set(item.categoryTag, (countsByName.get(item.categoryTag) ?? 0) + 1);
      } else {
        unclassifiedCount += 1;
      }
    }
    if (countsByName.size + Number(unclassifiedCount > 0) <= 1) return [];
    const orderedTags = [...countsByName].sort(([left], [right]) => {
      if (typeFilter !== "weapon") return left.localeCompare(right, "zh-CN");
      return WEAPON_CATEGORY_TAG_ORDER.indexOf(left) - WEAPON_CATEGORY_TAG_ORDER.indexOf(right);
    });
    return [
      { id: ALL_SUBCATEGORIES, label: `全部${typeLabel(typeFilter)}`, count: categoryItems.length },
      ...orderedTags.map(([name, count]) => ({ id: name, label: name, count })),
      ...(unclassifiedCount ? [{ id: UNCATEGORIZED_SUBCATEGORY, label: "其他", count: unclassifiedCount }] : []),
    ];
  }, [items, typeFilter]);
  const categoryFiltered = typeFilter === "all" ? items : items.filter((item) => item.category === typeFilter);
  const filtered = subcategoryFilter === ALL_SUBCATEGORIES
    ? categoryFiltered
    : categoryFiltered.filter((item) => subcategoryFilter === UNCATEGORIZED_SUBCATEGORY
      ? !item.categoryTag
      : item.categoryTag === subcategoryFilter);

  return (
    <div>
      <div className="page-head">
        <div className="page-kicker">卷 · 壹 · ITEMS ARCHIVE</div>
        <h1 className="page-title">道具大全</h1>
        <p className="page-dek">
          本牢房中已登录的 {items.length} 件物品。武器、线索、饰品、处刑装置——每一件都在卷宗中编过号。
          你所持有的，决定了你在审判庭上能说出的那几句话。
        </p>
        <div className="warden-quote">「随身物品不止是你的，也是将来指向你的证物。」— 典狱长</div>
      </div>

      <div className="filters">
        {categories.map((category) => (
          <button key={category.id} className={`filter-btn ${typeFilter === category.id ? "active" : ""}`} onClick={() => {
            setTypeFilter(category.id);
            setSubcategoryFilter(ALL_SUBCATEGORIES);
          }}>
            {category.label} <span className="faint">· {counts[category.id]}</span>
          </button>
        ))}
      </div>

      {subcategories.length > 0 && (
        <div className="filters" aria-label="道具子分类">
          {subcategories.map((subcategory) => (
            <button key={subcategory.id} className={`filter-btn ${subcategoryFilter === subcategory.id ? "active" : ""}`} onClick={() => setSubcategoryFilter(subcategory.id)}>
              {subcategory.label} <span className="faint">· {subcategory.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="items-grid">
        {filtered.map((item) => (
          <button key={item.id} data-item-id={item.id} className={`item-card card ${pulse === item.id ? "focus-pulse" : ""}`} onClick={() => setSelected(item)}>
            <div className="corner tl"/><div className="corner tr"/><div className="corner bl"/><div className="corner br"/>
            <div className="flex gap-16" style={{ alignItems: "flex-start" }}>
              <ItemIcon item={item}/>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div className="item-name serif">{item.name}</div>
                <div className="flex gap-4 mt-8" style={{ flexWrap: "wrap" }}>
                  <span className="chip">{item.subcategory || typeLabel(item.category)}</span>
                  {item.manualTags?.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
                  {item.singleUse && <span className="chip">一次性</span>}
                  {item.recipeIds.length > 0 && <span className="chip">可合成</span>}
                  {recipesByIngredientItemId.has(item.id) && item.category !== "material" && <span className="chip">材料</span>}
                  {item.stats.cooldownSeconds != null && <span className="chip">CD {item.stats.cooldownSeconds}s</span>}
                  {item.stats.durability != null && <span className="chip">耐久 {item.stats.durability}</span>}
                  {item.stats.nutrition != null && <span className="chip">饥饿 {item.stats.nutrition}</span>}
                  {item.stats.saturation != null && <span className="chip">饱和 {item.stats.saturation}</span>}
                  {item.stats.damage != null && <span className="chip">伤害 {item.stats.damage}</span>}
                  {item.stats.attackRange != null && <span className="chip">攻击距离 {item.stats.attackRange}</span>}
                </div>
                <ItemDescription item={item} className="item-lore"/>
              </div>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <ItemModal
          item={selected}
          recipes={selected.recipeIds.flatMap((recipeId) => {
            const recipe = recipeMap.get(recipeId);
            return recipe ? [recipe] : [];
          })}
          ingredientRecipes={recipesByIngredientItemId.get(selected.id) ?? []}
          itemMap={itemMap}
          itemModelMap={itemModelMap}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ItemIcon({ item, large = false }: { item: ItemRecord; large?: boolean }) {
  return (
    <div className={`icon-frame ${large ? "lg" : ""}`}>
      <MinecraftItemIcon src={item.image.path} className="pixel" alt={item.name}/>
    </div>
  );
}

const LORE_SPRITES: Record<string, { src: string; label: string }> = {
  "minecraft:mob_effect/speed": {
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASBAMAAACk4JNkAAAAIVBMVEUAAADq6urCwsKtUk1jYmKLODNQUFBmJSFNFxM7DQokCAUELoaMAAAAAXRSTlMAQObYZgAAAHxJREFUeNpjwA7Y2FwyOmCc1vAGBgYmJkXBjunGFSABrtbwzuBQoCDD0smmlaXhINbiqaYV0ysmgGQjQ8NndDIwJKR4RZZWdE5gAIHlIDkIa0Z5JYipIKBYWR5ayQACXJWtppEQVvvMzplAaTYWtxWlpuETIIKrVq1CchwAXmAjnjA2VFIAAAAASUVORK5CYII=",
    label: "移动速度",
  },
};

function LorePart({ segment }: { segment: LoreSegment }) {
  if (segment.type === "text") return segment.text;
  const presentation = LORE_SPRITES[segment.sprite];
  const title = `${presentation?.label ?? segment.sprite} · ${segment.atlas}/${segment.sprite}`;
  if (presentation) {
    return <img className="lore-sprite" src={presentation.src} alt={presentation.label} title={title}/>;
  }
  return (
    <span
      className="lore-sprite"
      role="img"
      aria-label={segment.sprite}
      title={title}
    >
      ◈
    </span>
  );
}

function ItemDescription({ item, className, style }: { item: ItemRecord; className?: string; style?: CSSProperties }) {
  const richLines = new Map(item.descriptionRich.map((line) => [line.line, line.segments]));
  return (
    <p className={className} style={style}>
      {item.description.length === 0 ? "—" : item.description.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {(richLines.get(lineIndex) ?? [{ type: "text" as const, text: line }]).map((segment, segmentIndex) => (
            <LorePart segment={segment} key={segmentIndex}/>
          ))}
          {lineIndex < item.description.length - 1 && <br/>}
        </Fragment>
      ))}
    </p>
  );
}

interface ItemModalProps {
  item: ItemRecord;
  recipes: RecipeRecord[];
  ingredientRecipes: RecipeRecord[];
  itemMap: Map<string, ItemRecord>;
  itemModelMap: Map<string, ItemRecord>;
  onClose: () => void;
}

function ItemModal({ item, recipes, ingredientRecipes, itemMap, itemModelMap, onClose }: ItemModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="flex gap-20 mb-16" style={{ alignItems: "flex-start" }}>
          <ItemIcon item={item} large/>
          <div style={{ flex: 1 }}>
            <div className="page-kicker">{typeLabel(item.category).toUpperCase()}{item.subcategory ? ` · ${item.subcategory}` : ""} · {item.id}</div>
            <h2 className="serif" style={{ fontSize: 32, margin: "6px 0 10px" }}>{item.name}</h2>
            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              {item.manualTags?.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
              {item.singleUse && <span className="chip">一次性</span>}
              {item.stats.cooldownSeconds != null && <span className="chip">冷却 {item.stats.cooldownSeconds}s</span>}
              {item.stats.consumeSeconds != null && <span className="chip">使用 {item.stats.consumeSeconds}s</span>}
              {item.stats.durability != null && <span className="chip">耐久 {item.stats.durability}</span>}
              {item.stats.nutrition != null && <span className="chip">饥饿 {item.stats.nutrition}</span>}
              {item.stats.saturation != null && <span className="chip">饱和 {item.stats.saturation}</span>}
              {item.stats.damage != null && <span className="chip">伤害 {item.stats.damage}</span>}
              {item.stats.attackRange != null && <span className="chip">攻击距离 {item.stats.attackRange}</span>}
              {recipes.length > 0 && <span className="chip accent">可合成</span>}
              {ingredientRecipes.length > 0 && item.category !== "material" && <span className="chip">材料</span>}
            </div>
          </div>
        </div>
        <div className="divider">道具描述</div>
        <ItemDescription item={item} className="serif" style={{ fontSize: 17, lineHeight: 1.9, whiteSpace: "pre-line" }}/>
        {recipes.length > 0 && (
          <>
            <div className="divider">合成配方</div>
            <div className="item-modal-recipes">
              {recipes.map((recipe) => (
                <ItemModalRecipe recipe={recipe} itemMap={itemMap} itemModelMap={itemModelMap} key={recipe.id}/>
              ))}
            </div>
          </>
        )}
        {ingredientRecipes.length > 0 && (
          <>
            <div className="divider">可用于合成</div>
            <div className="item-modal-recipes">
              {ingredientRecipes.map((recipe) => (
                <ItemModalRecipe recipe={recipe} itemMap={itemMap} itemModelMap={itemModelMap} key={recipe.id}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ItemModalRecipe({ recipe, itemMap, itemModelMap }: {
  recipe: RecipeRecord;
  itemMap: Map<string, ItemRecord>;
  itemModelMap: Map<string, ItemRecord>;
}) {
  const resultItem = recipe.result?.itemId ? itemMap.get(recipe.result.itemId) : undefined;
  const resultName = recipe.result?.name || resultItem?.name || recipe.id;
  return (
    <section className="item-modal-recipe">
      <div className="page-kicker">{recipeLabel(recipe.type)}{recipe.stageLabel ? ` · ${recipe.stageLabel}` : ""}</div>
      <div className="item-modal-recipe-name serif">
        {resultItem
          ? <a className="recipe-result-name-link" href={`#items/${encodeURIComponent(resultItem.id)}`}>{resultName}</a>
          : resultName}
      </div>
      <div className="recipe-workbench item-modal-workbench">
        <CraftingGrid recipe={recipe} itemMap={itemMap} itemModelMap={itemModelMap}/>
        <span className="recipe-arrow" aria-hidden="true">→</span>
        <ResultSlot recipe={recipe} item={resultItem}/>
      </div>
    </section>
  );
}
