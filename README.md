# 囚庭演定 Wiki

《魔法少女的悖演重构》Minecraft 地图中「囚庭演定」玩法的资料站。

## 数据架构

Wiki 以同级目录中的最新版数据包和资源包为权威来源，不再维护手写的最终道具表。同步分三层：

1. `public/data/raw/`：无损原始层，保存 SNBT 组件原文、完整 JSON、相关源文件内容及 SHA-256。
2. `public/data/domain/`：领域层，生成可直接用于页面的道具、配方、魔法、任务、天赋、伤害、状态效果与教程对象。
3. `wiki/overrides.json`：人工覆盖层，仅处理数据包无法表达的展示标签、排序、剧透和资源别名。

详细字段及不变量见 [`wiki/SCHEMA.md`](wiki/SCHEMA.md)。

## 从地图包同步

默认目录结构：

```text
manosaba/
├─ datapacks/manosaba/
├─ resource/
└─ monosaba-wiki/
```

执行写入同步：

```bash
npm run sync-data
```

只检查漂移和数据完整性：

```bash
npm run check-data
```

同步器会验证 ID 唯一性、来源链、配方 JSON 和新旧魔法来源优先级。存在新版 `magic` 定义时领域层必须选用新版；当前仍未迁移的分支继续读取数据包中实际存在的 `magics` 定义，两者都在 raw 层留档。

提交前运行：

```bash
npm run check-data
npm run lint
npm run build
```

## 前端开发

前端源码使用 TypeScript/TSX，并启用严格类型检查。

```bash
npm install
npm run dev
```

Vite 开发服务器会从 `public/data/domain/` 按需加载领域数据。页面不直接读取 raw 层，也不从旧 Wiki 文件回填已经被数据包删除的条目。
