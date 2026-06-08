<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">upgrade</text>
      <text class="v0-route">V0: notices/upgrade</text>
    </view>
        <view class="flex items-start gap-3 py-2">
          <view class={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", colors.bg, colors.text)}>
            {{ iconMap[item.type] }}
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-medium text-foreground">{{ item.title }}</text>
            {item.description && (
              <text class="text-xs text-muted-foreground mt-0.5">{{ item.description }}</text>
            )}
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
const iconMap: Record<UpgradeItemType, React.ReactNode> = {
const colorMap: Record<UpgradeItemType, { text: string; bg: string }> = {

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