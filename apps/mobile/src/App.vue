<script setup lang="ts">
import { onLaunch, onShow, onHide, onError, onPageNotFound } from '@dcloudio/uni-app'
import { track } from '@/composables/useTrack'
import { initWebVitals } from '@/composables/useWebVitals'
import { captureRefFromQuery, captureRefFromUrl } from '@/utils/referral'
import { hydrateBrandConfig } from '@/lib/brand'
import { beginAuthHandoff, exchangeHandoff } from '@/utils/request'
import { requestParentContentLayerClose } from '@/utils/content-detail-layer'

type GxWindow = Window & { __gxBackGestureInstalled?: boolean }

/**
 * H5 统一返回体验：
 * 1. 内容详情 iframe 的任何 navigateBack 都先通知父页收起，避免跳到空历史；
 * 2. 从屏幕左缘右滑可返回，避开内容区横向轮播；
 * 3. 无页面栈时回首页，保证外部深链永远有退路。
 */
function installH5BackExperience() {
  // #ifdef H5
  const win = window as GxWindow
  if (win.__gxBackGestureInstalled) return
  win.__gxBackGestureInstalled = true

  uni.addInterceptor('navigateBack', {
    invoke() {
      if (requestParentContentLayerClose()) return false
      return undefined
    },
  })

  let tracking = false
  let startX = 0
  let startY = 0
  let startedAt = 0
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    tracking = !!touch && touch.clientX <= 26
    if (!tracking) return
    startX = touch.clientX
    startY = touch.clientY
    startedAt = Date.now()
  }
  const onTouchEnd = (event: TouchEvent) => {
    if (!tracking) return
    tracking = false
    const touch = event.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - startX
    const dy = Math.abs(touch.clientY - startY)
    const elapsed = Date.now() - startedAt
    if (dx < 82 || dy > 56 || elapsed > 850) return
    if (requestParentContentLayerClose()) return
    const pages = getCurrentPages()
    if (pages.length > 1) uni.navigateBack({ delta: 1 })
    else uni.reLaunch({ url: '/pages/index/index' })
  }
  const cancel = () => { tracking = false }
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  document.addEventListener('touchcancel', cancel, { passive: true })
  // #endif
}

/** 从启动参数/URL 取一次性握手码（H5 hash 模式兜底解析 location）。 */
function readHandoffCode(query?: Record<string, unknown>): string {
  let code = String(query?.handoff ?? '')
  // #ifdef H5
  if (!code && typeof window !== 'undefined') {
    const hash = window.location.hash || ''
    const qs = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : (window.location.search || '').replace(/^\?/, '')
    code = new URLSearchParams(qs).get('handoff') || ''
  }
  // #endif
  return code
}

/**
 * 无感登录（安全版）：外部（如后台跳转发文链接）只携带一次性握手码，
 * C 端拿码向后端换取全新会话——URL 里不出现可复用 token，且攻击者无法伪造码（签发需登录态），
 * 从根本上消除 token 泄露与会话固定风险。换会话期间用握手就绪门短暂拦住业务请求，避免 401。
 */
function bootstrapHandoff(query?: Record<string, unknown>): void {
  const code = readHandoffCode(query)
  if (!code) return
  const release = beginAuthHandoff()
  exchangeHandoff(code).finally(release)
}

/** 从跳转参数中取出页面路径（去 query），用于全局 page_view 埋点 */
function pickUrl(args: string | { url?: string }): string {
  const url = typeof args === 'string' ? args : args?.url
  return url ? String(url).split('?')[0] : ''
}

onLaunch((options?: { query?: Record<string, unknown> }) => {
  // #ifdef H5
  // 动态分包加载失败自愈：部署后旧 index.html 被浏览器(尤其 iOS Safari/WebView)顽固缓存、
  // 引用了已被替换的旧 chunk 时，懒加载分包(如设置页)会 preloadError 导致白屏。
  // 捕获后自动刷新拿最新 index.html；用会话标记防死循环刷新。
  window.addEventListener('vite:preloadError', () => {
    if (!sessionStorage.getItem('__chunk_reloaded__')) {
      sessionStorage.setItem('__chunk_reloaded__', '1')
      window.location.reload()
    }
  })
  // #endif
  installH5BackExperience()
  // 无感登录：URL 带一次性握手码（后台跳转发文链接）→ 换取会话，赶在业务请求之前上闩
  try { bootstrapHandoff(options?.query) } catch { /* 不影响启动 */ }
  // 品牌配置水合（租-T0）：从后端拉取站名/标语/主色等，失败静默用内置默认值
  hydrateBrandConfig()
  // RUM 性能采集（T3 可观测·仅 H5 生效）
  initWebVitals()
  // 推荐归因：冷启动落地页携带 ref（分享链接）时记录最近分享者
  try {
    captureRefFromQuery(options?.query)
  } catch {
    /* 归因失败不影响启动 */
  }
  // 全局路由埋点：拦截四类跳转，统一上报 page_view（一处接入、全局覆盖，无需逐页改）
  ;['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'].forEach((api) => {
    uni.addInterceptor(api, {
      invoke(args: { url?: string }) {
        // 埋点/归因拦截器自身异常绝不能影响跳转放行
        try {
          const path = pickUrl(args)
          if (path) track.pageView(path)
          captureRefFromUrl(typeof args === 'string' ? args : args?.url)
        } catch {
          /* 失败静默忽略 */
        }
        // 不返回 false，正常放行跳转
      },
    })
  })
})
// 热启动（小程序从分享卡片再次进入）同样捕获 ref
onShow((options?: { query?: Record<string, unknown> }) => {
  try {
    captureRefFromQuery(options?.query)
  } catch {
    /* 归因失败不影响显示 */
  }
})
// 切后台主动 flush 埋点队列，避免残留事件丢失
onHide(() => { track.flushNow() })
// 全局未捕获错误兜底（小程序/App 运行时错误、未处理 Promise rejection）
onError((err) => {
  console.error('[App.onError]', err)
  try {
    track.custom('error', { msg: String(err), source: 'app' })
  } catch {
    /* 上报失败不影响主流程 */
  }
})
// 全局路由兜底：访问不存在/已退役的页面路径（错误 URL、被删的旧路由）时，
// 回首页而非留白屏（uni onPageNotFound 在 H5 亦触发；首页路径恒存在，不会循环）。
onPageNotFound((res) => {
  try { track.custom('page_not_found', { path: res?.path || '' }) } catch { /* 上报失败不影响兜底 */ }
  uni.reLaunch({ url: '/pages/index/index' })
})
</script>

<template>
  <!-- 全局根，无需内容；页面由路由渲染 -->
</template>

<style lang="scss">
/* 全局盒模型：与小程序/真机的 view 默认 border-box 一致，避免 H5 预览下 padding 撑宽溢出 */
view,
scroll-view,
swiper,
swiper-item,
text,
navigator,
button,
input,
textarea,
image,
.container,
.card,
.tip {
  box-sizing: border-box;
}

/* 安卓微信 X5 内核绘制顺序 bug 防御（董事长 2026-07-11 真机反馈：加入/管理等按钮"红块无字·文字像被底色盖住"）：
   带背景+圆角的容器在 X5 上可能把子 text 绘制到背景层之下。全局把 text 提升为独立层级；
   position:relative 不改变布局，z-index:1 在各自 stacking context 内不会盖过弹层/遮罩（其 z-index 均 ≥50）。 */
/* #ifdef H5 */
uni-text,
uni-view > span {
  position: relative;
  z-index: 1;
}
/* #endif */

/* 全局基础样式：宣纸底 + 思源字体 */
page {
  background-color: var(--bg-paper, #faf8f5);
  color: var(--text-ink, #2c2c2c);
  font-family: var(--font-sans, 'Noto Sans SC', 'PingFang SC', sans-serif);
  font-size: var(--fs-body, 30rpx); /* 全局基准=body 30rpx（《全平台体验标准 V1.0》字体阶梯） */
  line-height: 1.6;
}

/* #ifdef H5 */
/* H5 保留滚动能力但隐藏浏览器原生粗滚动条。
   移动端使用底部导航和页面滚动反馈，原生滚动条会挤占内容宽度并破坏沉浸感；
   Firefox 与 Chromium/WebView 分别处理，滚轮、触摸和键盘滚动均不受影响。 */
html,
body,
uni-page-body,
uni-scroll-view,
uni-scroll-view .uni-scroll-view {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar,
uni-page-body::-webkit-scrollbar,
uni-scroll-view::-webkit-scrollbar,
uni-scroll-view .uni-scroll-view::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

/* 桌面浏览器打开 H5 时限宽居中（移动优先产品的业界标准壳）。
   关键技巧：给 uni-app 容器加 transform 使其成为 fixed 子元素的包含块——
   底部导航/悬浮球/弹窗等 position:fixed 元素随之被约束在壳内，无需逐组件适配。
   小程序/App 端不受影响（条件编译）。真响应式(卡片重排/侧栏导航)在 backlog。 */
@media screen and (min-width: 600px) {
  body {
    background: #ece7dc;
  }
  uni-app {
    position: relative;
    max-width: 480px;
    min-height: 100vh;
    margin: 0 auto;
    transform: translateZ(0);
    box-shadow: 0 0 48px rgba(60, 40, 20, 0.16);
    background-color: var(--bg-paper, #faf8f5);
  }
}
/* #endif */
</style>
