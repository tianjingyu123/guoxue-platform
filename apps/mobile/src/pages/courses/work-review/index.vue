<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">课程</text>
      <text class="v0-route">V0: courses/work-review</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5]">
          <view class="h-14 bg-white border-b border-[#E8E3DB]" />
          <view class="p-4 space-y-4">
            {[1,2,3].map(i => (
              <view key={i} class="bg-white rounded-xl p-4 animate-pulse">
                <view class="flex items-center gap-3 mb-3">
                  <view class="w-10 h-10 rounded-full bg-[#F2EFEA]" />
                  <view class="flex-1">
                    <view class="h-4 bg-[#F2EFEA] rounded w-20 mb-2" />
                    <view class="h-3 bg-[#F2EFEA] rounded w-32" />
                  </view>
                </view>
                <view class="h-16 bg-[#F2EFEA] rounded" />
              </view>
            ))}
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
const commentTemplates = [
const quickScores = [100, 90, 80, 70, 60]
const mockSubmissions = [

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