<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">排盘工具</text>
      <text class="v0-route">V0: paipan/yangpan/result</text>
    </view>
        <view class="bg-card border-t border-border shadow-lg">
          <view class="p-4 space-y-3">
            <view class="flex items-center justify-between">
              <text class="text-lg font-bold text-primary">{{ PALACE_NAMES[palace] }}</text>
              <view class="v0-btn" @click={{ onClose }} class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-full transition-colors"><X class="w-5 h-5" /></view>
            </view>
            <view class="text-sm text-foreground leading-relaxed bg-secondary/30 rounded-lg p-3">
              <text class="text-primary font-semibold">{{ PALACE_NAMES[palace] }}</text>：
              八神{{ d.bashen }}，九星{{ d.jiuxing }}，八门{{ d.bamen }}，天盘{{ d.diGan }}，地盘{{ d.tianGan }}。
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
const wuxingColors: Record<string, string> = {
const PALACE_NAMES: Record<number, string> = {
const PALACE_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6]
const daYunData = [
const liuNianData = [
  const panshi = yangpanData?.panshi || `${panMethod === "zhuan" ? "转盘" : "飞盘"} ${userInput.jigongMethod === "kungong" ? "坤宫" : "阳艮阴坤"} ${userInput.startMethod === "chaibu" ? "拆补" : userInput.startMethod === "maoshan" ? "茅山" : "置闰"}`

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