import { createSSRApp } from 'vue'
import Hello from '@/components/hello.vue'
import App from './App.vue'

// eslint-disable-next-line ts/explicit-function-return-type
export function createApp() {
  const app = createSSRApp(App)
  app.component('Hello', Hello)
  return {
    app,
  }
}
