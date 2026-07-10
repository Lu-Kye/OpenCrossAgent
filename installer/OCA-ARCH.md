# installer/OCA-ARCH — 模块架构

> 本文档定义 installer 模块内部的目录结构和 3W 拆分细则。
> 项目级架构（四层架构总览、依赖方向图、架构原则、技术栈）见 [../OCA-ARCH.md](../OCA-ARCH.md)。

## 模块概览

一键安装/配置 OpenCrossAgent（gateway + clients/cli），降低上手门槛。

## 目录结构

```
installer/
├── package.json
├── tsdown.config.ts
├── tsconfig.json
└── install.mjs              # Cross-platform installer script
```

## 3W 拆分细则

- **Why**: 一键安装/配置 OpenCrossAgent（gateway + clients/cli），降低上手门槛。
- **What**: 跨平台 Node.js 脚本：检查前置依赖、安装 packages、生成配置目录（`~/.oca/`）、复制配置模板。
- **When**: 发布新版本、修改安装流程时。
