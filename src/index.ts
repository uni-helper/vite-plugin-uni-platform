import type { Plugin } from 'vite'
import type { ResolvedOptions, UserOptions } from './types'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, parse, resolve } from 'node:path'
import { isMp } from '@uni-helper/uni-env'
import { createFilter, normalizePath } from 'vite'
import { missingBaseMessage } from './message'
import { platform } from './platform'
// 导入即给 @dcloudio/uni-cli-shared 打补丁
import './hacker'

function resolveOptions(userOptions: UserOptions): ResolvedOptions {
  return {
    include: '**/*',
    exclude: [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/],
    ...userOptions,
  }
}

function hasPlatformSuffix(id: string): boolean {
  const fileName = basename(id, extname(id))
  return new RegExp(`\\.${platform}$`).test(fileName)
}

function joinPlatformSuffix(id: string): string {
  const { base, ext } = parse(id)
  if (!base)
    return id
  // 后缀只加在文件名上：目录名里的点（如 pages/v1.2/detail）不是扩展名。
  // 没有扩展名时接在文件名末尾，这样 `@/utils/test` 也能拼出 test.{platform}
  const name = ext
    ? base.slice(0, -ext.length)
    : base
  // 文件名之前的部分原样保留，不重新拼路径，免得丢掉 ./ 前缀或分隔符
  return `${id.slice(0, id.length - base.length)}${name}.${platform}${ext}`
}

/**
 * 只处理项目里的本地文件导入：包名和虚拟模块解析失败由别的插件报错，
 * 这里插一杠会把它们的错报成“缺少基础实现”。
 * 配了 resolve.alias 的导入在这一步已经是绝对路径，相对导入保持相对形式。
 */
function isLocalFileImport(source: string, importer: string | undefined): boolean {
  if (!importer || importer.startsWith('\0') || importer.startsWith('virtual:'))
    return false
  return source.startsWith('./') || source.startsWith('../') || isAbsolute(source)
}

export function VitePluginUniPlatform(userOptions: UserOptions = {}): Plugin {
  const options = resolveOptions(userOptions)
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'vite-plugin-uni-platform',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      // 检查是否为刻意导入带 {platform} 后缀的文件
      if (hasPlatformSuffix(source))
        return null
      const sourceResolution = await this.resolve(source, importer, {
        ...options,
        skipSelf: true, // 避免无限循环
      })
      if (sourceResolution)
        return null
      // 无法解析，尝试拼接 platform 后去解析
      const platformSource = joinPlatformSuffix(source)
      let resolution: { id: string, external?: boolean | 'absolute' } | null = null
      try {
        resolution = await this.resolve(platformSource, importer, { ...options, skipSelf: true })
      }
      catch (error) {
        // commonjs--resolver 之类的解析器对带未知后缀的路径直接抛错，
        // 换成能说明「缺少基础实现」的错报
        if (!importer || !isLocalFileImport(source, importer))
          throw error
        this.error({
          message: missingBaseMessage(source, platformSource, importer),
          id: importer,
        })
      }
      if (!resolution) {
        if (!importer || !isLocalFileImport(source, importer))
          return resolution
        this.error({
          message: missingBaseMessage(source, platformSource, importer),
          id: importer,
        })
      }
      // 外部引用交给别的插件
      if (resolution.external)
        return resolution
      if (!filter(resolution.id))
        return null
      const sourceId = normalizePath(resolve(dirname(importer!), source))
      const isVue = resolution.id.endsWith('vue')
      // 小程序的vue文件直接使用 sourceId ，避免生成类似 test.mp-weixin.wxml
      // 其他平台的和其他文件直接使用 resolution
      return (isMp && isVue)
        ? sourceId
        : resolution
    },
    // 自定义加载器，尝试将所有不带 {platform} 后缀的文件拼接 {platform} 后去加载
    async load(id) {
      let platformId = id
      if (!hasPlatformSuffix(id))
        platformId = joinPlatformSuffix(id)
      if (!filter(platformId))
        return
      if (platformId && platformId !== id && existsSync(platformId)) {
        return readFileSync(platformId, {
          encoding: 'utf-8',
        })
      }
    },
  }
}

export default VitePluginUniPlatform
