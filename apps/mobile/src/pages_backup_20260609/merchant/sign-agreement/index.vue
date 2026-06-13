<template>
  <view class="page" data-v0-route="merchant/sign-agreement">
          <view class="min-h-screen bg-background">
            <view class="sticky top-0 z-50 bg-background border-b border-border"><view class="flex items-center h-14 px-4"><!-- component:link --><!-- /component:link --><text class="text-lg font-semibold">签署入驻协议</text></view></view>
            <view class="p-4">
              <!-- component:card -->
                <view class="flex flex-col items-center text-center">
                  <view class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4"></view>
                  <text class="text-xl font-bold text-green-600 mb-2">协议签署成功</text>
                  <text class="text-sm text-muted-foreground mb-4">店铺即将开通...</text>
                  <view class="w-full space-y-2 text-sm bg-background rounded-lg p-4">
                    <view class="flex justify-between"><text class="text-muted-foreground">协议版本</text><text class="font-medium">""}</text></view>
                    <view class="flex justify-between"><text class="text-muted-foreground">签署时间</text><text class="font-medium">""}</text></view>
                  </view>
                </view>
              <!-- /component:card -->
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