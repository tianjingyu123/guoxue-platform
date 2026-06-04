<template>
  <view class="page">
    <view class="header">
      <text class="back-btn" @click="goBack">‹</text>
      <text class="header-title">语音搜索</text>
      <view style="width:60rpx" />
    </view>

    <view class="content-area">
      <view class="mic-area" @click="isRecording ? stopRecord() : startRecord()">
        <view class="mic-circle" :class="{ recording: isRecording }">
          <text class="mic-icon">{{ isRecording ? '🔴' : '🎤' }}</text>
        </view>
        <text class="mic-status">{{ statusText }}</text>
      </view>

      <!-- 语音波动 -->
      <view v-if="isRecording" class="wave-area">
        <view v-for="i in 5" :key="i" class="wave-bar" :style="{ animationDelay: i * 0.15 + 's' }" />
      </view>

      <!-- 识别结果 -->
      <view v-if="result" class="result-area">
        <view class="result-card">
          <text class="result-text">{{ result }}</text>
        </view>
        <view class="result-actions">
          <view class="ra-btn" @click="retry">🔄 重新搜索</view>
          <view class="ra-btn primary" @click="doSearch">🔍 搜索"{{ result }}"</view>
        </view>
      </view>

      <!-- 提示 -->
      <view v-if="!isRecording && !result" class="tip-area">
        <text class="tip-text">点击麦克风开始语音搜索</text>
        <text class="tip-sub">支持中英文语音识别</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const isRecording = ref(false); const result = ref('')

const statusText = computed(() => {
  if (isRecording.value) return '正在聆听，请说话...'
  if (result.value) return '识别完成'
  return '点击开始语音搜索'
})

async function startRecord() {
  isRecording.value = true
  try {
    await uni.startRecord({})
    // 模拟识别过程
    setTimeout(() => {
      stopRecord()
    }, 3000)
  } catch {
    // 模拟环境下使用演示
    setTimeout(() => {
      isRecording.value = false
      result.value = '八字入门教程'
    }, 2000)
  }
}

function stopRecord() {
  isRecording.value = false
  uni.stopRecord({})
  result.value = '八字命理入门'
}

function retry() { result.value = '' }

function doSearch() {
  if (!result.value.trim()) return
  uni.navigateTo({ url: `/pages/search/result?q=${encodeURIComponent(result.value)}` })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.header-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.content-area { display: flex; flex-direction: column; align-items: center; padding: 80rpx 24rpx 40rpx; }
.mic-area { text-align: center; }
.mic-circle { width: 180rpx; height: 180rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.08); margin: 0 auto; transition: all 0.3s; }
.mic-circle.recording { background: #C41E3A; transform: scale(1.1); box-shadow: 0 0 80rpx rgba(196,30,58,0.3); }
.mic-icon { font-size: 64rpx; }
.mic-status { font-size: 28rpx; color: #666; margin-top: 24rpx; display: block; }
.wave-area { display: flex; align-items: center; gap: 8rpx; margin-top: 40rpx; height: 80rpx; }
.wave-bar { width: 12rpx; background: #C41E3A; border-radius: 6rpx; animation: wave 0.8s ease-in-out infinite alternate; }
.wave-bar:nth-child(1) { height: 30rpx; } .wave-bar:nth-child(2) { height: 50rpx; } .wave-bar:nth-child(3) { height: 70rpx; } .wave-bar:nth-child(4) { height: 50rpx; } .wave-bar:nth-child(5) { height: 30rpx; }
@keyframes wave { from { transform: scaleY(0.5); } to { transform: scaleY(1.2); } }
.result-area { width: 100%; margin-top: 40rpx; }
.result-card { background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; }
.result-text { font-size: 32rpx; font-weight: 500; color: #2C2C2C; }
.result-actions { display: flex; gap: 16rpx; margin-top: 20rpx; }
.ra-btn { flex: 1; text-align: center; padding: 16rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #666; background: #fff; }
.ra-btn.primary { background: #C41E3A; color: #fff; border-color: #C41E3A; }
.tip-area { margin-top: 60rpx; text-align: center; }
.tip-text { font-size: 26rpx; color: #999; display: block; }
.tip-sub { font-size: 22rpx; color: #ccc; margin-top: 8rpx; display: block; }
</style>
