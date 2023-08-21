import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { isMp, platform } from '@uni-helper/uni-env'
import { type Plugin, normalizePath } from 'vite'
import './hacker'

export function VitePluginUniPlatform(): Plugin {
  return {
    name: 'vite-plugin-uni-platform',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      // 检查是否为刻意导入带 {platform} 后缀的文件
      if (source.includes(`.${platform}`))
        return null
      const sourceResolution = await this.resolve(source, importer, {
        ...options,
        skipSelf: true, // 避免无限循环
      })
      if (sourceResolution)
        return null
      // 无法解析，尝试拼接 platform 后去解析
      const platformSource = source.replace(/(.*)\.(.*)$/, `$1.${platform}.$2`)
      const resolution = await this.resolve(platformSource, importer, { ...options, skipSelf: true })
      // 如果无法解析或是外部引用，则直接返回错误
      if (!resolution || resolution.external)
        return resolution
      const sourceId = normalizePath(resolve(dirname(importer!), source))
      const isVue = resolution.id.endsWith('vue')
      // 小程序的vue文件直接使用 sourceId ，避免生成类似 test.mp-weixin.wxml
      // 其他平台的和其他文件直接使用 resolution
      return (isMp && isVue) ? sourceId : resolution
    },
    // 自定义加载器，尝试将所有不带 {platform} 后缀的文件拼接 {platform} 后去加载
    async load(id) {
      let platformId = id
      if (!id.includes(`.${platform}`))
        platformId = id.replace(/(.*)\.(.*)$/, `$1.${platform}.$2`)

      if (platformId && platformId !== id && existsSync(platformId)) {
        return readFileSync(platformId, {
          encoding: 'utf-8',
        })
      }
    },
  }
}

export default VitePluginUniPlatform
