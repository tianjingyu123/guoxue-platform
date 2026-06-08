<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">购物车</text>
      <text class="v0-route">V0: cart</text>
    </view>
        <view class="space-y-4 p-4">
          {[1, 2].map((group) => (
            <Card key={group} class="p-4 bg-card animate-pulse">
              <view class="flex items-center gap-3 mb-4">
                <view class="w-6 h-6 rounded-full bg-secondary" />
                <view class="h-4 w-24 bg-secondary rounded" />
              </view>
              {[1, 2].map((item) => (
                <view key={item} class="flex gap-3 py-3 border-t border-border/50">
                  <view class="w-5 h-5 rounded bg-secondary" />
                  <view class="w-20 h-20 rounded-lg bg-secondary" />
                  <view class="flex-1 space-y-2">
                    <view class="h-4 w-3/4 bg-secondary rounded" />
                    <view class="h-3 w-1/2 bg-secondary rounded" />
                    <view class="h-4 w-16 bg-secondary rounded" />
                  </view>
                </view>
              ))}
            </Card>
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
const cartGroups = [
const invalidItems = [
const recommendProducts = [

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