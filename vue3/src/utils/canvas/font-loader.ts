/**
 * 思源字体加载（canvas 与全局文本共用）
 *
 * 小程序 canvas 默认无思源字体，须 loadFontFace 加载后再绘制，否则字宽变化导致排版走样。
 * 字体文件须托管到 CDN（合法域名/可下载），并做子集化裁剪体积。
 * 加载失败回退系统字体（tokens.scss 的 font 串已预留降级链）。
 */

// TODO: 替换为实际的字体 CDN 地址（建议子集化后的 woff2）
const FONT_SOURCES = {
  'Noto Serif SC': '', // 'url("https://cdn.example.com/NotoSerifSC-subset.woff2")'
  'Noto Sans SC': '',  // 'url("https://cdn.example.com/NotoSansSC-subset.woff2")'
}

let fontReadyResolve: (() => void) | null = null
export const fontReady: Promise<void> = new Promise((resolve) => {
  fontReadyResolve = resolve
})

export function loadBrandFonts() {
  const tasks = Object.entries(FONT_SOURCES).filter(([, src]) => !!src)
  if (tasks.length === 0) {
    // 未配置字体源，直接就绪（用系统降级字体）
    fontReadyResolve?.()
    return
  }
  let pending = tasks.length
  const done = () => {
    pending -= 1
    if (pending <= 0) fontReadyResolve?.()
  }
  tasks.forEach(([family, source]) => {
    // #ifdef MP-WEIXIN || APP-PLUS || H5
    uni.loadFontFace({
      family,
      source,
      global: true,
      scopes: ['webview', 'native'],
      success: done,
      fail: done, // 失败也放行，回退系统字体
    })
    // #endif
    // #ifndef MP-WEIXIN || APP-PLUS || H5
    done()
    // #endif
  })
}
