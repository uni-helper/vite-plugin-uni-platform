// vite-plugin-uni-platform 在构建时把 `@/utils/test` 换成当前平台的 test.{platform}.ts，
// 磁盘上没有 test.ts，所以这里给类型检查补一个声明
export declare const sum: (a: number, b: number) => string
