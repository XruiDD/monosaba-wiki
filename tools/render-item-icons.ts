import { createHash } from "node:crypto";
import { mkdir, readFile as readLocalFile, rename, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  prepareAssets,
  readFile as readAssetFile,
  renderItem,
  type ItemComponents,
  type PreparedAssets,
  type VirtualHandler,
} from "block-model-renderer";

const MINECRAFT = {
  version: "1.21.10",
  clientUrl: "https://piston-data.mojang.com/v1/objects/d3bdf582a7fa723ce199f3665588dcfe6bf9aca8/client.jar",
  clientSha1: "d3bdf582a7fa723ce199f3665588dcfe6bf9aca8",
  clientSize: 30_592_168,
} as const;

const RENDERER = "block-model-renderer@2.17.0";
const ICON_SIZE = 256;
const UNFINISHED_TEXTURE = "manosaba:item/missingno";

interface IconRecord {
  key: string;
  kind: "item-icon" | "magic-icon";
  name: string;
  itemModel: string | null;
  baseItem: string | null;
  components: Record<string, unknown>;
  target: string;
}

interface RenderRequest {
  resourceRoot: string;
  publicRoot: string;
  check: boolean;
  records: IconRecord[];
}

interface IconResult {
  key: string;
  target: string;
  resolved: boolean;
  source: string | null;
  sha256?: string;
  changed: boolean;
  renderer: string;
  minecraftVersion: string;
  missingDefinition: boolean;
  sourceDefinitionMissing: boolean;
  unresolvedResource: boolean;
  displayPlaceholder: boolean;
  compatibilityFallback?: CompatibilityFallback;
  diagnostic?: string;
}

interface CompatibilityFallback {
  type: "item-model" | "texture" | "archived-texture";
  target: string;
  reason: string;
}

interface RenderResult {
  minecraftVersion: string;
  renderer: string;
  clientSha1: string;
  changedCount: number;
  records: IconResult[];
}

const VISUAL_COMPONENTS = new Set([
  "bundle_contents",
  "charged_projectiles",
  "custom_data",
  "custom_model_data",
  "damage",
  "dyed_color",
  "enchantment_glint_override",
  "enchantments",
  "firework_explosion",
  "fireworks",
  "instrument",
  "lodestone_tracker",
  "map_color",
  "max_damage",
  "potion_contents",
  "profile",
  "trim",
]);

// These mappings only cover resource-pack mistakes for which the intended
// asset is unambiguous. A correctly named item definition always wins, so the
// compatibility entry automatically becomes inactive after the pack is fixed.
const RESOURCE_BUG_FALLBACKS: Readonly<Record<string, CompatibilityFallback>> = {
  "manosaba:sparse_dandelion": {
    type: "texture",
    target: "manosaba:item/sparse_dandelion",
    reason: "物品定义 sprase_dandelion 与内部 aparse_dandelion 均为拼写错误；同名孤立贴图唯一匹配",
  },
  "manosaba:twine": {
    type: "texture",
    target: "manosaba:item/rope",
    reason: "唯一未使用的绳圈贴图与一截绳子的名称、底材和描述一致",
  },
  "manosaba:killer_tracker": {
    type: "item-model",
    target: "manosaba:killer_trakcer",
    reason: "资源包将 tracker 误拼为 trakcer，完整模型链与历史贴图一致",
  },
  "manosaba:parry": {
    type: "item-model",
    target: "manosaba:shield",
    reason: "未被数据包引用的 shield 模型与残破圆盾的历史贴图一致",
  },
  "manosaba:palette": {
    type: "item-model",
    target: "manosaba:paintwheel",
    reason: "未被数据包引用的 paintwheel 模型与调色盘的历史贴图一致",
  },
  "manosaba:echo": {
    type: "texture",
    target: "manosaba:item/echo",
    reason: "同名观测水晶贴图存在但没有物品定义或模型引用",
  },
  "magic:magic_1a": {
    type: "item-model",
    target: "magics:magic_1a",
    reason: "数据包与资源包的 magic/magics 命名空间不一致",
  },
  "magic:magic_1b": {
    type: "item-model",
    target: "magics:magic_1b",
    reason: "数据包与资源包的 magic/magics 命名空间不一致",
  },
  "magic:magic_1c": {
    type: "item-model",
    target: "magics:magic_1c",
    reason: "数据包与资源包的 magic/magics 命名空间不一致",
  },
};

class SnbtParser {
  private index = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse(): unknown {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    return value;
  }

  private parseValue(): unknown {
    this.skipWhitespace();
    const char = this.source[this.index];
    if (char === "{") return this.parseObject();
    if (char === "[") return this.parseArray();
    if (char === '"' || char === "'") return this.parseQuoted();
    return this.parsePrimitive();
  }

  private parseObject(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.index += 1;
    while (this.index < this.source.length) {
      this.skipWhitespace();
      if (this.source[this.index] === "}") {
        this.index += 1;
        break;
      }
      const key = this.parseKey();
      this.skipWhitespace();
      if (this.source[this.index] !== ":") throw new Error(`SNBT object key has no colon at ${this.index}`);
      this.index += 1;
      result[key] = this.parseValue();
      this.skipWhitespace();
      if (this.source[this.index] === ",") {
        this.index += 1;
        continue;
      }
      if (this.source[this.index] === "}") {
        this.index += 1;
        break;
      }
    }
    return result;
  }

  private parseArray(): unknown[] {
    const result: unknown[] = [];
    this.index += 1;
    this.skipWhitespace();
    if (/^[BIL];/i.test(this.source.slice(this.index, this.index + 2))) this.index += 2;
    while (this.index < this.source.length) {
      this.skipWhitespace();
      if (this.source[this.index] === "]") {
        this.index += 1;
        break;
      }
      result.push(this.parseValue());
      this.skipWhitespace();
      if (this.source[this.index] === ",") {
        this.index += 1;
        continue;
      }
      if (this.source[this.index] === "]") {
        this.index += 1;
        break;
      }
    }
    return result;
  }

  private parseKey(): string {
    this.skipWhitespace();
    const char = this.source[this.index];
    if (char === '"' || char === "'") return this.parseQuoted();
    const start = this.index;
    while (this.index < this.source.length && this.source[this.index] !== ":") this.index += 1;
    return this.source.slice(start, this.index).trim();
  }

  private parseQuoted(): string {
    const quote = this.source[this.index];
    this.index += 1;
    let result = "";
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      this.index += 1;
      if (char === quote) break;
      if (char === "\\" && this.index < this.source.length) {
        const escaped = this.source[this.index];
        this.index += 1;
        result += escaped === "n" ? "\n" : escaped === "r" ? "\r" : escaped === "t" ? "\t" : escaped;
      } else {
        result += char;
      }
    }
    return result;
  }

  private parsePrimitive(): unknown {
    const start = this.index;
    while (this.index < this.source.length && !",]}".includes(this.source[this.index])) this.index += 1;
    const token = this.source.slice(start, this.index).trim();
    if (/^(?:true|false)$/i.test(token)) return token.toLowerCase() === "true";
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[bBsSlLfFdD]?$/.test(token)) {
      const value = Number(token.replace(/[bBsSlLfFdD]$/, ""));
      if (Number.isFinite(value)) return value;
    }
    return token;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? "")) this.index += 1;
  }
}

function parseComponent(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return text;
  try {
    return new SnbtParser(text).parse();
  } catch {
    return value;
  }
}

function renderComponents(raw: Record<string, unknown>): ItemComponents {
  const result: ItemComponents = {};
  for (const [rawKey, value] of Object.entries(raw)) {
    const key = rawKey.replace(/^minecraft:/, "");
    if (!VISUAL_COMPONENTS.has(key)) continue;
    result[key] = parseComponent(value);
  }
  return result;
}

function normalizedIdentifier(value: string | null | undefined): string {
  const identifier = (value ?? "").trim().replace(/^"|"$/g, "");
  if (!identifier) return "minecraft:air";
  return identifier.includes(":") ? identifier : `minecraft:${identifier}`;
}

function itemDefinitionPath(identifier: string): string {
  const [namespace, rawPath] = normalizedIdentifier(identifier).split(":", 2);
  return `assets/${namespace}/items/${rawPath.replace(/^item\//, "")}.json`;
}

function texturePath(identifier: string): string {
  const [namespace, rawPath] = normalizedIdentifier(identifier).split(":", 2);
  return `assets/${namespace}/textures/${rawPath}.png`;
}

function digest(algorithm: "sha1" | "sha256", value: Uint8Array | string): string {
  return createHash(algorithm).update(value).digest("hex");
}

async function localFileEquals(path: string, expected: Uint8Array): Promise<boolean> {
  try {
    const current = await readLocalFile(path);
    return current.length === expected.length && current.equals(Buffer.from(expected));
  } catch {
    return false;
  }
}

async function ensureClientJar(): Promise<string> {
  const cacheRoot = process.env.MANOSABA_MINECRAFT_CACHE
    ? resolve(process.env.MANOSABA_MINECRAFT_CACHE)
    : join(tmpdir(), "manosaba-wiki-cache", "minecraft");
  const target = join(cacheRoot, `${MINECRAFT.version}-client-${MINECRAFT.clientSha1}.jar`);
  try {
    const current = await readLocalFile(target);
    if (current.length === MINECRAFT.clientSize && digest("sha1", current) === MINECRAFT.clientSha1) return target;
  } catch {
    // A cache miss is handled by the verified download below.
  }

  const response = await fetch(MINECRAFT.clientUrl);
  if (!response.ok) throw new Error(`下载 Minecraft ${MINECRAFT.version} 客户端资源失败：HTTP ${response.status}`);
  const contents = Buffer.from(await response.arrayBuffer());
  if (contents.length !== MINECRAFT.clientSize || digest("sha1", contents) !== MINECRAFT.clientSha1) {
    throw new Error(`Minecraft ${MINECRAFT.version} 客户端资源校验失败`);
  }
  await mkdir(cacheRoot, { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, contents);
  try {
    await rename(temporary, target);
  } catch {
    await unlink(temporary).catch(() => undefined);
    const current = await readLocalFile(target);
    if (digest("sha1", current) !== MINECRAFT.clientSha1) throw new Error(`无法写入 Minecraft 资源缓存：${target}`);
  }
  return target;
}

function decodeSkinUrl(profile: unknown): string | null {
  const candidates: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      candidates.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(parseComponent(profile));
  for (const candidate of candidates) {
    try {
      const decoded = JSON.parse(Buffer.from(candidate, "base64").toString("utf8")) as {
        textures?: { SKIN?: { url?: string } };
      };
      const url = decoded.textures?.SKIN?.url;
      if (url) return url.replace(/^http:/, "https:");
    } catch {
      // Profile fields contain other plain strings as well as the texture payload.
    }
  }
  return null;
}

const PLAYER_HEAD_MODEL = {
  ambientocclusion: false,
  double_sided: true,
  ignore_atlas_restrictions: true,
  texture_size: [64, 64],
  textures: { head: "wiki:item/profile_head" },
  elements: [
    {
      from: [4, 0, 4],
      to: [12, 8, 12],
      faces: {
        north: { uv: [2, 2, 4, 4], texture: "#head" },
        east: { uv: [0, 2, 2, 4], texture: "#head" },
        south: { uv: [6, 2, 8, 4], texture: "#head" },
        west: { uv: [4, 2, 6, 4], texture: "#head" },
        up: { uv: [4, 2, 2, 0], texture: "#head" },
        down: { uv: [6, 0, 4, 2], texture: "#head" },
      },
    },
    {
      from: [3.5, -0.5, 3.5],
      to: [12.5, 8.5, 12.5],
      faces: {
        north: { uv: [10, 2, 12, 4], texture: "#head" },
        east: { uv: [8, 2, 10, 4], texture: "#head" },
        south: { uv: [14, 2, 16, 4], texture: "#head" },
        west: { uv: [12, 2, 14, 4], texture: "#head" },
        up: { uv: [12, 2, 10, 0], texture: "#head" },
        down: { uv: [14, 0, 12, 2], texture: "#head" },
      },
    },
  ],
};

function virtualFiles(entries: ReadonlyMap<string, Uint8Array>): VirtualHandler {
  return {
    read(filePath) {
      return entries.get(filePath);
    },
    list(directory) {
      const prefix = `${directory.replace(/\/$/, "")}/`;
      return [...new Set(
        [...entries.keys()]
          .filter((filePath) => filePath.startsWith(prefix))
          .map((filePath) => filePath.slice(prefix.length).split("/", 1)[0]),
      )];
    },
  };
}

async function profileAssets(resourceRoot: string, clientJar: string, skinUrl: string): Promise<PreparedAssets> {
  const cacheRoot = process.env.MANOSABA_MINECRAFT_CACHE
    ? resolve(process.env.MANOSABA_MINECRAFT_CACHE)
    : join(tmpdir(), "manosaba-wiki-cache", "minecraft");
  const skinPath = join(cacheRoot, `skin-${digest("sha256", skinUrl)}.png`);
  let skin: Buffer;
  try {
    skin = await readLocalFile(skinPath);
  } catch {
    const response = await fetch(skinUrl);
    if (!response.ok) throw new Error(`下载玩家头颅皮肤失败：HTTP ${response.status} ${skinUrl}`);
    skin = Buffer.from(await response.arrayBuffer());
    if (!skin.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      throw new Error(`玩家头颅皮肤不是有效 PNG：${skinUrl}`);
    }
    await mkdir(cacheRoot, { recursive: true });
    await writeFile(skinPath, skin);
  }
  const overlay = virtualFiles(new Map([
    ["assets/block-model-renderer/models/block/player_head.json", Buffer.from(JSON.stringify(PLAYER_HEAD_MODEL))],
    ["assets/wiki/textures/item/profile_head.png", skin],
  ]));
  return prepareAssets([overlay, resourceRoot, clientJar], { cache: true, version: MINECRAFT.version });
}

async function tintedPotionAssets(
  resourceRoot: string,
  clientJar: string,
  itemModel: string,
  color: number,
): Promise<PreparedAssets> {
  const [namespace, itemPath] = itemModel.split(":", 2);
  const itemName = itemPath.replace(/^item\//, "");
  const definition = {
    model: {
      type: "minecraft:model",
      model: `${namespace}:item/${itemName}`,
      tints: [{ type: "minecraft:constant", value: color & 0xFF_FF_FF }],
    },
  };
  const overlay = virtualFiles(new Map([
    [`assets/${namespace}/items/${itemName}.json`, Buffer.from(JSON.stringify(definition))],
  ]));
  return prepareAssets([overlay, resourceRoot, clientJar], { cache: true, version: MINECRAFT.version });
}

async function compatibilityTextureAssets(
  resourceRoot: string,
  clientJar: string,
  itemModel: string,
  texture: string,
): Promise<PreparedAssets> {
  const compatibilityId = digest("sha256", `${itemModel}:${texture}`).slice(0, 16);
  const compatibilityModel = `wiki:item/compatibility/${compatibilityId}`;
  const definition = {
    model: {
      type: "minecraft:model",
      model: compatibilityModel,
    },
  };
  const model = {
    parent: "minecraft:item/generated",
    textures: { layer0: texture },
  };
  const overlay = virtualFiles(new Map([
    [itemDefinitionPath(itemModel), Buffer.from(JSON.stringify(definition))],
    [
      `assets/wiki/models/item/compatibility/${compatibilityId}.json`,
      Buffer.from(JSON.stringify(model)),
    ],
  ]));
  return prepareAssets([overlay, resourceRoot, clientJar], { cache: true, version: MINECRAFT.version });
}

async function compatibilityEmbeddedTextureAssets(
  resourceRoot: string,
  clientJar: string,
  itemModel: string,
  texture: Uint8Array,
): Promise<PreparedAssets> {
  const compatibilityId = digest("sha256", `${itemModel}:${digest("sha256", texture)}`).slice(0, 16);
  const compatibilityModel = `wiki:item/compatibility/${compatibilityId}`;
  const compatibilityTexture = `wiki:item/compatibility/${compatibilityId}`;
  const definition = {
    model: {
      type: "minecraft:model",
      model: compatibilityModel,
    },
  };
  const model = {
    parent: "minecraft:item/generated",
    textures: { layer0: compatibilityTexture },
  };
  const overlay = virtualFiles(new Map([
    [itemDefinitionPath(itemModel), Buffer.from(JSON.stringify(definition))],
    [
      `assets/wiki/models/item/compatibility/${compatibilityId}.json`,
      Buffer.from(JSON.stringify(model)),
    ],
    [`assets/wiki/textures/item/compatibility/${compatibilityId}.png`, texture],
  ]));
  return prepareAssets([overlay, resourceRoot, clientJar], { cache: true, version: MINECRAFT.version });
}

function targetPath(publicRoot: string, target: string): string {
  if (isAbsolute(target)) throw new Error(`图标目标必须是 public 下的相对路径：${target}`);
  const absolute = resolve(publicRoot, target);
  const child = relative(resolve(publicRoot), absolute);
  if (child.startsWith("..") || isAbsolute(child)) throw new Error(`图标目标越出 public：${target}`);
  return absolute;
}

async function render(request: RenderRequest): Promise<RenderResult> {
  const resourceRoot = resolve(request.resourceRoot);
  const publicRoot = resolve(request.publicRoot);
  const clientJar = await ensureClientJar();
  const assets = await prepareAssets([resourceRoot, clientJar], { cache: true, version: MINECRAFT.version });
  const profileCache = new Map<string, Promise<PreparedAssets>>();
  const potionCache = new Map<string, Promise<PreparedAssets>>();
  const compatibilityTextureCache = new Map<string, Promise<PreparedAssets>>();
  const compatibilityEmbeddedTextureCache = new Map<string, Promise<PreparedAssets>>();
  const records: IconResult[] = [];

  for (const record of request.records) {
    const itemModel = normalizedIdentifier(record.itemModel || record.baseItem);
    const definition = await readAssetFile(itemDefinitionPath(itemModel), assets);
    const sourceDefinitionMissing = !definition;
    let compatibilityFallback: CompatibilityFallback | undefined;
    let renderModel = itemModel;
    const components = renderComponents(record.components ?? {});
    const skinUrl = itemModel === "minecraft:player_head" ? decodeSkinUrl(record.components?.profile) : null;
    let selectedAssets = assets;
    if (sourceDefinitionMissing) {
      const candidate = RESOURCE_BUG_FALLBACKS[itemModel];
      if (candidate?.type === "item-model") {
        const candidateDefinition = await readAssetFile(itemDefinitionPath(candidate.target), assets);
        if (candidateDefinition) {
          compatibilityFallback = candidate;
          renderModel = candidate.target;
        }
      } else if (candidate?.type === "texture") {
        const candidateTexture = await readAssetFile(texturePath(candidate.target), assets);
        if (candidateTexture) {
          compatibilityFallback = candidate;
          const cacheKey = `${itemModel}:${candidate.target}`;
          let prepared = compatibilityTextureCache.get(cacheKey);
          if (!prepared) {
            prepared = compatibilityTextureAssets(resourceRoot, clientJar, itemModel, candidate.target);
            compatibilityTextureCache.set(cacheKey, prepared);
          }
          selectedAssets = await prepared;
        }
      }
    }
    const missingDefinition = sourceDefinitionMissing && !compatibilityFallback;
    let unresolvedResource = missingDefinition;
    if (record.kind === "magic-icon" && /^magics:magic_\d+[abc]$/.test(itemModel)) {
      const [namespace, magicId] = itemModel.split(":", 2);
      const activeTexture = await readAssetFile(texturePath(`${namespace}:item/${magicId}`), assets);
      if (!activeTexture) {
        const archivedRelative = `assets/magics/magics_old_textures/${magicId}.png`;
        const archivedPath = join(resourceRoot, ...archivedRelative.split("/"));
        try {
          const archivedTexture = await readLocalFile(archivedPath);
          const candidate: CompatibilityFallback = {
            type: "archived-texture",
            target: archivedRelative,
            reason: "当前模型引用的贴图缺失，资源包归档目录中存在同名旧贴图",
          };
          compatibilityFallback = candidate;
          const cacheKey = `${itemModel}:${digest("sha256", archivedTexture)}`;
          let prepared = compatibilityEmbeddedTextureCache.get(cacheKey);
          if (!prepared) {
            prepared = compatibilityEmbeddedTextureAssets(resourceRoot, clientJar, itemModel, archivedTexture);
            compatibilityEmbeddedTextureCache.set(cacheKey, prepared);
          }
          selectedAssets = await prepared;
        } catch {
          unresolvedResource = true;
        }
      }
    }
    if (skinUrl) {
      let prepared = profileCache.get(skinUrl);
      if (!prepared) {
        prepared = profileAssets(resourceRoot, clientJar, skinUrl);
        profileCache.set(skinUrl, prepared);
      }
      selectedAssets = await prepared;
    } else if (
      ["minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion"].includes(itemModel)
      && typeof components.potion_contents?.custom_color === "number"
    ) {
      const color = components.potion_contents.custom_color;
      const cacheKey = `${itemModel}:${color}`;
      let prepared = potionCache.get(cacheKey);
      if (!prepared) {
        prepared = tintedPotionAssets(resourceRoot, clientJar, itemModel, color);
        potionCache.set(cacheKey, prepared);
      }
      selectedAssets = await prepared;
    }

    if (unresolvedResource) {
      const cacheKey = `${itemModel}:${UNFINISHED_TEXTURE}`;
      let prepared = compatibilityTextureCache.get(cacheKey);
      if (!prepared) {
        prepared = compatibilityTextureAssets(resourceRoot, clientJar, itemModel, UNFINISHED_TEXTURE);
        compatibilityTextureCache.set(cacheKey, prepared);
      }
      selectedAssets = await prepared;
      renderModel = itemModel;
    }

    const output = Buffer.from(await renderItem({
      id: renderModel,
      components,
      assets: selectedAssets,
      width: ICON_SIZE,
      height: ICON_SIZE,
      lighting: "item",
      version: MINECRAFT.version,
    }));
    const absoluteTarget = targetPath(publicRoot, record.target);
    const changed = !(await localFileEquals(absoluteTarget, output));
    if (changed && !request.check) {
      await mkdir(dirname(absoluteTarget), { recursive: true });
      await writeFile(absoluteTarget, output);
    }
    const diagnostic = unresolvedResource
      ? `${record.kind}:${record.name} (${itemModel})：Minecraft ${MINECRAFT.version} 资源栈中缺少可用物品定义或贴图，且没有可无歧义匹配的兼容资源，已使用资源包“材质没画”占位图`
      : undefined;
    records.push({
      key: record.key,
      target: record.target,
      resolved: true,
      source: skinUrl
        ? `minecraft-${MINECRAFT.version}:profile`
        : unresolvedResource
          ? `resource:placeholder:${UNFINISHED_TEXTURE}`
        : compatibilityFallback
          ? `resource:compatibility-${compatibilityFallback.type}:${compatibilityFallback.target}`
        : missingDefinition
          ? `minecraft-${MINECRAFT.version}:missing-model`
          : itemModel.startsWith("minecraft:")
            ? `minecraft-${MINECRAFT.version}:item-model`
            : "resource:item-model",
      sha256: digest("sha256", output),
      changed,
      renderer: RENDERER,
      minecraftVersion: MINECRAFT.version,
      missingDefinition,
      sourceDefinitionMissing,
      unresolvedResource,
      displayPlaceholder: unresolvedResource,
      ...(compatibilityFallback ? { compatibilityFallback } : {}),
      ...(diagnostic ? { diagnostic } : {}),
    });
  }

  return {
    minecraftVersion: MINECRAFT.version,
    renderer: RENDERER,
    clientSha1: MINECRAFT.clientSha1,
    changedCount: records.filter((record) => record.changed).length,
    records,
  };
}

async function main(): Promise<void> {
  const [requestFile, resultFile] = process.argv.slice(2);
  if (!requestFile || !resultFile) throw new Error("用法：render-item-icons.ts <request.json> <result.json>");
  const request = JSON.parse(await readLocalFile(requestFile, "utf8")) as RenderRequest;
  const result = await render(request);
  await writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

await main();
