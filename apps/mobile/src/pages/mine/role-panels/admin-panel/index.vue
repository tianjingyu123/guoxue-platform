<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/role-panels/admin-panel</text>
    </view>
        <view class="space-y-6 p-4">
          <!--   -->
          <view class="flex items-center gap-3">
            <Skeleton class="h-12 w-12 rounded-full" />
            <view class="space-y-2">
              <Skeleton class="h-5 w-24" />
              <Skeleton class="h-4 w-32" />
            </view>
          </view>
          
          <!--   -->
          <view class="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} class="h-24 rounded-xl" />
            ))}
          </view>
          
          <!--   -->
          <view class="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} class="h-20 rounded-xl" />
            ))}
          </view>
          
          <!--   -->
          <view class="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} class="h-20 rounded-xl" />
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
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {

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