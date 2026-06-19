import { createSSRApp } from 'vue'
import App from './App.vue'
import 'uno.css'
import './styles/tokens.scss'
import './styles/animations.scss'
import { loadBrandFonts } from './utils/canvas/font-loader'

export function createApp() {
  const app = createSSRApp(App)
  // 思源字体加载（canvas 与全局文本共用），失败回退系统字体
  loadBrandFonts()
  return { app }
}
