/**
 * RUM 真实用户性能采集（T3 可观测·仅 H5 端）。
 * web-vitals 采集 LCP/INP/CLS/TTFB，经现有埋点通道（action=web_vitals）上报 /track/batch，
 * 后端 /observability/web-vitals 按日聚合 p75 供 admin 性能观测页。
 * 小程序/App 端条件编译为空实现（无 DOM 性能 API）。
 */
import { track } from './useTrack'

export function initWebVitals(): void {
  // #ifdef H5
  import('web-vitals')
    .then(({ onLCP, onINP, onCLS, onTTFB }) => {
      const report = (m: { name: string; value: number }) => {
        // LCP/INP/TTFB 单位 ms 取整；CLS 无单位保留 4 位小数
        const value = m.name === 'CLS' ? Math.round(m.value * 10000) / 10000 : Math.round(m.value)
        track.custom('web_vitals', { metric: m.name, value })
      }
      onLCP(report)
      onINP(report)
      onCLS(report)
      onTTFB(report)
    })
    .catch(() => {
      /* 采集库加载失败静默：观测不影响业务 */
    })
  // #endif
}
