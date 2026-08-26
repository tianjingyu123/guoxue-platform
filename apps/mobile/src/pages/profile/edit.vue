<template>
  <view class="redirect-page">
    <view class="redirect-spinner" />
    <text class="redirect-text">正在打开资料编辑…</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { getToken } from '@/utils/storage'
import { redirectTo, reLaunch } from '@/utils/router'

/**
 * 旧资料编辑路由兼容层。
 * 真正的资料读取、头像上传与保存统一由 /pkg-mine/edit-profile/index 承担，
 * 避免旧书签或历史外链再次进入已废弃的本地假表单。
 */
onLoad(() => {
  if (!getToken()) {
    reLaunch('/login')
    return
  }
  redirectTo('/mine/edit-profile')
})
</script>

<style scoped>
.redirect-page {
  min-height: 100vh;
  padding-top: max(var(--status-bar-height, 0px), env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  background: #faf8f5;
  box-sizing: border-box;
}
.redirect-spinner {
  width: 52rpx;
  height: 52rpx;
  border: 5rpx solid #eadfd5;
  border-top-color: #c41e3a;
  border-radius: 50%;
  animation: redirect-spin 0.8s linear infinite;
}
.redirect-text {
  color: #786f66;
  font-size: 28rpx;
}
@keyframes redirect-spin {
  to { transform: rotate(360deg); }
}
</style>
