import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { isH5, platform } from '@uni-helper/uni-env'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'

export function VitePluginUniPlatform(): Plugin {
  return {
    name: 'vite-plugin-uni-platform',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source.includes(`.${platform}`))
        return null

      // 先尝试 resolve
      const resolution = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      })
      // 无法 resolve ，且没有 platform 标识，尝试拼接 platform 后去 resolve
      if (!resolution) {
        const platformSource = source.replace(/(.*)\.(.*)$/, `$1.${platform}.$2`)
        const resolution = await this.resolve(platformSource, importer, options)
        if (!resolution || resolution.external)
          return resolution
        return normalizePath(resolve(dirname(importer!), isH5 ? platformSource : source))
      }
    },
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
