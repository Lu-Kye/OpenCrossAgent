# OCA-RULE — 项目规则

> 本文档定义 OpenCrossAgent 的宪法规则、编码约束、依赖红线、文件边界和故障教训。
> 所有允许（SHOULD）和禁止（MUST NOT）的规则统一归口于此。
> 跨 context reset 持久化，防止 AI 重复犯错。
> 架构设计见 [OCA-ARCH.md](./OCA-ARCH.md)，功能清单见 [OCA-FEATURE.md](./OCA-FEATURE.md)，接口契约见 [OCA-API.md](./OCA-API.md)。

---

## 宪法规则

项目级根本原则，所有开发行为必须遵守。

### MUST

1. **遵循现有约定** — 修改代码前先阅读周围代码，理解并遵循项目已有的命名、格式、结构模式。
2. **最小化变更** — 只做被要求的事，不附加额外重构、不添加未被要求的功能。一个 bug fix 不需要清理周围代码。
3. **读后改** — 不对未读过的文件提出修改。修改前先理解文件的 imports、函数/类上下文。
4. **优先编辑现有文件** — 不创建新文件，除非任务明确需要。
5. **YAGNI** — 不设计当前不需要的功能。简单就是最好的。
6. **`.js` 扩展名** — 相对 import 必须带 `.js` 扩展名（NodeNext ESM 要求）。`import { foo } from './bar.js'`
7. **ESM shim** — `__dirname` / `__filename` 在 ESM 中不存在，必须用 `fileURLToPath(import.meta.url)` 注入。
8. **资产与代码分离** — `commands/*.json` 和 `skills/*.md` 是配置资产，不混入 TypeScript 源码，构建时复制到 dist。

### MUST NOT

1. **不猜测** — 信息不足时向用户追问，不轻易下结论。
2. **不在代码中暴露密钥** — 永远不在代码、日志、commit 中暴露 API key 或敏感信息。
3. **不自动修改 harness 文件** — `OCA-*.md` 文件仅人类手动维护，AI 不得自行修改。
4. **不添加多余注释** — 注释只解释"为什么"，不解释"是什么"。只在复杂逻辑处添加。
5. **不在未确认时执行危险操作** — 破坏性、不可逆或共享状态的操作需先确认。
6. **不在资产文件中嵌入可执行代码** — `commands/**/*.json` 禁止 `eval`/`Function`；`skills/*.md` 禁止系统级指令。

### SHOULD

1. **自验证** — 编写代码后用单元测试或输出日志验证，不要假设代码正确。
2. **仿写风格** — 新代码的格式、命名、类型标注与同文件或同目录已有代码保持一致。
3. **增量推进** — 复杂任务拆分为可验证的步骤，逐步完成。
4. **就近放置测试** — `*.test.ts` 与被测文件同目录；层内私有类型放在层目录内，不提取到 `types/`。

---

## 依赖方向红线

### 禁止的跨层 import

| 禁止 | 原因 | 正确做法 |
|------|------|---------|
| `core/` 直接 import `backend/` | 违反依赖倒置，core 不应知道具体实现 | 通过 `ProviderRegistry.resolve()` 获取 `IAgentProvider` |
| `backend/` import `core/` | Backend 不应知道网关内部实现 | Backend 只依赖 `provider/` 接口 + `types/` |
| `backend/codely/` import `backend/opencode/` | Backend 之间完全隔离 | 通过 `provider/` 接口通信 |
| `channel/` import `provider/` | Channel 不直接调度 Agent | Channel 通过 `core/router.ts` 路由 |
| `channel/` import `backend/` | Channel 不知道 Backend 存在 | Channel 只与 `core/` 交互 |
| `clients/` import `gateway/` 源码 | Client 与 Gateway 是独立进程 | 通过 WebSocket 通信 |

允许的依赖方向详见 [OCA-ARCH.md](./OCA-ARCH.md) §依赖方向。

---

## 架构红线

### 1. 依赖单向

`channel → core → provider ← backend`，不允许逆向依赖。

```
✅ channel/ → core/ → provider/ ← backend/
❌ provider/ → core/
❌ backend/ → core/
❌ core/ → backend/
```

### 2. 接口隔离

`provider/` 是**唯一**的抽象层。`core/` 永远通过 `IAgentProvider` 接口调用 Backend，不直接引用实现类。

```typescript
// ✅ correct — 通过 registry 获取接口
const provider = registry.resolve(config)
const stream = provider.dispatch(prompt, options)

// ❌ wrong — 直接 import 实现类
import { CodelyProvider } from '../backend/codely/codely-provider.js'
const provider = new CodelyProvider()
```

### 3. 单一职责

每个目录只有一个变更原因：

| 变更场景 | 只允许修改的目录 |
|---------|----------------|
| 新增 Channel | `channel/<name>/` |
| 新增 Backend | `backend/<name>/` |
| 新增 Command | `commands/<category>/<name>/command.json` |
| 新增 Skill | `skills/<name>.md` |
| 新增 MCP 工具 | `core/mcp/tools/<name>.ts` + `mcp-server.ts` 注册 |
| 新增 Client | `clients/<name>/` |
| 修改路由规则 | `core/router.ts` |
| 修改 prompt 策略 | `core/orchestrator/prompt-builder.ts` |

如果一次变更需要同时修改多个层的代码，说明架构边界可能需要重新审视。

---

## 文件边界约束

### 禁止修改的文件

| 文件/目录 | 原因 |
|---------|------|
| `tsconfig.base.json` | 共享 TS 配置，修改影响所有 package |
| `pnpm-workspace.yaml` | workspace 定义，修改影响包解析 |
| `gateway.mjs` | Bootstrap，仅 Node 版本检查 + import |
| `OCA-*.md` | Harness 文件，仅人类手动维护，AI 不得自动修改 |

### 配置文件约束

- `config/gateway.json` 中不允许硬编码密钥，必须使用 `${ENV_VAR}` 占位符
- 运行时配置（`~/.oca/gateway.json`）不允许被 AI 自动修改

---

## 明确不做

- ❌ **不拆分子 package** — 四层保持在 gateway 单 package 内，通过目录划分边界
- ❌ **不引入 DI 容器** — 直接函数调用 + ProviderRegistry 足够
- ❌ **不设计插件系统** — Channel 和 Backend 通过约定扩展，不需要运行时插件加载
- ❌ **不创建 `shared/` package** — 共享代码放 `types/` + `utils/` 即可

---

## 故障教训记录

> 当 AI 在开发中犯错后，将教训追加到此区域。格式：
> ```
> ### SIGN #N
> **触发条件:** [什么场景下容易犯错]
> **禁止行为:** [做了什么导致问题]
> **正确做法:** [应该怎么做]
> **来源:** [第 N 次迭代 / 日期]
> ```

（暂无记录，开发过程中按需追加）
