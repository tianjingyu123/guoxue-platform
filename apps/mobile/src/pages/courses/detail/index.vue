<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">课程</text>
      <text class="v0-route">V0: courses/[id]</text>
    </view>
        <view class="min-h-screen bg-[#FAF8F5] animate-pulse">
          <view class="h-56 bg-[#E8E3DB]" />
          <view class="px-4 -mt-6 relative z-10">
            <view class="bg-white rounded-t-[20px] p-4">
              <view class="h-6 bg-[#E8E3DB] rounded w-3/4 mb-3" />
              <view class="h-4 bg-[#E8E3DB] rounded w-1/2 mb-4" />
              <view class="flex gap-4">
                <view class="h-10 bg-[#E8E3DB] rounded w-20" />
                <view class="h-10 bg-[#E8E3DB] rounded w-20" />
              </view>
            </view>
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
const mockCourse: CourseDetail = {
const mockChapters: Chapter[] = [
const mockReviews: CourseReview[] = [

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