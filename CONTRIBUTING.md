# 参与贡献

感谢你愿意为这个项目贡献时间!本文档介绍项目结构、本地开发流程、测试方式和提交规范。

## 前置条件

- [Node.js](https://nodejs.org/) 26(见仓库根目录 `.node-version` 与 `package.json` 的 `devEngines`)
- [pnpm](https://pnpm.io/) 12.16.1(见根 `package.json` 的 `packageManager` 字段,可用 [corepack](https://nodejs.org/api/corepack.html) 启用)

## 仓库结构

```text
.
├── src/                # 插件源码
│   ├── index.ts        # Vite 插件入口:resolveId / load 钩子做按平台文件替换
│   ├── hacker.ts       # 导入时给 @dcloudio/uni-cli-shared 打运行时补丁
│   └── types.ts        # 插件选项类型(include / exclude)
├── playground/         # 示例 uni-app 应用(workspace 成员,用于本地调试)
├── tsdown.config.ts    # tsdown 构建配置(ESM + CJS + dts)
├── eslint.config.js    # ESLint 配置(@uni-helper/eslint-config)
└── .github/
    └── workflows/
        ├── ci.yml      # push / PR 到 main 时跑构建、lint、测试、类型检查
        └── release.yml # tag 推送后的 GitHub Release 与 npm 发布流程
```

## 本地开发

```bash
# 安装依赖(在仓库根目录执行)
pnpm install

# 代码检查与自动修复
pnpm lint
pnpm lint:fix

# 以 watch 模式构建插件(开发时保持运行)
pnpm dev

# 一次性构建 dist/ 产物
pnpm build

# dev watch + playground 的 h5(默认平台)
pnpm play:h5

# dev watch + playground 的微信小程序
pnpm play:mp-weixin

# 或者直接使用 playground 自己的脚本调试其他平台
pnpm -C playground run dev:mp-weixin
pnpm -C playground run build:h5
```

playground 通过 `workspace:*` 引用本插件,并在它自己的 `package.json` 的 `uni-app.scripts` 里定义了自定义平台 `h5-weixin`;根目录的 `pnpm play:h5` / `pnpm play:mp-weixin` 会先起 `pnpm dev`(tsdown watch)再调用 playground 对应的 dev 脚本。修改 `src/` 后 watch 会重新构建,playground 里跑一次就能看到效果。

依赖版本统一在 `pnpm-workspace.yaml` 的 `catalog:` 中维护,单个 package 一律写 `"catalog:"`,不要在 `package.json` 里写死版本。uni-app 系列依赖钉在 `3.0.0-5000720260410001`,不要顺手升级。

## 测试与检查

根 `package.json` 里的检查脚本,CI 会全部跑一遍:

```bash
pnpm lint        # eslint
pnpm build       # tsdown 构建
pnpm test        # vitest(目前没有测试文件,--passWithNoTests)
pnpm typecheck   # playground 的 vue-tsc --noEmit
```

提交前请至少执行 `pnpm lint`、`pnpm build` 和 `pnpm typecheck`,确认全部通过;改动 playground 相关依赖时再跑一次 `pnpm run build:h5` / `pnpm run build:mp-weixin` 确认示例还能构建。

## 提交规范

1. Fork 仓库并创建分支,分支名使用 `feat/xxx`、`fix/xxx`、`docs/xxx` 风格。
2. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/),如 `feat: support custom platform`、`fix: file resolving`(见现有 git log)。

## Pull Request 指南

- 一个 PR 解决一个问题,不要夹带无关改动。
- 提 PR 前在本地跑一遍 `pnpm lint`、`pnpm build` 和 `pnpm typecheck`;CI 会在 ubuntu / macos / windows × Node 22 / 24 / 26 上重复跑一遍。
- 涉及用法变化时,请同步更新 README 和 playground 示例。
- 新增选项、改动核心解析逻辑这类方案性调整,建议先开 issue 讨论。

## 发布

仅维护者操作:`pnpm release` 调用 bumpp,提交版本变更并打 `v*` tag。tag 推送后 `.github/workflows/release.yml` 触发:用 changelogithub 创建 GitHub Release,再 `pnpm publish --access public` 发布到 npm。

## 行为准则

本项目遵循 [uni-helper 行为准则](https://github.com/uni-helper/.github/blob/main/CODE_OF_CONDUCT.md)。

如有使用问题,欢迎到 [Issues](https://github.com/uni-helper/vite-plugin-uni-platform/issues) 提问。
