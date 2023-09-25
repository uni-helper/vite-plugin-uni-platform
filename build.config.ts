import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    output: {
      interop: 'esModule'
    }
  },
  failOnWarn: false,
  externals: ['@dcloudio/uni-cli-shared', 'vite'],
  hooks: {
    "rollup:options": (_ctx, options) => {
      options.treeshake = false
    }
  }
})
