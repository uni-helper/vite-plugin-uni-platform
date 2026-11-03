import Uni from '@dcloudio/vite-plugin-uni'
import UniPlatform from '@uni-helper/vite-plugin-uni-platform'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
// uni-pages 0.6.1 只发布 ESM 入口，而这个配置文件按 CJS 加载（playground 没开
// "type": "module"），所以只能在异步工厂里动态导入它的默认导出
export default defineConfig(async () => {
  const { default: UniPages } = await import('@uni-helper/vite-plugin-uni-pages')
  return {
    plugins: [
      // uni-pages 从插件列表里按名字 vite-plugin-uni-platform 认出本插件，
      // 自己过滤掉其他平台的页面，这里不用再传 onBeforeWriteFile
      UniPlatform(),
      UniPages({
        dts: 'src/uni-pages.d.ts',
      }),
      Uni(),
    ],
  }
})
