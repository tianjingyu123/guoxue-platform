<template>
  <view class="page" data-v0-route="settings/privacy">
        <view class="min-h-screen bg-background">
          
          <view class="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center justify-between px-4 py-3">
              <view class="flex items-center gap-3">
                <!-- component:link -->
                  
                <!-- /component:link -->
                <text class="text-lg font-semibold">隐私设置</text>
              </view>
            </view>
          </view>
    
          <view class="p-4 space-y-4">
    
            <!-- component:card -->
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">个人信息可见性</text>
              </view>
              <view class="divide-y divide-border">
    
              </view>
            <!-- /component:card -->
    
            <!-- component:card -->
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">互动权限</text>
              </view>
              <view class="divide-y divide-border">
    
              </view>
            <!-- /component:card -->
    
            <!-- component:card -->
              <!-- component:link -->
                <view class="px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <view class="flex items-center gap-3">
                    <view class="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      
                    </view>
                    <view>
                      <text class="text-sm font-medium">黑名单管理</text>
                      <text class="text-[10px] text-muted-foreground">已拉黑 3 人</text>
                    </view>
                  </view>
                  
                </view>
              <!-- /component:link -->
            <!-- /component:card -->
    
            <!-- component:card -->
              <view class="px-4 py-2.5 border-b border-border">
                <text class="text-xs text-muted-foreground font-medium">其他</text>
              </view>
              <view class="divide-y divide-border">
    
              </view>
            <!-- /component:card -->
    
            <text class="text-[10px] text-muted-foreground text-center px-4">
              隐私设置修改后立即生效，部分设置可能需要刷新页面查看效果
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