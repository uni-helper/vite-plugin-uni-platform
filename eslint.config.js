import uni from '@uni-helper/eslint-config'

export default uni({
  type: 'lib',
}, {
  // playground/src/pages.json 是 vite-plugin-uni-pages 生成的（已被 playground/.gitignore 忽略，
  // 但 eslint 只读根目录的 .gitignore），键顺序和换行由插件决定，不该由 lint 干预
  ignores: ['playground/src/pages.json'],
})
