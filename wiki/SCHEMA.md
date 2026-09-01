# Wiki 数据模型（Schema v3）

同步流水线严格分为三层，前端只读取领域层：

1. `public/data/raw/`：对当前数据包定义的无损导出。SNBT 组件保留原字符串，JSON 配方保留完整对象；`source-files.json` 还保存每个被引用源文件的完整内容和 SHA-256。
2. `public/data/domain/`：供 Wiki 使用的规范化领域对象。它补充稳定 ID、关联、统计字段和来源链，但不会替代或删除 raw 层。
3. `wiki/overrides.json`：唯一允许手工维护的覆盖层，只用于数据包无法表达的中文标签、排序、剧透开关和特殊状态。覆盖会按 `model/name/id` 的顺序合并，不能改写 raw 层。

道具覆盖中的 `manualTags` 仅用于补充需要直接展示给玩家的人工标签，不会替换数据包提取出的 `tags`。

## 公共约束

- 所有生成文件都有 `schemaVersion`；当前版本为 `3`。
- 每个领域对象都有稳定 `id`，并通过 `source` 或 `sources` 回指 raw 层。
- `npm run check-data` 会验证 ID 唯一性、来源完整性、配方可解析性，以及存在新版魔法定义时必须选择新版。
- 生成结果不读取旧 Wiki 数据，也不会保留数据包中已经消失的条目。

## 道具 Item

核心字段：

- `id / name / category / subcategory / categoryTag / tags`
- `category` 仅采用数据包中的明确约定：`item_name=weapon`，以及 lore 任意行的分类标签及其拼写变体；其余统一为 `other`。
- 同模型、同名称存在多份定义时，中文分类行优先于英文标签；多个不同的中文具体分类会使同步失败，避免静默误判。
- `subcategory` 保留命中的明确分类标签，并将英文内部标签归一成玩家可读的中文名称；没有标签时为 `null`。
- `categoryTag` 只用于玩家界面的筛选归并。武器固定归并为 `近战 / 远程 / 弹药 / 魔法`；卡片标签、详情分类及 `tags` 仍使用数据包原始的 `subcategory`，其他大类沿用 `subcategory`。
- `singleUse` 在 lore 存在独占整行的“一次性”时为 `true`；玩家页面显示“一次性”标签且不显示组件操作间隔。
- `lore`：数据包中的完整文本；`description` 会移除用于分类或内部标记的标签行，供玩家页面展示。
- `descriptionRich` 仅补充含非文本组件的展示行，按原顺序保留 `atlas/sprite`；`description` 继续提供纯文本，供搜索与兼容逻辑使用。
- `minecraft.components`：全部组件，SNBT 来源保持原字符串，JSON 来源保持原对象。
- `minecraft.food / consumable / cooldown / attributes / effects`：常用组件的结构化视图。
- `stats`：从组件和明确格式的 lore 得出的可比较数值，不从旧 Wiki 回填；独占整行的 `90.0s ⌚` 作为玩家冷却时间，并优先于组件中的操作间隔。
- 独占整行的 `10.0 🍖 | 10.0 🍖` 分别解析为玩家侧的饥饿与饱和值，并从展示描述中移除。
- 独占整行的 `21.0 🗡 | 1.0 ⌚ | 3.0 📏` 解析为近战伤害、冷却与攻击距离；`13.0 🏹 | 5.0s ⌚` 解析为远程伤害与冷却。两种属性行都会从描述和普通标签中移除，并优先于组件推导值。
- `recipeIds / sources / image`：配方、原始定义和资源包的来源链。`image.compatibilityFallback` 记录正式物品定义、贴图缺失时启用的无歧义资源包兼容项；资源包补齐正式资源后自动停用。无法匹配的资源以 `image.displayPlaceholder` 标记，并显示资源包自带的“材质没画”占位图。
- 覆盖层可设置 `hidden: true`，用于排除点亮状态、内部占位物等不应作为独立道具展示的特殊定义；raw 层仍完整保留其来源。

## 魔法 Magic

- 同一分支同时存在 `magic`（新版）和 `magics`（旧版）定义时，领域层选用新版；raw 层保留两者。
- 数据包中仅承载解锁提示的 `unlock` 内部物品不会作为魔法变体展示，实际变体只保留 A/B/C。解锁条件写入实际受限变体的 `variants[].stats.unlockCondition`：旧系统的条件属于 B，并同时读取解锁函数中的 `witchProg` 判定，以运行阈值为准；新版存在 C 和 `unlock_value` 时，条件属于 C，并结合 B 的切换/解锁说明。两类条件都通过 `unlockSources` 保留来源。
- `profile` 来自 `magic_properties.mcfunction`，当前可包含角色名、职业名和解锁阈值。
- `variants[].stats` 优先使用属性表中的 MP/CD，再从完整 lore 中结构化补足。
- `generation` 明示当前分支使用 `modern` 还是 `legacy`，便于后续迁移审计。

## 配方 Recipe

- 保留 `type / pattern / ingredients / result` 的规范化视图。
- `rawDocument` 保存原配方 JSON；`result.itemId` 关联领域道具。
- 同名但组件状态不同的配方可通过覆盖层的 `stageLabel` 补充玩家可读的步骤说明；道具名称、描述、材料、产物及链接仍完全取自数据包。

## 任务、天赋、伤害、状态效果与教程

- 任务保留宏调用的全部字段和 `rawPayload`。
- 天赋保留名称、颜色、效果、叙事说明、实现函数和进度图标。
- 伤害机制保留全部源函数，并列出阶段、记分板目标、消息和命令类型。
- 状态效果聚合实现函数中的 `effect give` 与道具组件中的效果，并保留每次应用的原始指令。
- 教程同时保留 Markdown 文档与所有流程函数原文；页面旁白以 `cam*_warden_said.mcfunction` 中实际执行的 `tellraw` 为准。
