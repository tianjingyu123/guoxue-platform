<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">提现</text>
      <text class="v0-route">V0: withdraw</text>
    </view>
          <view class="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <view class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 class="w-10 h-10 text-green-500" />
            </view>
            <text class="text-xl font-bold text-foreground mb-2">提现申请已提交</text>
            <text class="text-sm text-muted-foreground text-center mb-2">
              提现金额：¥{{ numAmount.toFixed(2) }}
            </text>
            <text class="text-xs text-muted-foreground text-center mb-8">
              预计1-3个工作日内到账，请注意查收
            </text>
            
            <view class="flex gap-3 w-full max-w-xs">
              <Link 
                href="/earnings"
                class="flex-1 py-3 text-center text-sm font-medium text-foreground bg-secondary rounded-xl"
              >
                返回收益
              </Link>
              <Link 
                href="/"
                class="flex-1 py-3 text-center text-sm font-medium text-primary-foreground bg-primary rounded-xl"
              >
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
const withdrawMethods = [

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