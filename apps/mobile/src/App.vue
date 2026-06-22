<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'

onLaunch(() => {
  // 应用启动：可在此做登录态检查、版本检查等
})
onShow(() => {})
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

/* 响应式：H5 大屏居中，限制最大宽度防止卡片等比无限放大 */
@media screen and (min-width: 768px) {
  body, uni-app, #app {
    max-width: 450px !important;
    margin: 0 auto !important;
    box-shadow: 0 0 60rpx rgba(0, 0, 0, 0.08);
    border-left: 1px solid var(--line, #e8e0d5);
    border-right: 1px solid var(--line, #e8e0d5);
    overflow-x: hidden;
  }
  html {
    background: var(--bg-paper, #faf8f5);
  }
}
</style>
