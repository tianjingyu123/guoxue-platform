<template>
  <view class="page" data-v0-route="verification">
          <view class="min-h-screen bg-background">
            <view class="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between h-12 px-4">
      
      <text class="font-semibold text-base">实名认证</text>
                <view class="w-9" />
              </view>
            </view>
    
            <view class="pt-16 pb-8 px-4">
              <view class="flex flex-col items-center py-12">
                <view class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  
                </view>
                <text class="text-xl font-semibold text-foreground mb-2">已完成实名认证</text>
                <text class="text-sm text-muted-foreground mb-6">你已通过平台实名认证</text>
                
                <!-- component:card -->
                  <view class="space-y-3">
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground">认证姓名</text>
                      <text class="text-sm text-foreground">""}</text>
                    </view>
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground">认证时间</text>
                      <text class="text-sm text-foreground">""}</text>
                    </view>
                    <view class="flex items-center justify-between">
                      <text class="text-sm text-muted-foreground">认证状态</text>
                      <!-- component:badge -->已认证<!-- /component:badge -->
                    </view>
                  </view>
                <!-- /component:card -->
    
                <view class="mt-8 p-4 rounded-xl bg-secondary/50 w-full">
                  <view class="flex items-start gap-3">
                    
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

onMounted(() => { loading.value = false })
onPullDownRefresh(() => { setTimeout(() => uni.stopPullDownRefresh(), 500) })
</script>

<style scoped>
.page {
  background: #FAF8F5;
  min-height: 100vh;
}

.hr { height: 1px; background: #E8E0D5; margin: 24rpx 0; }
</style>