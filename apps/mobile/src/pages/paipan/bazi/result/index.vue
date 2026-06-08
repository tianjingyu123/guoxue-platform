<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">八字排盘</text>
      <text class="v0-route">V0: paipan/bazi/result</text>
    </view>
        <view class="flex items-center justify-between px-3 py-2">
          <view class="flex items-center gap-1.5">
            <view class="w-0.5 h-3.5 bg-primary rounded-full" />
            <text class="text-sm font-semibold text-foreground">{{ children }}</text>
          </view>
          {{ extra }}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const wuxingColors: Record<string, string> = {
const wuxingBgColors: Record<string, string> = {
const baziData = {
const classics = [
const COLS = ["year", "month", "day", "hour"] as const
const COL_NAMES = ["年柱", "月柱", "日柱", "时柱"]
const classicsContent: Record<string, { title: string; original: string; translation: string }> = {

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