# 参与贡献

感谢你愿意为这个项目贡献时间。本文档介绍项目结构、本地开发流程、测试方式和提交规范。

## 前置条件

- [Node.js](https://nodejs.org/) 26，见 `.node-version` 和 `package.json` 的 `devEngines.runtime`
- [pnpm](https://pnpm.io/) 12.16.1，见 `package.json` 的 `packageManager` 和 `devEngines.packageManager`，可用 [corepack](https://nodejs.org/api/corepack.html) 启用

## 仓库结构

```text
.
├── src/                     # 插件源码
│   ├── index.ts             # 插件入口：resolveId / load 钩子做文件替换
│   ├── platform.ts          # 解析当前平台（customScript 优先，否则 UNI_PLATFORM）
│   ├── hacker.ts            # 导入时给 @dcloudio/uni-cli-shared 打运行时补丁
│   └── types.ts             # 选项类型（include / exclude）
├── test/                    # vitest 用例：临时目录 + 真实 Vite 构建
├── playground/              # 示例 uni-app 应用（workspace 成员，本地调试用）
├── vitest.config.ts         # vitest 配置（内联 @uni-helper/uni-env，方便切换平台）
├── tsdown.config.ts         # tsdown 构建配置（ESM + dts）
├── eslint.config.js         # ESLint 配置（@uni-helper/eslint-config）
└── .github/workflows/
    ├── ci.yml               # push / PR 到 main 时的构建、lint、测试、类型检查
    └── release.yml          # v* tag 推送后的 GitHub Release 与 npm 发布
```

`playground/` 是独立的 workspace 成员，依赖通过 `workspace:*` 指向根目录的插件，所以改完 `src/` 需要先构建才能在示例里看到效果。

## 本地开发

```bash
# 安装依赖（在仓库根目录执行）
pnpm install

# 以 watch 模式构建插件，开发时保持运行
pnpm dev

# 一次性构建 dist/ 产物
pnpm build

# 构建插件后启动 playground 的 H5 示例（pnpm build + playground 的 dev:h5）
pnpm play:h5

# 构建插件后启动 playground 的微信小程序示例
pnpm play:mp-weixin

# 也可以直接跑 playground 自己的脚本，调其他平台
pnpm -C playground run dev:mp-alipay

# 只构建 playground 的产物，不启 dev server
pnpm run build:h5
pnpm run build:mp-weixin
```

playground 的 `package.json` 里 `uni-app.scripts` 定义了自定义平台 `h5-weixin`（`UNI_PLATFORM` 为 `h5`，另外注入 `H5-WEIXIN` 宏），对应文件名后缀是 `*.h5-weixin.vue`：

```bash
pnpm -C playground run build:h5-weixin
```

依赖版本统一在 `pnpm-workspace.yaml` 的 `catalog:` 里维护，单个 package 一律写 `"catalog:"`，不要在 `package.json` 里写死版本。uni-app 系列依赖钉在 `3.0.0-5000720260410001`，不要顺手升级。

本插件只构建 ESM 产物，所以 playground 的配置是 `vite.config.mts`，里面的 `Uni` 来自 `@uni-helper/plugin-uni`（官方插件是 CJS，在 ESM 配置里默认导出不是函数）。另外不要在仓库根目录加 `@dcloudio/uni-cli-shared`：会多出一份副本，`src/hacker.ts` 的补丁打在副本上，playground 构建会报 `pages/only not found`。

## 测试与检查

```bash
pnpm lint        # eslint
pnpm lint:fix    # eslint --fix
pnpm test        # vitest 全量
pnpm build       # tsdown 构建
pnpm typecheck   # src / test 的 tsc --noEmit，再跑 playground 的 vue-tsc
pnpm coverage    # vitest run --coverage
```

只跑一个用例文件：

```bash
pnpm vitest run test/index.test.ts
```

### 测试说明

用例在临时目录里生成一个最小项目（`page.h5.ts`、`page.mp-weixin.ts` 这类文件），用插件跑一次真实 `vite build`，再断言产物里是哪个文件的内容。三点值得注意：

- 平台名是模块加载时从 `process.env.UNI_PLATFORM` 读的，`bundle()` 每次先设环境变量再 `vi.resetModules()` 重新导入插件
- `@uni-helper/uni-env` 在 `vitest.config.ts` 里被设置为内联，否则它走 Node 自己的模块缓存，`resetModules()` 重置不掉，切换平台就会失效
- `src/hacker.ts` 在用例里被 `vi.mock` 掉：它打的是 `@dcloudio/uni-cli-shared` 的补丁，而 `resolveId` / `load` 的行为与补丁无关，测试环境也没有装那个包

## 代码架构

1. `src/platform.ts` 读 `UNI_CUSTOM_SCRIPT` 和 `UNI_PLATFORM`，算出当前平台名
2. `src/hacker.ts` 在导入时覆盖 `@dcloudio/uni-cli-shared` 的 `normalizePagePath` 和 `requireResolve`，让 uni 自己的页面解析也认平台后缀
3. `src/index.ts` 的 `resolveId` 先看导入是否已带当前平台后缀，再走默认解析，失败才把平台名插进文件名重试
4. `src/index.ts` 的 `load` 对不带后缀的 id 拼出 `{name}.{platform}{ext}`，文件存在就返回它的内容

## 提交规范

1. Fork 仓库并创建分支，分支名用 `feat/xxx`、`fix/xxx`、`docs/xxx` 这类前缀
2. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，比如 `feat: support custom platform`、`fix: file resolving`，可参考现有 `git log`
3. 提交前在本地跑一遍 `pnpm lint`、`pnpm test`、`pnpm build` 和 `pnpm typecheck`
4. push 之后向 `main` 提 PR

## Pull Request 指南

- 一个 PR 解决一个问题，不要夹带无关改动
- CI 会在 ubuntu、macos、windows 三个系统和 Node 22 / 24 / 26 上重复跑构建、lint、测试和类型检查，本地过得去再提
- 改动插件行为时，同步更新 `README.md` 和 `AGENTS.md`，必要时补 playground 示例
- 新增选项、改核心解析逻辑这类方案性调整，建议先开 issue 讨论

## 发布

仅维护者操作。`pnpm release` 调用 bumpp，提交版本变更并打 `v*` tag。tag 推送后 `.github/workflows/release.yml` 触发：先用 changelogithub 创建 GitHub Release，再执行 `pnpm publish --access public --no-git-checks` 发布到 npm。

## 行为准则

本项目遵循 [uni-helper 行为准则](https://github.com/uni-helper/.github/blob/main/CODE_OF_CONDUCT.md)。

使用中遇到问题，欢迎到 [Issues](https://github.com/uni-helper/vite-plugin-uni-platform/issues) 提问。
