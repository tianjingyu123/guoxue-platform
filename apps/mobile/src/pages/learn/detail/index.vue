<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">learn</text>
      <text class="v0-route">V0: learn/[id]</text>
    </view>
        <view class="flex items-center justify-center">
          <view class="w-12 h-12 animate-spin">
            <svg viewBox="0 0 100 100" class="w-full h-full">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" class="text-border" />
              <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2" class="fill-primary" />
              <circle cx="50" cy="26" r="6" class="fill-background" />
              <circle cx="50" cy="74" r="6" class="fill-primary" />
            </svg>
          </view>
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const courseData = {
const recommendedCourses = [
const recommendedCircles = [
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1

async function fetchData() {
  loading.value = true
  try { loading.value = false } catch (e: any) { error.value = e.message }
}

onMounted(() => fetchData())
onPullDownRefresh(() => fetchData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}
.v0-header {
  padding: 24rpx 32rpx;
  background: linear-gradient(135deg, #C41E3A, #8B0000);
  margin-bottom: 24rpx;
}
.v0-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
}
.v0-route {
  font-size: 20rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 4rpx;
  display: block;
}
.v0-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 32rpx;
  border-radius: 12rpx;
  background: #C41E3A;
  color: #FFFFFF;
  font-size: 28rpx;
}
.v0-hr {
  height: 1px;
  background: #E8E0D5;
  margin: 24rpx 0;
}
</style>