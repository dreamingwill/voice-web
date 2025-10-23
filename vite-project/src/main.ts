import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerElementPlus } from './plugins/element'
import '@/styles/tailwind.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
registerElementPlus(app)

app.mount('#app')
