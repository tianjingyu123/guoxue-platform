<template>
  <view class="page" data-v0-route="notices/[id]">
          <view class="min-h-screen bg-background">
            
            <view class="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
              <view class="flex items-center justify-between px-4 h-14">
                
                <text class="text-lg font-semibold">公告详情</text>
                <view class="w-10" />
              </view>
            </view>
    
            <view class="p-4 space-y-4">
              
              <view class="flex items-center gap-4">
    
              </view>
              
              <view class="space-y-2">
    
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