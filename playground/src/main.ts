import { createSSRApp } from 'vue'
import App from './App.vue'
import Hello from '@/components/hello.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.component('Hello', Hello)
  return {
    app,
  }
}
