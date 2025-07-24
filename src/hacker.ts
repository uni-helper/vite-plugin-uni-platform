// overwrite uni-cli-shared utils normalizePagePath
import { parse, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { customScript, isApp, inputDir as uniInputDir, platform as uniPlatform } from '@uni-helper/uni-env'

export const platform = customScript || uniPlatform

// 兼容 ESM 和 CJS 的 require
const _require = typeof require === 'function' ? require : createRequire(import.meta.url)

// 获取原始模块对象
const uniUtils = _require('@dcloudio/uni-cli-shared/dist/utils.js')
const uniResolve = _require('@dcloudio/uni-cli-shared/dist/resolve.js')
const constants = _require('@dcloudio/uni-cli-shared/dist/constants.js')

// 解决 MP 和 APP 平台页面文件不存在时不继续执行的问题
// @ts-expect-error ignore
uniUtils.normalizePagePath = function (pagePath, platform) {
  const absolutePagePath = resolve(uniInputDir, pagePath)
  let extensions = constants.PAGE_EXTNAME
  if (isApp)
    extensions = constants.PAGE_EXTNAME_APP

  for (let i = 0; i < extensions.length; i++) {
    const extname = extensions[i]

    if (existsSync(absolutePagePath + extname))
      return pagePath + extname

    const withPlatform = `${absolutePagePath}.${platform}${extname}`
    if (existsSync(withPlatform))
      return pagePath + extname
  }
  console.error(`${pagePath} not found`)
}

// 解决非页面文件不存在时无法 resolve 的问题
const requireResolve = uniResolve.requireResolve
// @ts-expect-error ignore
uniResolve.requireResolve = function (filename, basedir) {
  try {
    return requireResolve(filename, basedir)
  }
  catch (error) {
    const { ext, base, dir } = parse(filename)
    filename = `${dir}/${base}.${platform}${ext ? `.${ext}` : ''}`
    return requireResolve(filename, basedir)
  }
}
