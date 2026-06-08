<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">搜索</text>
      <text class="v0-route">V0: search</text>
    </view>
            <view class="space-y-4">
              <!--   -->
              <view>
                <view class="flex items-center justify-between mb-2">
                  <text class="text-sm font-medium text-foreground">圈子</text>
                  <view class="v0-btn" class="text-xs text-primary">查看全部</view>
                </view>
                <view class="space-y-2">
                  {{ mockResults.circles.slice(0, 2).map(renderCircleItem) }}
                </view>
              </view>
              <!--   -->
              <view>
                <view class="flex items-center justify-between mb-2">
                  <text class="text-sm font-medium text-foreground">课程</text>
                  <view class="v0-btn" class="text-xs text-primary">查看全部</view>
                </view>
                <view class="space-y-2">
                  {{ mockResults.courses.slice(0, 2).map(renderCourseItem) }}
                </view>
              </view>
              <!--   -->
              <view>
                <view class="flex items-center justify-between mb-2">
                  <text class="text-sm font-medium text-foreground">商品</text>
                  <view class="v0-btn" class="text-xs text-primary">查看全部</view>
                </view>
                <view class="space-y-2">
                  {{ mockResults.products.slice(0, 2).map(renderProductItem) }}
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
const hotSearches = [
const searchSuggestions: Record<string, { keyword: string; count: number }[]> = {
const mockResults = {
const resultTabs = [
    const resultMap: Record<string, JSX.Element[]> = {

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