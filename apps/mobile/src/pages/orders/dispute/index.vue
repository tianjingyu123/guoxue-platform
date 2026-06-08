<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">订单</text>
      <text class="v0-route">V0: orders/dispute</text>
    </view>
          <view class="min-h-screen bg-[#FAF8F5]">
            <view class="sticky top-0 z-10 bg-white border-b border-[#E8E3DB] px-4 py-3 flex items-center gap-3">
              <view class="w-6 h-6 bg-gray-200 rounded animate-pulse" />
              <view class="w-24 h-5 bg-gray-200 rounded animate-pulse" />
            </view>
            <view class="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <view key={i} class="bg-white rounded-2xl p-4 animate-pulse">
                  <view class="h-24 bg-gray-200 rounded" />
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
const disputeTypes = [
const mockOrder = {
const mockMyDisputes: DisputeListItem[] = [
    const newErrors: Record<string, string> = {}
      const data: DisputeApplication = {
    const map: Record<string, { label: string; color: string; icon: typeof Clock }> = {

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