<template>
  <view class="min-h-screen bg-background flex flex-col">
    <!-- 等待中状态 -->
    <view v-if="loading" class="flex-1 flex items-center justify-center">
      <text class="text-muted-foreground text-sm">加载中...</text>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="flex items-center justify-between px-4 h-12 border-b border-border bg-white flex-shrink-0">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-2xl leading-none text-foreground">←</text>
        </view>
        <text class="text-base font-bold text-foreground">{{ toolName }}</text>
        <view class="w-6" />
      </view>

      <!-- 主内容 -->
      <view class="flex-1 flex flex-col items-center justify-center p-8">
        <view class="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <text class="text-5xl text-primary"></text>
        </view>

        <text class="text-2xl font-bold text-foreground mb-3">开发中</text>
        <text class="text-muted-foreground text-center mb-8 leading-relaxed">{{ toolName }}正在紧锣密鼓地开发中，敬请期待</text>

        <view class="flex items-center gap-2 text-sm text-primary bg-primary/10 px-4 py-2 rounded-full">
          <text class="text-base"></text>
          <text>即将上线</text>
        </view>

        <view
          class="mt-8 px-8 py-3 bg-primary text-white font-medium rounded-xl text-center"
          hover-class="hover-primary"
          @click="goBack"
          style="box-shadow: 0 4px 6px -1px rgba(196,30,58,0.2)"
        >
          <text>返回首页</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const toolName = ref('此功能')
const loading = ref(true)

onLoad((options) => {
  if (options && options.name) {
    toolName.value = options.name
  }
  setTimeout(() => {
    loading.value = false
  }, 300)
})

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.hover-primary {
  opacity: 0.9;
}
</style>