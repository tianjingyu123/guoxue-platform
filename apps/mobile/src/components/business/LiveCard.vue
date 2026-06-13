<template>
  <view class="bg-card rounded-xl overflow-hidden" @tap="emit('click', live)">
    <!-- 封面 -->
    <view class="relative w-full aspect-video overflow-hidden" :class="live.isLive ? 'ring-1 ring-primary/40' : ''">
      <image class="w-full h-full object-cover" :src="live.coverUrl" mode="aspectFill" lazy-load />
      <!-- 状态角标 -->
      <view class="absolute top-2 left-2">
        <view v-if="live.isLive" class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90">
          <view class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <text class="text-[10px] text-white font-medium">直播中</text>
        </view>
        <view v-else class="px-2 py-0.5 rounded-md bg-black/50">
          <text class="text-[10px] text-white">回放</text>
        </view>
      </view>
      <!-- 观看人数 -->
      <view class="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40">
        <svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <text class="text-[10px] text-white">{{ formatCount(live.viewerCount) }}人</text>
      </view>
    </view>
    <!-- 信息区 -->
    <view class="p-2.5 flex items-start gap-2">
      <UserAvatar :src="live.hostAvatar" size="sm" class="flex-shrink-0 mt-0.5" />
      <view class="flex-1 min-w-0">
        <text class="text-sm font-medium text-foreground leading-snug line-clamp-2">{{ live.title }}</text>
        <text class="text-xs text-muted-foreground mt-0.5 block">{{ live.hostName }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/base/UserAvatar.vue'

interface LiveItem {
  id: string | number; title: string; coverUrl: string
  hostName: string; hostAvatar?: string
  viewerCount?: number; isLive?: boolean
}

withDefaults(defineProps<{ live: LiveItem }>(), {})
const emit = defineEmits<{ click: [live: LiveItem] }>()

function formatCount(n?: number) {
  if (!n) return '0'
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n.toString()
}
</script>
