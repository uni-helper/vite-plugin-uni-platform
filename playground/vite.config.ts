import { defineConfig } from 'vite'
import Uni from '@dcloudio/vite-plugin-uni'
import UniPlatform from '@uni-helper/vite-plugin-uni-platform'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import { platform } from '@uni-helper/uni-env'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    UniPlatform(),
    UniPages({
      onBeforeWriteFile(ctx) {
        const pagesMap = new Map()
        const pages = ctx.pageMetaData.filter(v => !/\..*$/.test(v.path) || v.path.includes(platform)).map(v => ({ ...v, path: v.path.replace(/\..*$/, '') }))
        pages.forEach(v => pagesMap.set(v.path, v))
        ctx.pageMetaData = [...pagesMap.values()]
      },
    }),
    Uni(),
  ],
})
