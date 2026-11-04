import { customScript, platform as uniPlatform } from '@uni-helper/uni-env'

/**
 * 当前编译平台：用了 uni-app 自定义编译脚本时取脚本名（如 playground 的
 * `h5-weixin`），否则取 `UNI_PLATFORM`。
 */
export const platform = customScript || uniPlatform
