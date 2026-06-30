<script setup lang="ts">
/**
 * 全局断网提示条。
 * 病灶：全站零 onNetworkStatusChange，断网无任何提示。
 * 注意：uni-app 的 App.vue 无视图层，全局悬浮组件需在主要枢纽页（首页/圈子/发现/我的等）引入本组件。
 *
 * 用法：在 tab 枢纽页模板顶部放 <app-network-bar />，逻辑自包含。
 */
import { ref, onMounted, onUnmounted } from 'vue'

const offline = ref(false)
let recoverTimer: ReturnType<typeof setTimeout> | null = null

function handleStatus(res: { isConnected: boolean }) {
  if (!res.isConnected) {
    offline.value = true
    if (recoverTimer) { clearTimeout(recoverTimer); recoverTimer = null }
  } else if (offline.value) {
    // 网络恢复：短暂展示「已恢复」后自动隐藏
    if (recoverTimer) clearTimeout(recoverTimer)
    recoverTimer = setTimeout(() => { offline.value = false }, 2000)
  }
}

onMounted(() => {
  uni.getNetworkType({
    success: (r) => { offline.value = r.networkType === 'none' },
  })
  uni.onNetworkStatusChange(handleStatus)
})
onUnmounted(() => {
  uni.offNetworkStatusChange?.(handleStatus)
  if (recoverTimer) clearTimeout(recoverTimer)
})
</script>

<template>
  <view v-if="offline" class="net-bar">
    <text class="net-bar__text">网络连接已断开，请检查网络设置</text>
  </view>
</template>

<style scoped lang="scss">
.net-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: $z-toast;
  @include flex-center;
  padding: calc(env(safe-area-inset-top) + 12rpx) $space-md 12rpx;
  background: var(--danger);
}
.net-bar__text {
  font-size: $font-sm;
  color: #fff;
}
</style>
