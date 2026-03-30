import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/themes.css'
import App from './App.vue'
import router from './router'
import { initDb } from './db'

// Initialize database schema
initDb().then(() => {
  console.log('Database initialized')
}).catch(err => {
  console.error('Failed to initialize database:', err)
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')