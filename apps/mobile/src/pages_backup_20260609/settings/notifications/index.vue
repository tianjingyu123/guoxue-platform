<template>
  <view class="page" data-v0-route="settings/notifications">
        <view class="min-h-screen bg-background">
          
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <!-- component:link -->
                  
                <!-- /component:link -->
                <text class="text-lg font-semibold">通知设置</text>
              </view>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
            
            <!-- component:card -->
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-3">
                  <view class="">
                    ""
                  </view>
                  <view>
                    <text class="font-medium">接收推送通知</text>
                    <text class="text-xs text-muted-foreground">
                      ""
                    </text>
                  </view>
                </view>
                
              </view>
            <!-- /component:card -->
    
            <view class="">
              
              <!-- component:card -->
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">互动通知</text>
                </view>
                <view class="divide-y divide-border">
    
                </view>
              <!-- /component:card -->
    
              <!-- component:card -->
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">内容更新</text>
                </view>
                <view class="divide-y divide-border">
    
                </view>
              <!-- /component:card -->
    
              <!-- component:card -->
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">交易通知</text>
                </view>
                <view class="divide-y divide-border">
    
                </view>
              <!-- /component:card -->
    
              <!-- component:card -->
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">系统通知</text>
                </view>
                <view class="divide-y divide-border">
    
                </view>
              <!-- /component:card -->
    
              <!-- component:card -->
                <view class="px-4 py-2.5 border-b border-border">
                  <text class="text-xs text-muted-foreground font-medium">免打扰模式</text>
                </view>
                <view class="divide-y divide-border">
                  <view class="px-4 py-3 flex items-center justify-between">
                    <view class="flex items-center gap-3">
                      <view class="w-8 h-8 rounded-lg bg-operator/10 flex items-center justify-center">
                        
                      </view>
                      <view>
                        <text class="text-sm font-medium">开启免打扰</text>
                        <text class="text-[10px] text-muted-foreground">在指定时间段内不接收推送通知</text>
                      </view>
                    </view>
                    
                  </view>
                  
                  ""
                </view>
              <!-- /component:card -->
            </view>
    
            <text class="text-[10px] text-muted-foreground text-center px-4">
              关闭通知后，您仍可在消息中心查看相关消息
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