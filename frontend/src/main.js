import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { registerUnauthorizedHandler } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

registerUnauthorizedHandler(router)

app.mount('#app')
