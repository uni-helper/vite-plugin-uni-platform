# vite-plugin-uni-platform

在 Vite 驱动的 uni-app 里按文件名做平台分流：`pages/index.h5.vue`、`index.mp-weixin.vue` 这类带平台后缀的文件只在对应平台生效。插件在 `resolveId` / `load` 里替换文件，导入时给 `@dcloudio/uni-cli-shared` 打运行时补丁，不改写文件内容。workspace 只有 playground，没有独立的 AGENTS.md。

## 项目

- TypeScript，`tsconfig.json` 开了 `strict`、`moduleResolution: bundler`，`exclude` 里排掉 `**/playground/**`、`**/dist/**` 等目录，好让根目录的 `tsc --noEmit` 只扫 `src/`、`test/` 和两个配置文件；`pnpm typecheck` 先跑这个，再跑 playground 的 vue-tsc。lint 用 `@uni-helper/eslint-config` 的 `uni({ type: 'lib' })`（antfu 风格：单引号、无分号）。
- 只发 ESM：`tsdown.config.ts` 的 `format` 是 `['esm']`，产物 `dist/index.mjs` + `dist/index.d.mts`，`exports` 只有 `types` 和 `import`，没有 `require` 分支。因此使用方的 Vite 配置必须按 ESM 加载（`vite.config.mts` 或 `"type": "module"`）。
- 包管理器 pnpm 12.16.1（`packageManager` + `devEngines.packageManager`），Node 26（`.node-version` + `devEngines.runtime`，不匹配只 warn）。依赖版本集中在 `pnpm-workspace.yaml` 的 `catalog:`，package.json 一律写 `"catalog:"`。
- 运行时依赖只有 `@uni-helper/uni-env`；peer 依赖 `vite ^5.0.0`；发布的 `engines.node` 是 `^22.22.2 || ^24.15.0 || >=26.0.0`，和 CI 测的 22 / 24 / 26 对齐（开发环境本身钉在 26，见 `devEngines`）。开发工具：tsdown ^0.23.4、vitest ^3.2.7、eslint ^10.14.0、TypeScript ^6.0.3。
- `@dcloudio/uni-cli-shared` 在 `tsdown.config.ts` 的 `deps.neverBundle` 里保持外部，才能在运行时打到使用方装的那份；它不能出现在本包的 devDependencies 里，原因见下面的坑。
- `pnpm-workspace.yaml` 的 `trustPolicy: no-downgrade` 由 eslint 的 `pnpm/yaml-enforce-settings` 强制；`trustPolicyExclude` 里的三个包是还要支持 vite 5 才留的例外，删掉它们 `pnpm install` 会报 `ERR_PNPM_TRUST_DOWNGRADE`。

## 命令

```bash
pnpm install                            # 安装依赖
pnpm dev                                # tsdown watch 构建
pnpm build                              # 构建 dist/（ESM + dts）
pnpm lint                               # eslint
pnpm lint:fix                           # eslint --fix
pnpm test                               # vitest：临时目录里跑真实 vite build
pnpm vitest run test/index.test.ts      # 只跑一个用例文件
pnpm typecheck                          # tsc --noEmit（src / test）再跑 playground 的 vue-tsc
pnpm coverage                           # vitest run --coverage（@vitest/coverage-v8）
pnpm build:h5                           # build 后构建 playground 的 H5 产物
pnpm build:mp-weixin                    # build 后构建 playground 的微信小程序产物
pnpm play:h5                            # dev watch + playground 的 dev:h5
pnpm play:mp-weixin                     # dev watch + playground 的 dev:mp-weixin
pnpm -C playground run build:h5-weixin  # 自定义编译脚本 h5-weixin 的构建
pnpm release                            # 维护者发布：bumpp 打 tag
```

## 架构

| 模块 | 职责 |
| --- | --- |
| `src/index.ts` | 插件入口 `VitePluginUniPlatform`（具名 + 默认导出），`enforce: 'pre'`；`include`（默认 `**/*`）和 `exclude`（默认 node_modules、.git）经 Vite 的 `createFilter` 过滤；第一件事是导入 `./hacker` 触发补丁 |
| `src/platform.ts` | 导出 `platform = customScript \|\| uniPlatform`（来自 `@uni-helper/uni-env`，模块加载时读环境变量）；没有副作用，测试和纯逻辑代码单独导入它 |
| `src/hacker.ts` | 副作用模块：用 `createRequire(import.meta.url)` 加载 `@dcloudio/uni-cli-shared` 的 `dist/utils.js`、`dist/resolve.js`、`dist/constants.js` 并覆盖 `normalizePagePath`、`requireResolve` |
| `src/types.ts` | `Options` / `UserOptions` / `ResolvedOptions`，只有 `include` 和 `exclude` |
| `test/index.test.ts` | 三个用例：平台文件补位、平台文件覆盖基础文件、目录名带点时后缀只加在文件名上 |
| `vitest.config.ts` | 把 `@uni-helper/uni-env` 内联，`vi.resetModules()` 才能重新读 `UNI_PLATFORM` |
| `tsdown.config.ts` | 入口 `src/index.ts`，esm + dts，`@dcloudio/uni-cli-shared` 保持外部 |
| `playground/` | 示例 uni-app 应用，`vite.config.mts`，`Uni` 来自 `@uni-helper/plugin-uni` |

### platform 的取值

`customScript || uniPlatform`。uni-app 自定义编译脚本存在时取脚本名，比如 playground 的 `h5-weixin`（`UNI_PLATFORM` 仍是 `h5`），对应后缀是 `*.h5-weixin.vue`；普通平台取 `UNI_PLATFORM`。

两个容易踩的点：这个值在模块加载时就算好，测试切换平台必须 `vi.resetModules()` 后重新导入；`isMp`（来判断 `mp-*`）用的是 `UNI_PLATFORM` 而不是这里的 `platform`，所以 `h5-weixin` 不会被当成小程序。

### resolveId 与 load 的分工

`resolveId` 的顺序：导入源本身已带当前平台后缀就放行；否则先走默认解析，成功就交给 Vite（基础文件胜出）；只有默认解析失败时才把平台名插进文件名重试，结果要过 `include` / `exclude`。小程序端（`UNI_PLATFORM` 匹配 `mp-*`）且解析到 `.vue` 时返回平台文件自己的路径，其余情况返回拼接后的解析结果。

`load` 负责覆盖：任何不带平台后缀的 id 都拼出 `{name}.{platform}{ext}`，`existsSync` 命中就返回那个文件的内容。所以「平台文件覆盖同名基础文件」是 `load` 实现的，「只有平台文件也能解析」是 `resolveId` 实现的，改一处要连着看另一处。

`joinPlatformSuffix` 的不变量：后缀只加在文件名上。`pages/v1.2/detail` 要拼成 `pages/v1.2/detail.h5`，不能把 `v1.2` 当扩展名；没有扩展名时接在文件名末尾，这样 `@/utils/test` 能拼出 `test.h5`。`test/index.test.ts` 里有用例锁这条规则。

### hacker.ts 的补丁

覆盖 `normalizePagePath`：页面解析优先找 `页面.{platform}{ext}` 平台文件，避免 uni-app 同时注册基础文件和平台文件导致页面重复；app / app-x 用单独的扩展名列表；都找不到时 `console.error`。覆盖 `requireResolve`：解析失败时拼上平台后缀重试。补丁在模块导入时执行，所以 `src/index.ts` 必须保留对 `./hacker` 的导入，`package.json` 也不能声明 `"sideEffects": false`：那样 tsdown 会时不时把这条纯副作用导入摇掉，构建产物里没有补丁，`uni build` 就会报 `pages/only not found`（实测四次构建里撞到过一次，删掉该字段后连续六次都带补丁）。

补丁打到的必须是使用方装的那一份 `@dcloudio/uni-cli-shared`。不要在仓库根目录加这个依赖：pnpm 会装出第二份副本（root 和 playground 的 store 路径不同），补丁打在副本上、uni 自己的插件还用原版，playground 构建报 `pages/only not found`。

### 与 uni-pages 的契约

`@uni-helper/vite-plugin-uni-pages` 0.6.1 在 `configResolved` 里用 `config.plugins.some(v => v.name === 'vite-plugin-uni-platform')` 认出本插件，然后自己调 `filterPlatformSuffixPages` 过滤页面并剥掉后缀，再用 `validateGeneratedRoutes` 校验。由此得到三条约束：

- 插件名不能改，也不能被别的插件包一层，否则 uni-pages 认不出来，`pages.json` 会混进其他平台的页面
- 插件实例必须真的出现在 `config.plugins` 里；注册顺序没有要求（把 `UniPages()` 写在前面实测也能正常过滤），示例统一写 `UniPlatform()` 在前
- 用 uni-pages 的 `prepare()`（提前生成 pages.json 给下游插件）时必须传 `platformSuffix: true`，它不会自己读插件列表

uni-pages 那边的后缀判断是 `path.includes(UNI_PLATFORM)`，比本插件宽：用自定义编译脚本（`h5-weixin`）时 uni-pages 看到的平台是 `h5`，所以 `.h5-weixin.vue` 页面会因为 `includes('h5')` 被当成当前平台的页面保留。不要试图在 uni-pages 里修这个，那是它文档里写明的既有行为。

### 测试与生成物

`test/index.test.ts` 在 `mkdtemp` 出来的目录里写最小项目，用插件跑真实 `vite build`，然后断言产物内容，不是 mock 掉插件钩子。`src/hacker.ts` 被 `vi.mock` 掉，因为它打的是 `@dcloudio/uni-cli-shared` 的补丁，和 `resolveId` / `load` 的行为无关，测试环境也没装那个包。`@uni-helper/uni-env` 必须在 `vitest.config.ts` 里内联，否则外部化的依赖走 Node 的模块缓存，`vi.resetModules()` 重置不掉。`pnpm coverage` 的 `coverage.include` 只统计 `src/`：`hacker.ts` 因为被 mock 一直是 0%，`types.ts` 只有类型没有可执行代码，也都是 0%，不用为此改测试。

`playground/src/uni-pages.d.ts` 是 uni-pages 生成的，内容跟着最后一次构建的平台变（比如 mp-weixin 构建会删掉只在 H5 存在的 `/pages/only`）。仓库里提交的是 H5 构建后的结果，跑完 mp-weixin 构建它会变脏，属正常现象。`playground/src/pages.json` 同样是生成物，已在 `playground/.gitignore` 里，并在 `eslint.config.js` 的 `ignores` 里排除（eslint 只读根目录的 `.gitignore`）。

## 约定

- 提交信息用 Conventional Commits（`feat:` / `fix:` / `chore:` / `docs:` / `ci:`），看现有 `git log`。
- README、AGENTS.md、CONTRIBUTING.md 和源码注释都用简体中文；改插件行为或用法时同步更新 README 和 playground 示例。
- playground 的配置是 `vite.config.mts`，`Uni` 从 `@uni-helper/plugin-uni` 导入。`src/utils/test.d.ts` 只为类型检查声明 `@/utils/test`，磁盘上没有那个文件，由本插件在构建时换成 `test.{platform}.ts`。
- `.vscode/settings.json` 已提交：prettier 关闭，保存时 eslint 自动修复，IDE 里静默 style 类规则（仍可自动修复）。
- uni-app 系列依赖钉在 `3.0.0-5000720260410001`；改 peer 的 vite 版本或删掉 ESM 入口前先确认下游（uni-pages、playground）跟得上。
- CI（`ci.yml`）在 push / PR 到 main 时跑 build、build:h5、build:mp-weixin、lint、test、typecheck，matrix 为 ubuntu / macos / windows × Node 22 / 24 / 26。
