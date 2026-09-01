import type { CSSProperties } from "react";

export type PageId = "home" | "items" | "recipes" | "magics" | "talents" | "chars" | "tasks" | "systems" | "rules" | "tutorial";
export type Navigate = (page: PageId, focus?: string | null) => void;
export type StyleWithVariables = CSSProperties & Record<`--${string}`, string | number>;

export interface WikiImage {
  path: string;
  resolved: boolean;
  source: string | null;
  sha256?: string;
  resourceDependencies?: string[];
  renderer?: string;
  minecraftVersion?: string;
  missingDefinition?: boolean;
  sourceDefinitionMissing?: boolean;
  unresolvedResource?: boolean;
  displayPlaceholder?: boolean;
  compatibilityFallback?: {
    type: "item-model" | "texture" | "archived-texture";
    target: string;
    reason: string;
  } | null;
}

export interface ItemAttribute {
  type: string;
  amount: number | string | null;
  operation: string | null;
  slot: string | null;
  id?: string;
}

export interface ItemEffect {
  id: string;
  amplifier?: number | string | null;
  durationTicks?: number | null;
}

export type LoreSegment =
  | { type: "text"; text: string }
  | { type: "sprite"; atlas: string; sprite: string };

export interface RichLoreLine {
  line: number;
  segments: LoreSegment[];
}

export interface ItemStats {
  cooldownSeconds: number | null;
  damage: number | null;
  attackRange: number | null;
  consumeSeconds: number | null;
  nutrition: number | null;
  saturation: number | null;
  durability: number | null;
  attackDamageBonus: number | null;
  attackSpeedBonus: number | null;
  movementSpeedBonus: number | null;
  entityInteractionRangeBonus: number | null;
  blockInteractionRangeBonus: number | null;
}

export interface ItemRecord {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  categoryTag: string | null;
  singleUse: boolean;
  tags: string[];
  manualTags?: string[];
  lore: string[];
  description: string[];
  descriptionRich: RichLoreLine[];
  minecraft: {
    baseItem: string | null;
    itemModel: string | null;
    count: number;
    maxStackSize: number | null;
    maxDamage: number | null;
    damage: number | null;
    remainingDurability: number | null;
    food: Record<string, unknown> | null;
    consumable: Record<string, unknown> | null;
    cooldown: Record<string, unknown> | null;
    attributes: ItemAttribute[];
    effects: ItemEffect[];
    customData: string | null;
    components: Record<string, unknown>;
  };
  stats: ItemStats;
  recipeIds: string[];
  image: WikiImage;
}

export interface RecipeIngredient {
  symbol?: string;
  role?: string;
  item: string | null;
  itemModel?: string | null;
  itemId?: string;
  alternatives?: RecipeIngredient[];
  raw: unknown;
}

export interface RecipeRecord {
  id: string;
  type: string;
  stageLabel?: string | null;
  pattern: string[] | null;
  ingredients: RecipeIngredient[];
  result?: {
    itemId: string | null;
    baseItem: string | null;
    name: string | null;
    count: number;
  };
}

export interface MagicVariant {
  id: string;
  kind: string;
  name: string;
  lore: string[];
  stats: {
    mpCost: number | null;
    cooldownSeconds: number | null;
    duration: string | null;
    unlockCondition: string | null;
  };
  minecraft: {
    baseItem: string | null;
    itemModel: string | null;
    components: Record<string, unknown>;
  };
  image: WikiImage;
  unlockSources?: string[];
}

export interface MagicRecord {
  id: number;
  name: string;
  generation: "modern" | "legacy";
  profile: {
    characterName: string | null;
    roleName: string | null;
    unlockValue: number | null;
  };
  variants: MagicVariant[];
}

export interface TaskRecord {
  id: string;
  category: string;
  name: string;
  type: string;
  background: string;
  objective: string;
  reward: string;
  punishment: string;
}

export interface TalentRecord {
  id: number;
  name: string;
  color: string;
  effect: string;
  description: string;
}

export interface DamageRecord {
  id: string;
  name: string;
  label: string;
  color: string;
  messages: string[];
  severityStages: string[];
}

export interface StatusCommandApplication {
  durationSeconds: number | string | null;
  amplifier: number | string | null;
}

export interface StatusItemApplication {
  itemId: string;
  itemName: string;
  durationTicks: number | null;
  amplifier: number | string | null;
}

export interface StatusEffectRecord {
  id: string;
  name: string;
  commandApplications: StatusCommandApplication[];
  itemApplications: StatusItemApplication[];
}

export interface TutorialRecord {
  id: string;
  documents: Array<{ name: string; source?: string; content: string }>;
  functions?: Array<{ name: string; source: string; content: string }>;
  functionSources?: string[];
}

export interface WikiCatalog {
  schemaVersion: number;
  datasets: Record<string, string>;
  counts: Record<string, number>;
}

export interface WikiData {
  catalog: WikiCatalog | null;
  items: ItemRecord[];
  recipes: RecipeRecord[];
  magics: MagicRecord[];
  tasks: TaskRecord[];
  talents: TalentRecord[];
  damage: DamageRecord[];
  effects: StatusEffectRecord[];
  tutorials: TutorialRecord[];
}
