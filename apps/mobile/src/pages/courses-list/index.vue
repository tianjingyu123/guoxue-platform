<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">courses-list</text>
      <text class="v0-route">V0: courses-list</text>
    </view>
        <view class="grid grid-cols-2 gap-2.5">
          {[1,2,3,4,5,6].map(i => (
            <view key={i} class="animate-pulse">
              <view class="bg-white rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <view class="aspect-[3/4] bg-[#F2EFEA]" />
                <view class="p-2.5 space-y-2">
                  <view class="h-4 bg-[#F2EFEA] rounded w-full" />
                  <view class="h-3 bg-[#F2EFEA] rounded w-2/3" />
                  <view class="h-4 bg-[#F2EFEA] rounded w-1/3" />
                </view>
              </view>
            </view>
          ))}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const defaultCategories = [
const sortOptions = [
const recommendedCourses = [
const flashSaleCourses = [
const mockCourses = [
      const newCountdowns: { [key: string]: { h: number, m: number, s: number } } = {}
      const matchSearch = searchQuery === "" || course.title.includes(searchQuery) || course.instructor.name.includes(searchQuery)

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