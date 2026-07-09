# OCA-DEV — 开发规范

> 本文档定义 OpenCrossAgent 的技术栈、构建流程、编码规范和开发工作流。
> 架构设计见 [OCA-ARCH.md](./OCA-ARCH.md)，接口契约见 [OCA-API.md](./OCA-API.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 技术栈

| 维度 | 选型 | 说明 |
|------|------|------|
| 语言 | TypeScript (>= 5.5) | target: es2023, strict: true |
| 运行时 | Node.js >= 22 | gateway/installer; clients/cli 用 bun 运行 |
| 包管理 | pnpm workspaces | monorepo，3 个顶层 package |
| 构建 — gateway | tsdown (rolldown-based) | 3 entries + codeSplitting + onSuccess asset copy |
| 构建 — clients/cli | bun build | externalize native modules (@opentui/core-*) |
| 构建 — installer | tsdown | 单 entry |
| 模块系统 | ESM + NodeNext | `module: NodeNext`, `moduleResolution: NodeNext` |
| 测试 | vitest | `*.test.ts` 就近放置 |
| 包 scope | `@oca/*` | OpenCrossAgent 缩写 |

## 包命名与 bin 命令

| 目录 | 包名 | bin 命令 |
|------|------|---------|
| `gateway/` | `@oca/oca-gateway` | `oca-gateway` |
| `clients/cli/` | `@oca/oca-cli` | `oca-cli` |
| `installer/` | `@oca/oca-installer` | `oca-installer` |

统一版本号管理：三个 package 同步 bump。

## 编码规范

### ESM 规则

- **`.js` 扩展名**：相对 import 必须带 `.js` 扩展名（NodeNext 要求）
  ```typescript
  // ✅ correct
  import { foo } from './bar.js'
  
  // ❌ wrong
  import { foo } from './bar'
  import { foo } from './bar.ts'
  ```

- **`__dirname` / `__filename`**：ESM 中不存在，需注入 shim
  ```typescript
  import { fileURLToPath } from 'node:url'
  import { dirname } from 'node:path'
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  ```

### 测试规则

- `*.test.ts` 与被测文件**同目录**放置
- 测试文件名 = 被测文件名 + `.test.ts`（如 `router.ts` → `router.test.ts`）
- 层内私有工具的测试放在层目录内，不提取到 `tests/`
- 跨 package 的 E2E 测试放在 `tests/e2e/`

### 资产与代码分离

- `commands/*.json` 和 `skills/*.md` 是配置资产，**不混入** TypeScript 源码
- 构建时通过 `tsdown.config.ts` 的 `onSuccess` hook 复制到 `dist/`
- 资产文件不经过 TypeScript 编译，保持原样复制

### 就近放置原则

- `*.test.ts` 与被测文件同目录
- 层内私有类型放在层目录内（如 `channel/types.ts`），不提取到 `types/`
- `types/` 和 `utils/` 只放真正被**多层共用**的代码

## 构建流程

### Install

```bash
# 项目根目录
pnpm install
```

### Build

```bash
# 构建全部
pnpm -r build

# 单独构建
pnpm --filter @oca/oca-gateway build
pnpm --filter @oca/oca-cli build
pnpm --filter @oca/oca-installer build
```

### 各 package 构建细节

#### gateway

```
tsdown --config tsdown.config.ts
  ├─ 编译 3 个 entry → dist/entry.js, dist/cli.js, dist/mcp-server.js
  ├─ codeSplitting → dist/shared.js (提取共享 chunk，打破 ESM 循环依赖)
  ├─ 注入 ESM shim (__dirname, __filename)
  └─ onSuccess hook:
     ├─ 复制 commands/ → dist/commands/
     ├─ 复制 skills/   → dist/skills/
     └─ 复制 config/gateway.json → dist/templates/gateway.json
```

**Build 产物**:

```
gateway/dist/
├── entry.js              # 入口 1: 服务启动 (HTTP+WS 服务器)
├── cli.js                # 入口 2: 管理命令 (start/stop/restart/status)
├── mcp-server.js         # 入口 3: MCP Tool Server (stdio sidecar)
├── shared.js             # 代码分割出的共享 chunk
├── commands/              # 构建时复制
│   ├── builtin/
│   └── custom/
├── skills/               # 构建时复制
│   └── *.md
└── templates/
    └── gateway.json       # 配置模板
```

#### clients/cli

```
bun run build.ts
  ├─ bun build src/main.tsx → dist/main.js
  ├─ externalize @opentui/core-* 和 react (不打包，运行时 resolve)
  └─ 复制 themes/ → dist/themes/
```

**Build 产物**:

```
clients/cli/dist/
├── main.js               # TUI 入口 (React + OpenTUI)
├── themes/               # 构建时复制
│   └── *.json
└── [externalized]         # native 模块不打包，运行时安装
    ├── @opentui/core-{platform}-{arch}
    └── react
```

#### installer

```
tsdown --config tsdown.config.ts
  └─ 编译 src/cli.ts → dist/cli.js
```

## 开发工作流

### 本地 Dev 模式

```bash
# 方式 1: 一键启动 (scripts/dev.ts)
pnpm dev

# 方式 2: 手动分开
pnpm --filter @oca/oca-gateway dev      # tsx watch src/entry.ts
pnpm --filter @oca/oca-cli dev          # bun --watch src/main.tsx
```

### 运行时进程关系

```
用户终端
├── oca-cli               → TUI 进程 (bun/node)
│   │                       │ WebSocket ws://127.0.0.1:PORT
│   └───────────────────────┤
│                           ▼
├── oca-gateway start      → Gateway 进程 (node)
│                           ├── HTTP + WS Server
│                           ├── MCP Server (stdio sidecar)
│                           └── codely-cli (子进程)
│
└── oca-installer          → 安装脚本 (一次性运行)
```

### 安装器流程

```
oca-installer
  1. 检查前置依赖 (Node >= 22, pnpm)
  2. pnpm install (安装所有 workspace 包)
  3. pnpm -r build (构建全部)
  4. 创建配置目录 ~/.oca/
  5. 复制 gateway/dist/templates/gateway.json → ~/.oca/gateway.json
  6. 展开 ${ENV_VAR} 占位符 (引导用户填写)
  7. link bins:
     - oca-gateway → gateway/dist/cli.js
     - oca-cli → clients/cli/dist/main.js
  8. 输出启动指引
```

## 版本管理

当前阶段：**暂不发布**，仅本地构建。

统一版本 bump：

```bash
pnpm version patch    # 1.0.0 → 1.0.1
pnpm version minor    # 1.0.0 → 1.1.0
pnpm version major    # 1.0.0 → 2.0.0
```

内部执行：三个 package 同步 bump 版本号。

未来开启发布时，在三个 package 的 `package.json` 中配置 `publishConfig.registry`，执行 `pnpm release` 走完整流程。发布脚本预埋在 `scripts/release.ts`。
