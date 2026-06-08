<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">verification</text>
      <text class="v0-route">V0: verification</text>
    </view>
          <view class="min-h-screen bg-background">
            <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
      <BackButton fallbackPath="/settings" />
      <text class="font-semibold text-base">实名认证</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="pt-16 pb-8 px-4">
              <view class="flex flex-col items-center py-12">
                <view class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 class="w-10 h-10 text-green-500" />
                </view>
                <text class="text-xl font-semibold text-foreground mb-2">已完成实名认证</text>
                <text class="text-sm text-muted-foreground mb-6">你已通过平台实名认证</text>
                
                <Card class="w-full p-4 bg-card">
                  <view class="space-y-3">
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground">认证姓名</text>
                      <text class="text-sm text-foreground">{{ verificationInfo.approved.realName }}</text>
                    </view>
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground">认证时间</text>
                      <text class="text-sm text-foreground">{{ verificationInfo.approved.verifyTime }}</text>
                    </view>
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground">认证状态</text>
                      <Badge class="bg-green-500/10 text-green-500 border-0">已认证</Badge>
                    </view>
                  </view>
                </Card>
    
                <view class="mt-8 p-4 rounded-xl bg-secondary/50 w-full">
                  <view class="flex items-start gap-3">
                    <Shield class="w-5 h-5 text-accent mt-0.5" />
                    <view>
                      <text class="text-sm text-foreground font-medium">信息安全保障</text>
                      <text class="text-xs text-muted-foreground mt-1">
                        你的实名信息已加密存储，仅用于身份验证，不会泄露给第三方。
                      </text>
                    </view>
                  </view>
                </view>
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
  const verificationInfo = {

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