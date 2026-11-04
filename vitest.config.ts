import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 平台名在模块加载时从 process.env.UNI_PLATFORM 读入，测试里要切换平台就得让
    // vi.resetModules() 真正重新执行 @uni-helper/uni-env；外部化的依赖走 Node 自己的
    // 模块缓存，reset 不掉，所以这里把它交给 vitest 内联处理
    server: {
      deps: {
        inline: ['@uni-helper/uni-env'],
      },
    },
  },
})
