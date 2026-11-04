import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm'],
  dts: true,
  deps: {
    neverBundle: ['@dcloudio/uni-cli-shared'],
  },
})
