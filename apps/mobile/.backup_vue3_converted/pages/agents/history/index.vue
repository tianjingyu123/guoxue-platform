<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view class="p-1" @click="goBack">
        <text class="text-lg text-foreground">←</text>
      </view>
      <text class="text-base font-semibold text-foreground flex-1">对话历史</text>
    </view>

    <!-- 搜索框 -->
    <view class="px-4 pt-4">
      <view class="relative mb-4">
        <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" style="font-size:16px"></text>
        <input
          v-model="search"
          class="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-sm text-foreground"
          placeholder="搜索对话"
        />
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="px-4 pb-20" style="height: calc(100vh - 96px)">
      <!-- 空状态 -->
      <view v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-20">
        <text class="text-5xl mb-3 opacity-30"></text>
        <text class="text-sm text-muted-foreground">暂无对话记录</text>
      </view>

      <!-- 对话列表 -->
      <view v-else class="space-y-2">
        <view
          v-for="conv in filtered" :key="conv.id"
          class="w-full flex items-center gap-3 p-3 bg-white border border-border rounded-xl text-left transition-colors active:bg-[#F1EDE8]/30"
          :style="{ borderRadius: '12px' }"
          @click="goChat(conv.id)"
        >
          <!-- 头像 -->
          <view class="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <text class="text-lg">🤖</text>
          </view>
          <!-- 内容 -->
          <view class="flex-1 min-w-0">
            <view class="flex items-center justify-between gap-2 mb-0.5">
              <view class="flex items-center gap-1.5 min-w-0">
                <text class="text-sm font-medium text-foreground truncate">{{ conv.agentName }}</text>
                <text
                  class="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  :class="categoryClass(conv.agentCategory)"
                >{{ conv.agentCategory }}</text>
              </view>
              <text class="text-[10px] text-muted-foreground flex-shrink-0">{{ conv.lastTime }}</text>
            </view>
            <view class="flex items-center justify-between gap-2">
              <text class="text-xs text-muted-foreground truncate">{{ conv.lastMessage }}</text>
              <view class="flex items-center gap-2 flex-shrink-0">
                <view
                  v-if="conv.unread > 0"
                  class="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                >
                  <text class="text-white text-[10px]">{{ conv.unread }}</text>
                </view>
                <view class="text-muted-foreground" @click.stop="remove(conv.id)">
                  <text class="text-sm">🗑</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Conversation {
  id: string
  agentName: string
  agentCategory: string
  lastMessage: string
  lastTime: string
  messageCount: number
  unread: number
}

const mockConvs: Conversation[] = [
  { id: '1', agentName: '八字命理大师', agentCategory: '八字命理', lastMessage: '您的命局中财星得地，今年走食伤生财之运…', lastTime: '今天 14:35', messageCount: 24, unread: 0 },
  { id: '2', agentName: '奇门遁甲助手', agentCategory: '奇门遁甲', lastMessage: '根据今日癸卯日的奇门布局，您的出行方向…', lastTime: '昨天 20:12', messageCount: 8, unread: 2 },
  { id: '3', agentName: '紫微斗数专家', agentCategory: '紫微斗数', lastMessage: '您的命宫坐紫微星，主性格稳重、志向远大…', lastTime: '2天前', messageCount: 15, unread: 0 },
  { id: '4', agentName: '风水布局师', agentCategory: '风水', lastMessage: '根据您的房屋朝向，建议将财位布置在…', lastTime: '3天前', messageCount: 6, unread: 0 },
  { id: '5', agentName: '易经解读助手', agentCategory: '易经', lastMessage: '您抽到的卦象为「水雷屯」，代表事业初创…', lastTime: '上周', messageCount: 12, unread: 0 },
]

const CATEGORY_COLORS: Record<string, string> = {
  '八字命理': 'bg-red-50 text-red-700',
  '奇门遁甲': 'bg-purple-50 text-purple-700',
  '紫微斗数': 'bg-blue-50 text-blue-700',
  '风水':     'bg-green-50 text-green-700',
  '易经':     'bg-amber-50 text-amber-700',
}

const convs = ref<Conversation[]>(mockConvs)
const search = ref('')

const filtered = computed(() =>
  convs.value.filter(c => c.agentName.includes(search.value) || c.lastMessage.includes(search.value))
)

const categoryClass = (cat: string) => CATEGORY_COLORS[cat] ?? 'bg-[#F1EDE8] text-muted-foreground'

function remove(id: string) {
  convs.value = convs.value.filter(c => c.id !== id)
}

function goChat(id: string) {
  uni.navigateTo({ url: `/pages/agents/chat/index?id=${id}` })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
