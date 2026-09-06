// #ifdef APP-PLUS
import './utils/url-search-params-polyfill'
// #endif
import { createSSRApp } from 'vue'
import App from './App.vue'
// import 'uno.css'
import './styles/tokens.scss'
import './styles/animations.scss'
import './styles/signature.scss'
import { loadBrandFonts } from './utils/canvas/font-loader'
import { track } from './composables/useTrack'
// #ifdef H5
import { preparePaipanH5ColdEntry } from './lib/paipan-suite-cold-entry'
import { installPaipanH5HistoryGuard } from './lib/paipan-h5-history-guard'
import { installClientModuleH5HistoryGuard } from './lib/client-module-h5-history-guard'
// #endif

export function createApp() {
  // #ifdef H5
  preparePaipanH5ColdEntry()
  // #endif
  const app = createSSRApp(App)
  // #ifdef H5
  app.mixin({ beforeCreate() {
    if (this === this.$root) {
      const router = (this as unknown as { $router?: Parameters<typeof installPaipanH5HistoryGuard>[0] }).$router
      installPaipanH5HistoryGuard(router)
      installClientModuleH5HistoryGuard(router)
    }
  } })
  // #endif
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
