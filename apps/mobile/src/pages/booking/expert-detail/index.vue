<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">预约</text>
      <text class="v0-route">V0: booking/[expertId]</text>
    </view>
          <view class="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <view class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
              <Check class="w-10 h-10 text-green-500" />
            </view>
            <text class="text-xl font-bold text-foreground mb-2">预约成功</text>
            <text class="text-sm text-muted-foreground text-center mb-6">
              已成功预约{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }} 与{{ expertData.name }}的{callType === "audio" ? "语音" : "视频"}连麦
            </text>
            <Card class="w-full max-w-sm p-4 mb-6">
              <view class="space-y-3 text-sm">
                <view class="flex justify-between">
                  <text class="text-muted-foreground">预约时间</text>
                  <text class="text-foreground">{{ dates[selectedDateIndex].month }}月{{ dates[selectedDateIndex].dayOfMonth }}日 {{ selectedSlot }}</text>
                </view>
                <view class="flex justify-between">
                  <text class="text-muted-foreground">连麦时长</text>
                  <text class="text-foreground">{{ duration }}分钟</text>
                </view>
                <view class="flex justify-between">
                  <text class="text-muted-foreground">预计费用</text>
                  <text class="text-primary font-medium">{{ totalPrice }}国学币</text>
                </view>
              </view>
            </Card>
            <view class="flex gap-3 w-full max-w-sm">
              <Link href="/reservations" class="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl text-center">
                查看预约
              </Link>
              <Link href="/" class="flex-1 py-3 bg-secondary text-foreground text-sm font-medium rounded-xl text-center">
                返回首页
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
const expertData = {
  const dates = []
  const slots = []
  const groupedSlots = {

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