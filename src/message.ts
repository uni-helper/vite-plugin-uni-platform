import { normalizePath } from 'vite'
import { platform } from './platform'

/**
 * 「基础文件和平台文件都不存在」的报错文案。
 *
 * 两条解析路径共用：vite 的 `resolveId` 和 `uni-cli-shared` 的 `requireResolve` 补丁。
 * 分开写会变成两套说法，排查时对不上。
 */
export function missingBaseMessage(source: string, platformSource: string, importer?: string): string {
  let message = `缺少基础实现：无法解析 "${source}"。基础文件不存在，当前平台 ${platform} 的文件 "${platformSource}" 也不存在。`
  if (importer) {
    message += `导入方：${normalizePath(importer)}`
  }
  return message
}
