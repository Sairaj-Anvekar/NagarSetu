import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import '@fontsource-variable/sora'
import '@fontsource-variable/public-sans'
import './assets/theme.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { registerUnauthorizedHandler } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

registerUnauthorizedHandler(router)

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    const { installMockApi } = await import('./api/mock')
    installMockApi({ delayMs: Number(import.meta.env.VITE_MOCK_API_DELAY_MS ?? 400) })
  }
  app.mount('#app')
}

start()