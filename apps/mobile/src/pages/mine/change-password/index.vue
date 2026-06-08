<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">我的</text>
      <text class="v0-route">V0: mine/change-password</text>
    </view>
        <view class="space-y-1.5">
          <text class="text-sm font-medium text-foreground">{{ label }}</text>
          <view
            class={`flex items-center gap-2 px-4 h-12 rounded-xl border bg-background transition-colors ${
              error ? 'border-red-500' : 'border-border focus-within:border-primary'
            }`}
          >
            <Lock class="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type={show ? 'text' : 'password'}
              value={{ value }}
              @change={(e) => onChange(e.target.value)}
              placeholder={{ placeholder }}
              autoComplete="new-password"
              class="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <view class="v0-btn" type="button" @click={{ onToggleShow }} class="text-muted-foreground hover:text-foreground transition-colors">
              <template v-if="show">
    EyeOff class="w-4 h-4" /> : <Eye class="w-4 h-4" />}
            </view>
          </view>
          <template v-if="error">
    text class="text-xs text-red-500">{{ error }}</text>}
        </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'

const loading = ref(true)
const error = ref<string | null>(null)

// V0 原始数据
const rules: Rule[] = [
    const errs: Record<string, string> = {}

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