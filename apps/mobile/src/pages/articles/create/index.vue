<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">文章</text>
      <text class="v0-route">V0: articles/create</text>
    </view>
          <view class="min-h-screen bg-background flex flex-col">
            <view class="sticky top-0 z-50 bg-white border-b border-muted">
              <view class="flex items-center justify-between px-4 h-12">
                <view class="v0-btn" @click={() => router.back()} class="p-2 -ml-2">
                  <ArrowLeft class="w-5 h-5 text-foreground" />
                </view>
                <text class="font-medium text-foreground">写文章</text>
                <view class="w-9" />
              </view>
            </view>
            <view class="flex-1 flex flex-col items-center justify-center p-6">
              <Crown class="w-16 h-16 text-gold mb-4" />
              <text class="text-lg font-semibold text-foreground mb-2">暂无发布权限</text>
              <text class="text-sm text-muted-foreground text-center mb-6">
                根据平台规则，只有圈主和嘉宾才能发布文章。<text>
    </text> />
                您可以创建自己的圈子成为圈主。
              </text>
              <Link 
                href="/circles/create"
                class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium"
              >
                <Plus class="w-5 h-5" />
                创建圈子
              </Link>
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
const mockManagedCircles = [
const mockProducts = [
const mockCourses = [
const mockActivities = [
  const mockAgents = [

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