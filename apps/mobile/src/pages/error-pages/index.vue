<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">error-pages</text>
      <text class="v0-route">V0: error-pages</text>
    </view>
        <view class="min-h-screen bg-background flex flex-col items-center justify-center px-6">
          <!--   -->
          <view class={`w-24 h-24 rounded-full ${config.iconBg} flex items-center justify-center mb-6`}>
            <Icon class={`w-12 h-12 ${config.iconColor}`} />
          </view>
    
          <!--   -->
          <text class="text-xl font-semibold text-foreground mb-2">{{ config.title }}</text>
          <text class="text-sm text-muted-foreground text-center mb-8 max-w-xs">{{ config.description }}</text>
    
          <!--   -->
          <view class="flex flex-col gap-3 w-full max-w-xs">
            <Button 
              @click={{ onRetry }}
              class="w-full"
            >
              {type === "network" || type === "timeout" || type === "server" ? (
                <RefreshCw class="w-4 h-4 mr-2" />
              ) : type === "notfound" ? (
                <Home class="w-4 h-4 mr-2" />
              ) : null}
              {{ config.primaryAction }}
            </Button>
            <Button 
              variant="outline"
              @click={{ onSecondary }}
              class="w-full"
            >
              {{ config.secondaryAction }}
            </Button>
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
const errorConfigs = {
  const types: ErrorType[] = ["network", "server", "notfound", "forbidden", "timeout"]

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