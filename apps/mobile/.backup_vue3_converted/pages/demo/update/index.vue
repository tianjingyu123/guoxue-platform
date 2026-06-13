<template>
  <view class="min-h-screen bg-background">
    <view class="sticky top-0 z-40 bg-background/95 border-b border-border">
      <view class="flex items-center gap-3 px-4 h-12">
        <view @click="goBack" class="p-1"><text class="text-foreground text-lg">&#8249;</text></view>
        <text class="font-semibold text-foreground">版本更新弹窗演示</text>
      </view>
    </view>

    <view class="p-6 space-y-4">
      <text class="text-lg font-bold text-foreground">版本更新弹窗演示</text>
      <view class="flex gap-3">
        <view @click="showNormal = true" class="px-4 py-2 bg-primary text-white rounded-lg text-sm text-center">非强制更新</view>
        <view @click="showForced = true" class="px-4 py-2 bg-primary text-white rounded-lg text-sm text-center">强制更新</view>
      </view>
    </view>

    <!-- 非强制更新弹窗 -->
    <view v-if="showNormal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <view class="w-full bg-white rounded-2xl overflow-hidden shadow-2xl" style="max-width:350px">
        <view class="relative bg-gradient-to-br from-primary to-accent pt-8 pb-12 px-6 text-center">
          <view @click="showNormal = false" class="absolute top-3 right-3 p-1.5 rounded-full bg-white/10">
            <text class="text-white text-lg">✕</text>
          </view>
          <view class="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <text class="text-4xl text-white">🚀</text>
          </view>
          <text class="text-xl font-bold text-white block">发现新版本</text>
          <text class="text-white/80 text-sm mt-1 block">V2.1.0</text>
        </view>

        <view class="px-6 -mt-6">
          <view class="bg-background rounded-xl border border-border p-4 shadow-sm">
            <text class="text-sm font-medium text-foreground block mb-3">更新内容</text>
            <view class="space-y-2.5">
              <view v-for="(item, index) in normalUpdateItems" :key="index" class="flex items-start gap-2.5">
                <text class="text-sm">{{ getIcon(item.type) }}</text>
                <view class="flex-1">
                  <text class="text-xs px-1.5 py-0.5 rounded mr-1.5" :class="getTypeClass(item.type)">{{ getLabel(item.type) }}</text>
                  <text class="text-sm text-muted-foreground">{{ item.content }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="p-6 pt-4 flex gap-3">
          <view @click="showNormal = false" class="flex-1 py-2.5 border border-border rounded-lg text-sm text-center text-muted-foreground">稍后再说</view>
          <view @click="handleNormalUpdate" class="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm text-center" :class="updating ? 'opacity-50' : ''">
            <view v-if="updating" class="flex items-center justify-center gap-2">
              <text class="text-xs animate-spin"></text>
              <text>更新中...</text>
            </view>
            <text v-else>立即更新</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 强制更新弹窗 -->
    <view v-if="showForced" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <view class="w-full bg-white rounded-2xl overflow-hidden shadow-2xl" style="max-width:350px">
        <view class="relative bg-gradient-to-br from-primary to-accent pt-8 pb-12 px-6 text-center">
          <view class="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <text class="text-4xl text-white">🚀</text>
          </view>
          <text class="text-xl font-bold text-white block">发现新版本</text>
          <text class="text-white/80 text-sm mt-1 block">V3.0.0</text>
        </view>

        <view class="px-6 -mt-6">
          <view class="bg-background rounded-xl border border-border p-4 shadow-sm">
            <text class="text-sm font-medium text-foreground block mb-3">更新内容</text>
            <view class="space-y-2.5">
              <view v-for="(item, index) in forcedUpdateItems" :key="index" class="flex items-start gap-2.5">
                <text class="text-sm">{{ getIcon(item.type) }}</text>
                <view class="flex-1">
                  <text class="text-xs px-1.5 py-0.5 rounded mr-1.5" :class="getTypeClass(item.type)">{{ getLabel(item.type) }}</text>
                  <text class="text-sm text-muted-foreground">{{ item.content }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="p-6 pt-4 flex justify-center">
          <view @click="handleForcedUpdate" class="w-full py-2.5 bg-primary text-white rounded-lg text-sm text-center" :class="forcingUpdate ? 'opacity-50' : ''">
            <view v-if="forcingUpdate" class="flex items-center justify-center gap-2">
              <text class="text-xs animate-spin"></text>
              <text>更新中...</text>
            </view>
            <text v-else>立即更新</text>
          </view>
        </view>

        <text class="text-center text-xs text-muted-foreground pb-4 -mt-2 block">此版本包含重要更新，需立即更新后使用</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface UpdateItem {
  type: 'new' | 'optimize' | 'fix'
  content: string
}

const showNormal = ref(false)
const showForced = ref(false)
const updating = ref(false)
const forcingUpdate = ref(false)

const normalUpdateItems: UpdateItem[] = [
  { type: 'new', content: '圈子付费问答功能' },
  { type: 'new', content: 'AI古籍智慧阅读' },
  { type: 'optimize', content: '首页加载速度提升50%' },
  { type: 'optimize', content: '视频播放流畅度优化' },
  { type: 'fix', content: '部分机型排盘结果展示问题' },
]

const forcedUpdateItems: UpdateItem[] = [
  { type: 'new', content: '全新架构重构' },
  { type: 'new', content: '安全性重大升级' },
  { type: 'fix', content: '修复关键安全漏洞' },
]

function getIcon(type: string): string {
  const icons: Record<string, string> = { new: '', optimize: '🔧', fix: '🐛' }
  return icons[type] || '📌'
}

function getLabel(type: string): string {
  const labels: Record<string, string> = { new: '新增', optimize: '优化', fix: '修复' }
  return labels[type] || ''
}

function getTypeClass(type: string): string {
  const classes: Record<string, string> = {
    new: 'bg-accent/10 text-accent',
    optimize: 'bg-blue-50 text-blue-500',
    fix: 'bg-green-50 text-green-500',
  }
  return classes[type] || ''
}

function handleNormalUpdate() {
  updating.value = true
  setTimeout(() => {
    showNormal.value = false
    updating.value = false
  }, 2000)
}

function handleForcedUpdate() {
  forcingUpdate.value = true
  setTimeout(() => {
    showForced.value = false
    forcingUpdate.value = false
  }, 2000)
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
