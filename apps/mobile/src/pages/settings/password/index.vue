<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">password</text>
      <text class="v0-route">V0: settings/password</text>
    </view>
          <view class="min-h-screen bg-background flex flex-col">
            <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
              <view class="flex items-center h-12 px-4">
                <BackButton fallbackPath="/settings" />
                <text class="flex-1 text-center font-semibold text-foreground pr-9">修改密码</text>
              </view>
            </view>
    
            <view class="flex-1 flex flex-col items-center justify-center px-6">
              <view class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                <Check class="w-10 h-10 text-green-500" />
              </view>
              <text class="text-xl font-semibold text-foreground mb-2">密码修改成功</text>
              <text class="text-sm text-muted-foreground text-center mb-8">
                请重新登录以确保账号安全
              </text>
              <Link
                href="/login"
                class="w-full max-w-xs py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl text-center hover:bg-primary/90 transition-colors"
              >
                重新登录
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