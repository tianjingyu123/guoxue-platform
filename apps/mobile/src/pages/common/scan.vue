<template>
  <view class="page">
    <view class="header">
      <text
        class="back-btn"
        @click="goBack"
      >
        ‹
      </text>
      <text class="header-title">
        扫码
      </text>
      <view style="width:60rpx" />
    </view>

    <view class="scan-area">
      <view class="scan-viewport">
        <view class="scan-frame">
          <view class="corner tl" />
          <view class="corner tr" />
          <view class="corner bl" />
          <view class="corner br" />
          <view class="scan-line" />
        </view>
        <text class="scan-tip">
          将二维码/条形码放入框内，即可自动扫描
        </text>
      </view>

      <view class="actions">
        <view
          class="action-btn"
          @click="fromAlbum"
        >
          <text class="action-icon">
            🖼
          </text>
          <text class="action-label">
            相册
          </text>
        </view>
        <view
          class="action-btn"
          @click="manualInput"
        >
          <text class="action-icon">
            ⌨️
          </text>
          <text class="action-label">
            手动输入
          </text>
        </view>
        <view
          class="action-btn"
          @click="toggleLight"
        >
          <text class="action-icon">
            {{ lightOn ? '💡' : '🔦' }}
          </text>
          <text class="action-label">
            {{ lightOn ? '关闭' : '开灯' }}
          </text>
        </view>
      </view>
    </view>

    <view
      class="history-section"
      @click="goHistory"
    >
      <text class="hs-icon">
        🕐
      </text>
      <text class="hs-text">
        扫码历史
      </text>
      <text class="hs-arrow">
        ›
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const lightOn = ref(false)

onMounted(() => {
  // 自动开启扫码
  setTimeout(() => {
    uni.scanCode({
      success: (res) => {
        handleResult(res.result)
      },
      fail: () => {
        // 用户拒绝权限等
      }
    })
  }, 500)
})

function fromAlbum() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album'],
    success: (res) => {
      uni.showToast({ title: '识别中...', icon: 'none' })
      // In real app, would use OCR library
      setTimeout(() => {
        uni.showToast({ title: '未识别到二维码', icon: 'none' })
      }, 1000)
    }
  })
}

function manualInput() {
  uni.showModal({
    title: '手动输入',
    content: '请输入编码内容',
    editable: true,
    success: (res) => {
      if (res.confirm && res.content) {
        handleResult(res.content)
      }
    }
  })
}

function toggleLight() {
  lightOn.value = !lightOn.value
  uni.showToast({ title: lightOn.value ? '闪光灯已开启' : '闪光灯已关闭', icon: 'none' })
}

function handleResult(result: string) {
  if (result.startsWith('http')) {
    uni.navigateTo({ url: `/pages/common/legal-doc?url=${encodeURIComponent(result)}` })
  } else if (/^\d+$/.test(result)) {
    uni.navigateTo({ url: `/pages/detail/detail?id=${result}` })
  } else {
    uni.showToast({ title: result, icon: 'none' })
  }
}

function goHistory() { uni.showToast({ title: '扫码历史', icon: 'none' }) }
function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #000; min-height: 100vh; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; position: absolute; top: 0; left: 0; right: 0; z-index: 10; }
.back-btn { font-size: 40rpx; color: #fff; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #fff; }
.scan-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.scan-viewport { text-align: center; }
.scan-frame { width: 480rpx; height: 480rpx; position: relative; margin: 0 auto; }
.corner { position: absolute; width: 40rpx; height: 40rpx; border-color: #C41E3A; border-style: solid; }
.tl { top: 0; left: 0; border-width: 6rpx 0 0 6rpx; }
.tr { top: 0; right: 0; border-width: 6rpx 6rpx 0 0; }
.bl { bottom: 0; left: 0; border-width: 0 0 6rpx 6rpx; }
.br { bottom: 0; right: 0; border-width: 0 6rpx 6rpx 0; }
.scan-line { position: absolute; left: 40rpx; right: 40rpx; height: 4rpx; background: #C41E3A; top: 40rpx; animation: scanMove 2s ease-in-out infinite; box-shadow: 0 0 20rpx rgba(196,30,58,0.5); }
@keyframes scanMove { 0%,100% { top: 40rpx; } 50% { top: 400rpx; } }
.scan-tip { font-size: 26rpx; color: rgba(255,255,255,0.6); margin-top: 32rpx; display: block; }
.actions { display: flex; gap: 48rpx; margin-top: 60rpx; }
.action-btn { display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.action-icon { width: 88rpx; height: 88rpx; border-radius: 50%; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.action-label { font-size: 22rpx; color: rgba(255,255,255,0.6); }
.history-section { display: flex; align-items: center; gap: 12rpx; padding: 24rpx; margin: 24rpx; background: rgba(255,255,255,0.08); border-radius: 16rpx; }
.hs-icon { font-size: 28rpx; }
.hs-text { flex: 1; font-size: 26rpx; color: rgba(255,255,255,0.7); }
.hs-arrow { font-size: 32rpx; color: rgba(255,255,255,0.4); }
</style>
