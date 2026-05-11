import { createSSRApp } from 'vue'
import Hello from '@/components/hello.vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.component('Hello', Hello)
  return {
    app,
  }
}
