# OCA-ARCH — 工程架构设计

> 本文档定义 OpenCrossAgent 的四层架构、目录结构和依赖方向。
> 功能清单见 [OCA-FEATURE.md](./OCA-FEATURE.md)，接口契约见 [OCA-API.md](./OCA-API.md)，项目规则见 [OCA-RULE.md](./OCA-RULE.md)。

## 背景与目的

OpenCrossAgent 是一个跨 Agent 编排网关，支持多渠道接入（CLI + Feishu）。README 架构图定义了四层架构：Channel Layer → Gateway Core → Agent Provider Layer → Agent Backend Layer。

项目刚起步（仅有 README + .gitignore + LICENSE），需要设计工程目录结构来指导后续开发。参考 TeamCodelyClaw 项目的成熟实践（pnpm monorepo + tsdown + vitest + ESM），结合 OpenCrossAgent 自身特点（显式 Provider 抽象 + 多 Backend 实现）进行设计。

## 架构设计约束

- 按 README 四层架构划分目录，每层边界清晰
- gateway 内部四层通过目录划分，不拆子 package
- 依赖方向：`channel → core → provider ← backend`（backend 实现 provider 接口，不直接被 core 引用）
- clients/ 目录预留多 client 扩展能力

功能清单和状态见 [OCA-FEATURE.md](./OCA-FEATURE.md)。

## 技术栈

| 维度 | 选型 | 说明 |
|------|------|------|
| 语言 | TypeScript (>= 5.5) | target: es2023, strict: true |
| 运行时 | Node.js >= 22 | gateway/installer; clients/cli 用 bun 运行 |
| 包管理 | pnpm workspaces | monorepo，4 个 package |
| 构建 — gateway | tsdown (rolldown-based) | rolldown-based bundler |
| 构建 — clients/cli | bun build | 支持 native modules bundling |
| 构建 — installer | tsdown | 同 gateway 构建工具 |
| 模块系统 | ESM + NodeNext | module: NodeNext, moduleResolution: NodeNext |
| 测试 | vitest | *.test.ts 就近放置 |
| 包 scope | @oca/* | OpenCrossAgent 缩写 |

构建命令和产物结构见 [OCA-FEATURE.md](./OCA-FEATURE.md) §构建概览。

## 目录总览

```
OpenCrossAgent/
├── pnpm-workspace.yaml
├── package.json                # Root: devDeps, workspace scripts
├── .npmrc
├── tsconfig.base.json           # Shared TS config (target/module/strict)
├── README.md
├── .gitignore
│
├── shared/                      # 跨 package 共享代码（非独立 package，相对路径 import）
│   ├── fs.ts                    # ensureDir + atomicWrite + pathExists
│   ├── logger.ts                # createTagLogger + initLogger + setLogSuffix + closeLogger
│   ├── fs.test.ts               # fs 单元测试
│   ├── logger.test.ts           # logger 单元测试
│   └── vitest.config.ts         # shared 独立测试配置
│
├── gateway/                     # @oca/oca-gateway — 网关核心服务
│   (详细目录结构见 gateway/OCA-ARCH.md)
│
├── clients/                      # 所有 client 的父目录
│   ├── cli/                      # @oca/oca-cli — TUI 客户端
│   │   (详细目录结构见 clients/cli/OCA-ARCH.md)
│   │
│   └── feishu/                   # @oca/oca-feishu — 飞书客户端
│       (详细目录结构见 clients/feishu/OCA-ARCH.md)
│
├── installer/                   # @oca/oca-installer — 跨平台安装器
│   (详细目录结构见 installer/OCA-ARCH.md)
│
├── scripts/                     # Dev/release scripts
│   ├── dev.ts                   # Build/link/publish
│   ├── cli.ts                   # Start/stop/restart gateway
│   ├── dev.bat / dev.sh         # Platform wrappers
│   └── release.bat / release.sh
│
└── tests/                       # E2E/integration tests
    └── e2e/
```

未来扩展：

```
clients/
├── cli/          # TUI 客户端（当前）
├── feishu/       # 飞书客户端（当前）
├── desktop-app/  # 桌面客户端（未来）
└── mobile-app/   # 移动客户端（未来）
```

## 3W 拆分细则

> 各模块内部 3W 拆分细则见对应模块级 OCA-ARCH：
> - [gateway/OCA-ARCH.md](./gateway/OCA-ARCH.md)
> - [clients/cli/OCA-ARCH.md](./clients/cli/OCA-ARCH.md)
> - [clients/feishu/OCA-ARCH.md](./clients/feishu/OCA-ARCH.md)
> - [installer/OCA-ARCH.md](./installer/OCA-ARCH.md)

### 1. `shared/` — 跨 package 共享代码

- **Why**: logger 和 fs 工具被所有可执行程序（gateway / cli / feishu / installer）共用。不能放在 gateway 中（OCA-RULE 禁止 clients/ import gateway/ 源码）。
- **What**: `fs.ts`（ensureDir / atomicWrite / pathExists）、`logger.ts`（createTagLogger / initLogger / setLogSuffix / closeLogger）。不是独立 package，通过相对路径 import。构建时被 tsdown/bun build 打包进各 package 的 dist 中。
- **When**: 新增跨 package 共用的工具函数时。仅放真正被多个 package 使用的代码，gateway 专属工具不放这里。

### 2. `scripts/` — 开发/发布脚本

- **Why**: 统一管理 dev/release 工作流，跨平台兼容。
- **What**: `dev.ts`（构建/链接/发布）、`cli.ts`（启停网关）、平台 wrapper（`.bat` / `.sh`）。
- **When**: 修改开发工作流、CI/CD 流程时。

### 3. `tests/` — E2E/集成测试

- **Why**: 跨 package 的端到端测试，验证 gateway + client 完整链路。
- **What**: E2E 测试脚本，模拟用户输入 → 验证 agent 输出。
- **When**: 发布前验证、回归测试时。

## 依赖方向

### 四层架构依赖

```
channel/ ──→ core/ ──→ provider/ ←── backend/
                               ↑
                          implements
```

### 跨 package 依赖

```
gateway/ ──→ shared/ (fs, logger)
clients/ ──→ shared/ (fs, logger)
installer/ ──→ shared/ (fs, logger)
```

Gateway 内部各层详细依赖方向见 [gateway/OCA-ARCH.md](./gateway/OCA-ARCH.md) §内部依赖流。

禁止的依赖方向详见 [OCA-RULE.md](./OCA-RULE.md)。

## 架构原则

1. **目录即架构** — 目录结构直接映射 README 架构图四层，开发者看目录即理解架构。
