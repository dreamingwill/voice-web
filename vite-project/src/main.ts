import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerElementPlus } from './plugins/element'
import '@/styles/tailwind.css'
import { useUserStore } from '@/stores/useUser'
import '@/mocks/http'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
registerElementPlus(app)

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  if (to.name === 'login' && userStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'login' })
    return
  }
  next()
})

app.mount('#app')
