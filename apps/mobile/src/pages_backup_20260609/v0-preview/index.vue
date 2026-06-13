<template>
  <view class="v0-container">
    <!-- H5: 用 iframe 嵌入 V0 Next.js 完整版 -->
    <!-- #ifdef H5 -->
    <iframe
      ref="v0Frame"
      :src="v0Url"
      class="v0-iframe"
      frameborder="0"
      @load="onFrameLoad"
    />
    <!-- #endif -->

    <!-- 小程序: 用 web-view 嵌入 -->
    <!-- #ifdef MP-WEIXIN -->
    <web-view
      :src="v0Url"
      @message="onWebMessage"
    />
    <!-- #endif -->

    <!-- 加载中遮罩 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-card">
        <text class="loading-icon">🏮</text>
        <text class="loading-title">热卜国学</text>
        <text class="loading-sub">V0 完整版加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)
const v0Url = ref('http://localhost:5175/')

onMounted(() => {
  // 3秒后自动隐藏加载遮罩
  setTimeout(() => { loading.value = false }, 3000)
})

function onFrameLoad() {
  loading.value = false
}

function onWebMessage(e: any) {
  // 处理来自 V0 网页的消息
  console.log('V0 message:', e.detail)
}

// 暴露给 V0 页面调用的导航方法
function navigateToV0(path: string) {
  v0Url.value = `http://localhost:5175${path}`
  loading.value = true
}
</script>

<style scoped>
.v0-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: #FAF8F5;
}

.v0-iframe {
  width: 100%;
  height: 100%;
  border: none;
  position: absolute;
  top: 0;
  left: 0;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  transition: opacity 0.5s;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.loading-icon {
  font-size: 80rpx;
}

.loading-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #C41E3A;
  font-family: 'Noto Serif SC', serif;
}

.loading-sub {
  font-size: 24rpx;
  color: #999;
}
</style>
