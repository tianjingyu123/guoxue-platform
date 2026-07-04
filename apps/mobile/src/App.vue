<script setup lang="ts">
import { onLaunch, onShow, onHide, onError } from '@dcloudio/uni-app'
import { track } from '@/composables/useTrack'
import { captureRefFromQuery, captureRefFromUrl } from '@/utils/referral'
import { hydrateBrandConfig } from '@/lib/brand'

/** 从跳转参数中取出页面路径（去 query），用于全局 page_view 埋点 */
function pickUrl(args: string | { url?: string }): string {
  const url = typeof args === 'string' ? args : args?.url
  return url ? String(url).split('?')[0] : ''
}

onLaunch((options?: { query?: Record<string, unknown> }) => {
  // 品牌配置水合（租-T0）：从后端拉取站名/标语/主色等，失败静默用内置默认值
  hydrateBrandConfig()
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

/* 全局基础样式：宣纸底 + 思源字体 */
page {
  background-color: var(--bg-paper, #faf8f5);
  color: var(--text-ink, #2c2c2c);
  font-family: var(--font-sans, 'Noto Sans SC', 'PingFang SC', sans-serif);
  font-size: 28rpx;
  line-height: 1.6;
}

/* #ifdef H5 */
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
