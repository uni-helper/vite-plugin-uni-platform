import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// 插件导入时会给 @dcloudio/uni-cli-shared 打补丁，那部分跟 resolveId / load 无关，
// 而测试环境里没有 uni-cli-shared，所以这里把它换掉
vi.mock('../src/hacker', () => ({}))

/**
 * 临时项目里 `page` 只有带平台后缀的文件，`base` 则同时有基础文件和平台文件。
 */
const FIXTURE: Record<string, string> = {
  'src/main.ts': [
    'export { value as page } from \'./page.ts\'',
    'export { value as base } from \'./base.ts\'',
    'export { value as detail } from \'./pages/v1.2/detail\'',
    '',
  ].join('\n'),
  'src/page.h5.ts': 'export const value = \'page-h5\'',
  'src/page.mp-weixin.ts': 'export const value = \'page-mp-weixin\'',
  'src/base.ts': 'export const value = \'base-file\'',
  'src/base.h5.ts': 'export const value = \'base-h5\'',
  // 目录名里带点，后缀只能加在文件名上（uni-pages 也按这个规则认平台页）
  'src/pages/v1.2/detail.h5.ts': 'export const value = \'detail-h5\'',
  'src/pages/v1.2/detail.mp-weixin.ts': 'export const value = \'detail-mp-weixin\'',
}

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'uni-platform-'))
  await mkdir(join(root, 'src/pages/v1.2'), { recursive: true })
  for (const [name, content] of Object.entries(FIXTURE))
    await writeFile(join(root, name), content)
})

afterEach(async () => {
  delete process.env.UNI_PLATFORM
  await rm(root, { recursive: true, force: true })
})

/** 用指定平台真正跑一次 Vite 构建，返回产物内容 */
async function bundle(platform: string): Promise<string> {
  process.env.UNI_PLATFORM = platform
  // 平台名在模块加载时从 UNI_PLATFORM 读入，换平台要重新导入插件
  vi.resetModules()
  const { default: VitePluginUniPlatform } = await import('../src/index')
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      VitePluginUniPlatform(),
    ],
    build: {
      minify: false,
      outDir: 'dist',
      lib: {
        entry: join(root, 'src/main.ts'),
        formats: ['es'],
      },
      rollupOptions: {
        output: { entryFileNames: 'main.js' },
      },
    },
  })
  return readFile(join(root, 'dist/main.js'), 'utf8')
}

it('基础文件不存在时用当前平台的文件', async () => {
  const h5 = await bundle('h5')
  expect(h5).toContain('page-h5')
  expect(h5).not.toContain('page-mp-weixin')

  const mp = await bundle('mp-weixin')
  expect(mp).toContain('page-mp-weixin')
  expect(mp).not.toContain('page-h5')
})

it('平台文件存在时覆盖基础文件', async () => {
  const h5 = await bundle('h5')
  expect(h5).toContain('base-h5')
  expect(h5).not.toContain('base-file')
})

it('目录名带点时后缀只加在文件名上', async () => {
  const h5 = await bundle('h5')
  expect(h5).toContain('detail-h5')
  expect(h5).not.toContain('detail-mp-weixin')
})
