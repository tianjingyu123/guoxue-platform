<template>
  <view class="page">
    <view class="recorder" @click="startRecord">
      <view class="mic-icon" :class="{ recording: isRecording }">
        <text>🎤</text>
      </view>
      <text class="rec-text">{{ isRecording ? '正在聆听...' : '点击开始语音搜索' }}</text>
    </view>
    <view v-if="result" class="result">
      <text class="transcribed">{{ result }}</text>
      <button class="btn-retry" @click="retry">重新搜索</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isRecording = ref(false)
const result = ref('')

async function startRecord() {
  isRecording.value = true
  uni.showToast({ title: '语音搜索（演示）', icon: 'none' })
  setTimeout(() => {
    isRecording.value = false
    result.value = '演示语音识别结果'
  }, 2000)
}
function retry() { result.value = '' }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.recorder { text-align: center; }
.mic-icon { width: 100px; height: 100px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 0 auto; }
.mic-icon.recording { background: #C41E3A; animation: pulse 1.5s infinite; }
.rec-text { font-size: 15px; color: #666; margin-top: 16px; display: block; }
.result { text-align: center; padding: 20px; }
.transcribed { font-size: 18px; display: block; }
.btn-retry { margin-top: 16px; padding: 8px 24px; background: #F5F0E8; border-radius: 20px; font-size: 14px; border: none; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
</style>
