// overwrite uni-cli-shared utils normalizePagePath
// @ts-expect-error ignore
import * as utils from '@dcloudio/uni-cli-shared/dist/utils.js'
// @ts-expect-error ignore
import * as constants from '@dcloudio/uni-cli-shared/dist/constants.js'
import { resolve } from 'node:path'
import { inputDir as uniInputDir, isApp, isMp } from '@uni-helper/uni-env'
import { existsSync } from 'node:fs'

// const uniNormalizePagePath = utils.normalizePagePath
// 解决 MP 和 APP 平台页面文件不存在时不继续执行的问题
// @ts-expect-error ignore
utils.normalizePagePath = function (pagePath, platform) {
  const absolutePagePath = resolve(uniInputDir, pagePath)
  let extensions = constants.PAGE_EXTNAME
  if (isApp) {
    extensions = constants.PAGE_EXTNAME_APP
  }
  for (let i = 0; i < extensions.length; i++) {
    const extname = extensions[i]

    if (existsSync(absolutePagePath + extname)) {
      return pagePath + extname
    }
    const withPlatform = `${absolutePagePath}.${platform}${extname}`
    if ((isApp || isMp) && existsSync(withPlatform)) {
      return pagePath + extname
    }
  }
  console.error(`${pagePath} not found`)
}
