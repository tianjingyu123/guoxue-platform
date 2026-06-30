import { createSSRApp } from 'vue'
import App from './App.vue'
// import 'uno.css'
import './styles/tokens.scss'
import './styles/animations.scss'
import { loadBrandFonts } from './utils/canvas/font-loader'
import { track } from './composables/useTrack'

export function createApp() {
  const app = createSSRApp(App)
  // 全局 Vue 错误兜底：捕获组件渲染/生命周期内未处理异常，统一记录并上报埋点
  app.config.errorHandler = (err, _instance, info) => {
    console.error('[全局错误]', info, err)
    try {
      track.custom('error', { msg: String((err as any)?.message || err), info })
    } catch {
      // 上报失败不可影响主流程
    }
  }
  // 思源字体加载（canvas 与全局文本共用），失败回退系统字体
  loadBrandFonts()
  return { app }
}
