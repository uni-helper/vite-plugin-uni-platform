# vite-plugin-uni-platform

在 Vite 驱动的 uni-app 中实现基于文件名的按平台编译:`pages/index.h5.vue`、`index.mp-weixin.vue` 这类带平台后缀的文件只在对应平台生效。插件在 `resolveId` / `load` 钩子里做文件替换,并在导入时给 `@dcloudio/uni-cli-shared` 打运行时补丁。无 CLAUDE.md;workspace 只有 playground,无独立 AGENTS.md。

## 项目

- TypeScript,tsconfig `strict: true`;tsdown 构建为 ESM + CJS 双格式(`dist/index.mjs` / `index.cjs` + 对应 `.d.mts` / `.d.cts`),`exports` 同时提供 `import` / `require`,发布内容仅 `dist`(`files` 字段)。
- 包管理器:pnpm 12.16.1(`packageManager`,同时写在 `devEngines` 里,不匹配只 warn),Node 26(`.node-version`)。依赖版本集中在 `pnpm-workspace.yaml` 的 `catalog:`,package.json 一律写 `"catalog:"`。workspace 只声明 `playground`。
- 依赖:运行时依赖只有 `@uni-helper/uni-env`;peer 依赖 `vite ^5.0.0`(开发用 catalog 的 `^5.4.21`)。开发工具:tsdown ^0.23.4、vitest ^3.2.7、eslint ^10.14.0、TypeScript ^6.0.3。
- Lint:`@uni-helper/eslint-config` 的 `uni({ type: 'lib' })`(antfu 风格:单引号、无分号),`pnpm lint` / `lint:fix`;`pnpm typecheck` 跑 playground 的 `vue-tsc --noEmit`。
- 测试:devDependencies 里有 vitest、根有 `pnpm test`(`vitest --passWithNoTests`),仓库目前没有任何测试文件和 vitest 配置。
- CI:`.github/workflows/ci.yml` 在 push / PR 到 main 时跑 build、build:h5、build:mp-weixin、lint、test、typecheck,matrix 为 ubuntu / macos / windows × Node 22 / 24 / 26;`release.yml` 由 v* tag 触发,发布走 `pnpm release`(bumpp)。
- `pnpm-workspace.yaml` 的 `trustPolicy: no-downgrade` 由 eslint 的 `pnpm/yaml-enforce-settings` 强制;`trustPolicyExclude` 里的三个包是本插件还要支持 vite 5 才留下的例外(vite 5 这条线没有新版本的信任级别),移除它们 `pnpm install` 会报 `ERR_PNPM_TRUST_DOWNGRADE`。
- `package.json` 标了 `"sideEffects": false`,但 `src/hacker.ts` 导入时就有副作用(monkey-patch),补丁生效依赖 `src/index.ts` 对它的静态导入。

## 命令

```bash
pnpm install                            # 安装依赖
pnpm dev                                # tsdown watch 构建
pnpm build                              # 构建到 dist/(ESM + CJS + dts)
pnpm lint                               # eslint 检查
pnpm lint:fix                           # eslint 自动修复
pnpm test                               # vitest(当前没有测试文件,--passWithNoTests)
pnpm typecheck                          # playground 的 vue-tsc --noEmit
pnpm build:h5                           # build 后构建 playground 的 H5 产物
pnpm build:mp-weixin                    # build 后构建 playground 的微信小程序产物
pnpm play:h5                            # dev watch + playground 的 dev:h5
pnpm play:mp-weixin                     # dev watch + playground 的 dev:mp-weixin
pnpm -C playground run build:h5-weixin  # 自定义编译脚本 h5-weixin 的构建
pnpm release                            # 维护者发布:bumpp
```

## 架构

| 模块 | 职责 |
| --- | --- |
| `src/index.ts` | 插件入口 `VitePluginUniPlatform`(具名 + 默认导出),`enforce: 'pre'`;选项 `include`(默认 `**/*`)、`exclude`(默认 node_modules、.git)经 vite `createFilter` 过滤 |
| `src/hacker.ts` | 副作用模块:解析 `platform`,monkey-patch `@dcloudio/uni-cli-shared` 的 `normalizePagePath` 和 `requireResolve` |
| `src/types.ts` | `Options` / `UserOptions` / `ResolvedOptions`(仅 `include` / `exclude`) |
| `tsdown.config.ts` | 入口 `src/index.ts`,esm + cjs + dts;`@dcloudio/uni-cli-shared` 在 `deps.neverBundle` 里保持外部 |
| `playground/` | 示例 uni-app 应用,`vite.config.ts` 里按 UniPlatform → UniPages → Uni 顺序注册插件;uni-pages 0.6.1 只发 ESM,而这份配置按 CJS 加载,所以在 `defineConfig(async () => ...)` 里动态导入它 |

关键行为:

- **platform 的取值**(hacker.ts):`customScript || uniPlatform`(来自 `@uni-helper/uni-env`)。使用 uni-app 自定义编译脚本时取脚本名,例如 playground 的 `h5-weixin`,对应文件后缀就是 `*.h5-weixin.vue`;普通平台(README 里的 `h5` / `mp-weixin` / `app`)则取 `uniPlatform`。
- **resolveId**(index.ts):导入源本身已带 `.{platform}` 后缀(按去掉扩展名的文件名正则判断)时直接放行;先走默认解析,失败才把平台名插到 source 最后一个点之前(带扩展名时即 `a.vue` → `a.h5.vue`)再解析,解析结果要过 include/exclude 过滤,外部引用原样返回。小程序端(`isMp`)的 `.vue` 文件返回平台文件自身的路径,让 uni 生成 `index.mp-weixin.wxml` 这类带平台名的产物;其他情况返回拼接后的解析结果。
- **load**(index.ts):对任何不带平台后缀的 id 拼出 `{name}.{platform}{ext}`,用 `existsSync` 探测,存在就读文件内容返回——纯文件替换,没有任何代码转换,过滤同样作用于拼接后的 id。
- **hacker.ts 的补丁**:用兼容 ESM/CJS 的 require 加载 `@dcloudio/uni-cli-shared` 的 `dist/utils.js`、`dist/resolve.js`、`dist/constants.js`,覆盖 `normalizePagePath`(页面解析优先找 `页面.{platform}{ext}` 平台文件,避免同时注册基础文件和平台文件导致页面重复;app / app-x 用单独的扩展名列表;都找不到则 console.error)和 `requireResolve`(解析失败时拼上平台后缀重试)。补丁在模块导入时执行;`@dcloudio/uni-cli-shared` 必须保持外部,才能 patch 到使用方安装的那份。
- **playground**:`package.json` 的 `uni-app.scripts` 定义自定义平台 `h5-weixin`(`UNI_PLATFORM: h5` + define `H5-WEIXIN`);`src/pages` 与 `src/utils` 放了 `*.{h5,h5-weixin,mp-weixin,app}.*` 的对照文件。`vite-plugin-uni-pages` 0.6.1 在 `configResolved` 里按插件名 `vite-plugin-uni-platform` 认出本插件,自己过滤其他平台的页面并剥掉后缀(`filterPlatformSuffixPages`),playground 不再需要 `onBeforeWriteFile`;但插件顺序必须是 UniPlatform 在 UniPages 之前。`src/utils/test.d.ts` 只为类型检查声明 `@/utils/test`(磁盘上没有那个文件,由本插件在构建时换成 `test.{platform}.ts`)。

## 约定

- 代码风格:antfu 风格(单引号、无分号),写完跑 `pnpm lint:fix`。`.vscode/settings.json` 已提交:prettier 关闭、保存时 eslint 自动修复、IDE 里静默 style 类规则(仍可自动修复)。
- 注释与文档语言:README 和源码注释均为简体中文。
- 提交信息遵循 Conventional Commits(`feat:` / `fix:` / `chore:` / `docs:` / `ci:`,见 git log)。
- uni-app 系列依赖在 catalog 钉在 `3.0.0-5000720260410001`,不要顺手升级;playground 用 `workspace:*` 引用插件。
- 文档同步:改插件行为或用法时,同步更新 README(含与 uni-pages 配合使用的片段)和 playground 示例。
