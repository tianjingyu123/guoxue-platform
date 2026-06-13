<template>
  <view class="page" data-v0-route="auth/recover">
        <view class="min-h-screen bg-background flex flex-col">
          
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border safe-area-pt">
            <view class="flex items-center gap-3 px-4 h-14">
              <!-- component:link -->
                
              <!-- /component:link -->
              <text class="font-semibold text-lg text-foreground">找回密码</text>
            </view>
          </view>
    
          <view class="flex-1 p-6">
            <view class="mb-6">
              <text class="text-xl font-bold text-foreground mb-2">选择找回方式</text>
              <text class="text-sm text-muted-foreground">请选择您注册时使用的验证方式</text>
            </view>
    
            <view class="space-y-3">
              <!-- component:card -->
                <!-- component:link -->
                  <view class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-foreground">手机号找回</text>
                    <text class="text-sm text-muted-foreground">通过手机验证码重置密码</text>
                  </view>
                  
                <!-- /component:link -->
              <!-- /component:card -->
    
              <!-- component:card -->
                <!-- component:link -->
                  <view class="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                    
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-foreground">邮箱找回</text>
                    <text class="text-sm text-muted-foreground">通过邮箱验证重置密码</text>
                  </view>
                  
                <!-- /component:link -->
              <!-- /component:card -->
    
              <!-- component:card -->
                <!-- component:link -->
                  <view class="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                    
                  </view>
                  <view class="flex-1">
                    <text class="font-medium text-foreground">联系客服</text>
                    <text class="text-sm text-muted-foreground">人工协助找回账号</text>
                  </view>
                  
                <!-- /component:link -->
              <!-- /component:card -->
            </view>
    
            <view class="mt-8 p-4 bg-secondary/50 rounded-xl">
              <text class="text-sm text-muted-foreground leading-relaxed">
                温馨提示：如果您绑定了多种验证方式，推荐使用手机号找回，速度更快更安全。
              </text>
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