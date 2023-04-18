import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  // You can also define pages fields, which have the highest priority.priority.
  pages: [],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "uni-app",
    "navigationBarBackgroundColor": "#F8F8F8",
    "backgroundColor": "#F8F8F8"
  }
})
