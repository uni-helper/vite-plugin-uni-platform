import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
// overwrite uni-cli-shared utils normalizePagePath
import { parse, resolve } from 'node:path'
import { isApp, isAppX, inputDir as uniInputDir } from '@uni-helper/uni-env'
import { platform } from './platform'

// 包只发 ESM，直接用 import.meta.url 拿 require，用来加载要打补丁的 CJS 内部模块
const _require = createRequire(import.meta.url)

// 获取原始模块对象
const uniUtils = _require('@dcloudio/uni-cli-shared/dist/utils.js')
const uniResolve = _require('@dcloudio/uni-cli-shared/dist/resolve.js')
const constants = _require('@dcloudio/uni-cli-shared/dist/constants.js')

// 解决 MP 和 APP 平台页面文件不存在时不继续执行的问题
// @ts-expect-error ignore
uniUtils.normalizePagePath = function (pagePath, platform) {
  const absolutePagePath = resolve(uniInputDir ?? '.', pagePath)
  let extensions = isAppX ? constants.X_PAGE_EXTNAME : constants.PAGE_EXTNAME
  if (isApp)
    extensions = isAppX ? constants.X_PAGE_EXTNAME_APP : constants.PAGE_EXTNAME_APP

  for (let i = 0; i < extensions.length; i++) {
    const extname = extensions[i]

    // 优先匹配平台特定文件，避免 uni-app 同时注册基础文件和平台文件导致页面重复
    const withPlatform = `${absolutePagePath}.${platform}${extname}`
    if (existsSync(withPlatform))
      return `${pagePath}.${platform}${extname}`

    if (existsSync(absolutePagePath + extname))
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
  catch {
    const { ext, base, dir } = parse(filename)
    filename = `${dir}/${base}.${platform}${ext
      ? `.${ext}`
      : ''}`
    return requireResolve(filename, basedir)
  }
}
