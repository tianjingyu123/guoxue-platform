<template>
  <view class="page" data-v0-route="paipan/bazi">
        <view class="min-h-screen bg-background">
          
          <view class="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/10">
            <view class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
              <!-- component:link -->
                
                <text class="text-sm">返回</text>
              <!-- /component:link -->
              <text class="text-base font-bold tracking-wider">热卜八字</text>
              <!-- component:link -->
                
                <text>记录</text>
              <!-- /component:link -->
            </view>
          </view>
    
          <view class="max-w-lg mx-auto px-4 py-5 space-y-4">
    
            <view>
              
            </view>
    
            <view>
              
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