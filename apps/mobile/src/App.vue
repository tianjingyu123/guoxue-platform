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

/* V0响应式：大屏展开布局，不限制宽度 */
@media screen and (min-width: 768px) {
  html {
    background: var(--bg-paper, #faf8f5);
  }
}
@media screen and (min-width: 1024px) {
  /* PC端：侧边栏占位 + 顶部栏占位 + 内容区居中 */
  body, uni-app, #app {
    /* 左侧预留给侧边导航的空间 */
    padding-left: 56px;
  }
}
</style>
