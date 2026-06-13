<template>
  <view class="page" data-v0-route="demo/update">
        <view class="min-h-screen bg-background">
          
          <view class="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
            <view class="flex items-center gap-3 px-4 h-12">
              
              <text class="font-semibold text-foreground">版本更新弹窗演示</text>
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