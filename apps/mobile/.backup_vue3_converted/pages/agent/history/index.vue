<template>
  <view class="min-h-screen bg-background max-w-lg mx-auto">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border" style="padding-top: var(--status-bar-height);">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="p-2 -ml-2 rounded-full" @click="goBack">
          <text class="text-foreground text-lg">←</text>
        </view>
        <text class="font-semibold text-base text-foreground">对话历史</text>
        <view class="relative">
          <view @click="showMenu = !showMenu" class="p-2 -mr-2 rounded-full">
            <text class="text-foreground text-lg">⋯</text>
          </view>
          <!-- 下拉菜单 -->
          <view v-if="showMenu">
            <view class="fixed inset-0 z-40" @click="showMenu = false" />
            <view class="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50">
              <view @click="onClearAll" class="flex items-center gap-2 w-full px-4 py-3 text-sm text-danger">
                <text class="text-base">🗑</text>
                <text>清空全部</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索栏 -->
      <view class="px-4 pb-3">
        <view class="relative">
          <text class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></text>
          <input
            v-model="searchQuery"
            placeholder="搜索对话内容..."
            class="w-full h-10 pl-10 pr-9 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground"
          />
          <view v-if="searchQuery" @click="searchQuery = ''" class="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full">
            <text class="text-muted-foreground text-xs">✕</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 对话列表 -->
    <view class="pb-20">
      <!-- 有搜索结果 -->
      <view v-if="filteredHistory.length > 0">
        <view v-for="group in timeGroups" :key="group">
          <view v-if="getGroupItems(group).length > 0">
            <view class="px-4 py-2 bg-secondary/50">
              <text class="text-xs font-medium" style="color: #999">{{ group }}</text>
            </view>
            <view
              v-for="item in getGroupItems(group)"
              :key="item.id"
              class="relative overflow-hidden"
            >
              <!-- 左滑删除按钮 -->
              <view
                :class="['absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center transition-transform duration-200', swipedId === item.id ? 'translate-x-0' : 'translate-x-full']"
                style="background:#FF4D4F"
              >
                <view @click.stop="handleDelete(item.id)" class="flex flex-col items-center gap-1 text-white">
                  <text class="text-lg">🗑</text>
                  <text class="text-xs">删除</text>
                </view>
              </view>

              <!-- 对话卡片 -->
              <view
                :class="['relative bg-background transition-transform duration-200', swipedId === item.id ? '-translate-x-20' : 'translate-x-0']"
                @click="onItemClick(item.id)"
              >
                <view class="flex items-center gap-3 px-4 py-3 active:bg-secondary/50">
                  <!-- 头像 -->
                  <view class="relative flex-shrink-0">
                    <view class="w-12 h-12 rounded-full flex items-center justify-center"
                      :class="avatarBg(item.agentType)">
                      <text class="text-lg">{{ avatarIcon(item.agentType) }}</text>
                    </view>
                    <!-- 未读红点 -->
                    <view v-if="item.unread > 0" class="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center" style="background:#C41E3A">
                      <text class="text-[10px] text-white font-medium">{{ item.unread }}</text>
                    </view>
                  </view>

                  <!-- 对话信息 -->
                  <view class="flex-1 min-w-0">
                    <view class="flex items-center gap-2 mb-1">
                      <text class="font-medium text-sm text-foreground">{{ item.agentName }}</text>
                      <text :class="['text-[10px] px-1.5 py-0.5 rounded', item.isFree ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary']">
                        {{ item.agentType }}
                      </text>
                    </view>
                    <text class="text-xs text-muted-foreground line-clamp-2 block">{{ item.lastMessage }}</text>
                  </view>

                  <!-- 时间 -->
                  <view class="flex-shrink-0 text-right">
                    <text class="text-xs text-muted-foreground">{{ item.time }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索无结果 -->
      <view v-else-if="history.length > 0" class="flex flex-col items-center justify-center py-20 px-4">
        <view class="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <text class="text-2xl text-muted-foreground"></text>
        </view>
        <text class="text-sm text-muted-foreground">未找到相关对话</text>
        <text class="text-xs text-muted-foreground/70 mt-1">试试其他关键词</text>
      </view>

      <!-- 空状态 -->
      <view v-else class="flex flex-col items-center justify-center py-20 px-4">
        <view class="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <text class="text-4xl text-accent"></text>
        </view>
        <text class="text-foreground font-medium mb-2">暂无对话记录</text>
        <text class="text-sm text-muted-foreground text-center mb-6">去智能体广场探索各类AI助手，开启你的国学之旅</text>
        <view @click="goToAgents" class="px-6 py-2.5 rounded-full text-sm font-medium" style="background:#C41E3A;color:white">
          <text>探索智能体广场</text>
        </view>
      </view>
    </view>

    <!-- 清空确认弹窗 -->
    <view v-if="showClearConfirm" class="fixed inset-0 z-50 flex items-center justify-center px-8">
      <view class="absolute inset-0 bg-black/60" @click="showClearConfirm = false" />
      <view class="relative w-full max-w-sm bg-white rounded-2xl p-5">
        <view class="text-center mb-4">
          <view class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style="background:rgba(255,77,79,0.1)">
            <text class="text-lg" style="color:#FF4D4F">🗑</text>
          </view>
          <text class="font-semibold text-foreground block mb-1">清空全部对话</text>
          <text class="text-sm text-muted-foreground">确定要清空所有对话历史吗？此操作无法撤销。</text>
        </view>
        <view class="flex gap-3">
          <view @click="showClearConfirm = false" class="flex-1 py-2.5 rounded-xl text-sm font-medium text-center" style="background:#F5F1EB;color:#2C2C2C">
            <text>取消</text>
          </view>
          <view @click="handleClearAll" class="flex-1 py-2.5 rounded-xl text-sm font-medium text-center" style="background:#FF4D4F;color:white">
            <text>确认清空</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }

const initialHistory = [
  {
    id: 1, agentName: "八字分析师",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a",
    agentType: "命理",
    lastMessage: "根据您的八字，今年的事业运势整体呈上升趋势，尤其是下半年会有贵人相助...",
    time: "10分钟前", timeGroup: "今天", unread: 2, isFree: false,
  },
  {
    id: 2, agentName: "紫微斗数大师",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ziwei&backgroundColor=6366f1",
    agentType: "紫微",
    lastMessage: "您的命盘中紫微星坐命宫，这是非常好的格局，代表您有领导才能...",
    time: "昨天 15:30", timeGroup: "昨天", unread: 0, isFree: true,
  },
  {
    id: 3, agentName: "风水顾问",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=fengshui&backgroundColor=059669",
    agentType: "风水",
    lastMessage: "您家的客厅布局基本合理，但建议将沙发稍微往西移动一些...",
    time: "周一 09:20", timeGroup: "本周", unread: 0, isFree: false,
  },
  {
    id: 4, agentName: "姓名学专家",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c",
    agentType: "姓名",
    lastMessage: "这个名字的五行属性偏木，与您的八字喜用神相合，是个不错的选择...",
    time: "上周三", timeGroup: "更早", unread: 0, isFree: true,
  },
  {
    id: 5, agentName: "周易占卜师",
    agentAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=zhouyi&backgroundColor=7c3aed",
    agentType: "占卜",
    lastMessage: "您所问之事，卦象显示近期会有转机，但需要耐心等待...",
    time: "2周前", timeGroup: "更早", unread: 0, isFree: false,
  },
]

const timeGroups = ["今天", "昨天", "本周", "更早"]

const history = ref(initialHistory)
const searchQuery = ref("")
const showClearConfirm = ref(false)
const showMenu = ref(false)
const swipedId = ref<number | null>(null)

const filteredHistory = computed(() => {
  if (!searchQuery.value) return history.value
  const q = searchQuery.value
  return history.value.filter(
    item => item.agentName.includes(q) || item.lastMessage.includes(q)
  )
})

function getGroupItems(group: string) {
  return filteredHistory.value.filter(item => item.timeGroup === group)
}

function avatarIcon(type: string): string {
  switch (type) {
    case '命理': return '🔮'
    case '紫微': return ''
    case '风水': return '🏠'
    case '姓名': return ''
    default: return '📜'
  }
}

function avatarBg(type: string): string {
  switch (type) {
    case '命理': return 'bg-red-100'
    case '紫微': return 'bg-indigo-100'
    case '风水': return 'bg-green-100'
    case '姓名': return 'bg-orange-100'
    default: return 'bg-purple-100'
  }
}

function handleDelete(id: number) {
  history.value = history.value.filter(item => item.id !== id)
  swipedId.value = null
}

function handleClearAll() {
  history.value = []
  showClearConfirm.value = false
  showMenu.value = false
}

function onClearAll() {
  showClearConfirm.value = true
  showMenu.value = false
}

function onItemClick(id: number) {
  if (swipedId.value === id) {
    swipedId.value = null
  } else {
    swipedId.value = id
  }
}

function goToAgents() {
  uni.navigateTo({ url: '/pages/agents/index' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
