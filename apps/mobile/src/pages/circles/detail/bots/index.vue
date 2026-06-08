<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">AI助手</text>
      <text class="v0-route">V0: circles/[id]/bots</text>
    </view>
        <view class="bg-white rounded-2xl p-4 animate-pulse">
          <view class="flex items-start gap-3">
            <view class="w-14 h-14 rounded-xl bg-[#E8E3DB]" />
            <view class="flex-1">
              <view class="h-4 bg-[#E8E3DB] rounded w-24 mb-2" />
              <view class="h-3 bg-[#E8E3DB] rounded w-full mb-1" />
              <view class="h-3 bg-[#E8E3DB] rounded w-3/4" />
            </view>
          </view>
          <view class="flex items-center justify-between mt-3 pt-3 border-t border-[#E8E3DB]">
            <view class="h-3 bg-[#E8E3DB] rounded w-20" />
            <view class="h-8 bg-[#E8E3DB] rounded-full w-16" />
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
const mockCircle: CircleDetail = {
const mockBots: CircleBot[] = [

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