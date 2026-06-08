<template>
  <view class="page">
    <view class="v0-header">
      <text class="v0-title">delete-account</text>
      <text class="v0-route">V0: settings/delete-account</text>
    </view>
          <view class="min-h-screen bg-background">
            <!--   -->
            <view class="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
              <view class="flex items-center justify-between px-4 h-14">
                <BackButton fallbackPath="/settings" />
                <text class="font-semibold text-base text-foreground">账号注销</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="p-4 pb-24">
              <!--   -->
              <Card class="p-4 bg-destructive/10 border-destructive/20 mb-4">
                <view class="flex items-start gap-3">
                  <view class="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle class="w-5 h-5 text-destructive" />
                  </view>
                  <view>
                    <text class="font-semibold text-destructive">注销账号须知</text>
                    <text class="text-sm text-destructive/80 mt-1">
                      注销账号后，以下数据将永久清空且无法恢复
                    </text>
                  </view>
                </view>
              </Card>
    
              <!--   -->
              <Card class="divide-y divide-border">
                
    <view v-for="(item, index) in deleteWarnings" :key="index"> (
                  <view key={index} class="flex items-start gap-3 p-4">
                    <text class="text-xl">{{ item.icon }}</text>
                    <view class="flex-1">
                      <text class="text-sm font-medium text-foreground">{{ item.title }}</text>
                      <text class="text-xs text-muted-foreground mt-0.5">{{ item.description }}</text>
                    </view>
                    <X class="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  </view>
                ))}
              </Card>
    
              <!--   -->
              <view class="mt-4">
                <text class="text-sm font-medium text-foreground mb-2">您当前的账号数据</text>
                <Card class="p-4">
                  <view class="grid grid-cols-3 gap-4 text-center">
                    <view>
                      <text class="text-lg font-bold text-accent">{{ userData.coinBalance }}</text>
                      <text class="text-xs text-muted-foreground">国学币余额</text>
                    </view>
                    <view>
                      <text class="text-lg font-bold text-primary">{{ userData.circleCount }}</text>
                      <text class="text-xs text-muted-foreground">管理的圈子</text>
                    </view>
                    <view>
                      <text class="text-lg font-bold text-foreground">{{ userData.contentCount }}</text>
                      <text class="text-xs text-muted-foreground">发布的内容</text>
                    </view>
                  </view>
                </Card>
              </view>
    
              <!--   -->
              <view class="mt-4">
                <text class="text-sm font-medium text-foreground mb-2">内容处理方式</text>
                <Card class="p-4">
                  <text class="flex items-center justify-between cursor-pointer">
                    <view>
                      <text class="text-sm font-medium text-foreground">保留已发布内容</text>
                      <text class="text-xs text-muted-foreground">您的帖子和文章将匿名保留</text>
                    </view>
                    <view class="v0-btn"
                      @click={() => setKeepContent(!keepContent)}
                      class={cn(
                        "w-12 h-7 rounded-full transition-colors relative",
                        keepContent ? "bg-primary" : "bg-secondary"
                      )}
                    >
                      <text class={cn(
                        "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                        keepContent ? "translate-x-6" : "translate-x-1"
                      )} />
                    </view>
                  </text>
                </Card>
              </view>
            </view>
    
            <!--   -->
            <view class="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
              <view class="v0-btn"
                @click={() => setStep("verify")}
                class="w-full py-3 bg-destructive text-destructive-foreground text-sm font-medium rounded-xl hover:bg-destructive/90 transition-colors"
              >
                我已了解，继续注销
              </view>
              <text class="text-xs text-muted-foreground text-center mt-2">
                注销前请确保已提现全部收益
              </text>
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
const deleteWarnings = [
const userData = {

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