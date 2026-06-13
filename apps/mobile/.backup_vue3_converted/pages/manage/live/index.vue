<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-50 bg-white border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view class="flex items-center gap-3">
          <view class="p-1" @click="goBack">
            <text class="text-foreground text-lg">←</text>
          </view>
          <text class="text-lg font-semibold text-foreground">直播管理</text>
        </view>
      </view>
    </view>

    <view class="p-4 pb-20">
      <!-- 创建直播入口 -->
      <view
        class="p-6 rounded-xl cursor-pointer"
        style="background:linear-gradient(135deg,rgba(196,30,58,0.1),rgba(201,169,110,0.05));border:1px solid rgba(196,30,58,0.2)"
        @click="navigateTo('/pages/manage/live/create/index')"
      >
        <view class="flex items-center gap-4">
          <view class="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style="background-color:#C41E3A;box-shadow:0 4px 16rpx rgba(196,30,58,0.2)">
            <text class="text-3xl text-white">➕</text>
          </view>
          <view>
            <text class="font-semibold text-foreground block">创建直播</text>
            <text class="text-sm text-muted-foreground block mt-0.5">开启一场知识授课或电商带货直播</text>
          </view>
        </view>
      </view>

      <!-- 数据概览 -->
      <view class="grid grid-cols-3 gap-3 mt-6">
        <view class="bg-white rounded-xl p-4 text-center">
          <text class="text-2xl font-bold text-foreground block">12</text>
          <text class="text-xs text-muted-foreground block mt-1">累计直播</text>
        </view>
        <view class="bg-white rounded-xl p-4 text-center">
          <text class="text-2xl font-bold block" style="color:#C9A96E">8.6万</text>
          <text class="text-xs text-muted-foreground block mt-1">总观看</text>
        </view>
        <view class="bg-white rounded-xl p-4 text-center">
          <text class="text-2xl font-bold block" style="color:#C41E3A">¥3.2万</text>
          <text class="text-xs text-muted-foreground block mt-1">带货金额</text>
        </view>
      </view>

      <!-- 筛选Tab -->
      <view class="flex items-center gap-2 mt-6 mb-4">
        <view
          v-for="item in filterOptions"
          :key="item.key"
          class="px-4 py-1.5 text-sm rounded-full transition-colors"
          :class="filter === item.key ? 'text-white' : 'text-muted-foreground'"
          :style="filter === item.key ? 'background-color:#C41E3A' : 'background-color:#F1EDE8'"
          @click="filter = item.key"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>

      <!-- 直播列表 -->
      <view class="space-y-3">
        <view v-for="live in filteredLives" :key="live.id" class="bg-white rounded-xl p-4">
          <view class="flex gap-4">
            <!-- 封面 -->
            <view class="w-28 h-16 rounded-lg flex-shrink-0 relative overflow-hidden bg-[#F1EDE8] flex items-center justify-center">
              <text class="text-2xl text-muted-foreground/50">▶️</text>
              <view v-if="live.type === 'knowledge'" class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] text-white" style="background-color:rgba(59,130,246,0.9)">
                <text>知识</text>
              </view>
              <view v-if="live.type === 'ecommerce'" class="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] text-white" style="background-color:rgba(249,115,22,0.9)">
                <text>带货</text>
              </view>
              <view v-if="live.hasReplay" class="absolute bottom-1 right-1 rounded p-1" style="background-color:rgba(0,0,0,0.6)">
                <text class="text-white text-[10px]">▶️</text>
              </view>
            </view>

            <!-- 信息 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between gap-2">
                <text class="font-medium text-sm line-clamp-1 text-foreground flex-1">{{ live.title }}</text>
                <view
                  class="px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                  :style="getStatusStyle(live.status)"
                >
                  <text>{{ getStatusLabel(live.status) }}</text>
                </view>
              </view>

              <view v-if="live.status === 'ended'" class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <text class="flex items-center gap-1">️ {{ live.viewers }}</text>
                <text class="flex items-center gap-1">🕐 {{ live.duration }}</text>
                <text v-if="live.salesAmount" style="color:#C9A96E">¥{{ live.salesAmount }}</text>
              </view>

              <text v-if="live.status === 'scheduled'" class="text-xs text-muted-foreground block mt-2">
                预约开播: {{ live.scheduledTime }} · {{ live.reserveCount }}人预约
              </text>

              <text v-if="live.status === 'draft'" class="text-xs text-muted-foreground block mt-2">
                更新于: {{ live.updatedAt }}
              </text>

              <text class="text-[10px] text-muted-foreground/70 block mt-1">{{ live.startTime || live.scheduledTime || live.updatedAt }}</text>
            </view>

            <!-- 更多操作 -->
            <view class="relative">
              <view class="p-2" @click="toggleMenu(live.id)">
                <text class="text-lg text-muted-foreground">⋯</text>
              </view>
              <view v-if="showMenu === live.id" class="fixed inset-0 z-40" @click="showMenu = null" />
              <view v-if="showMenu === live.id" class="absolute right-0 top-10 z-50 w-36 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                <view v-if="live.hasReplay" class="flex items-center gap-2 px-4 py-3 text-sm text-foreground" @click="showMenu = null">
                  <text>▶️</text>
                  <text>查看回放</text>
                </view>
                <view class="flex items-center gap-2 px-4 py-3 text-sm text-foreground" @click="showMenu = null">
                  <text>✏️</text>
                  <text>编辑</text>
                </view>
                <view class="flex items-center gap-2 px-4 py-3 text-sm text-foreground" @click="handleCopyLink(live)">
                  <text></text>
                  <text>复制链接</text>
                </view>
                <view class="flex items-center gap-2 px-4 py-3 text-sm" style="color:#EF4444" @click="showMenu = null">
                  <text>🗑️</text>
                  <text>删除</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空态 -->
      <view v-if="filteredLives.length === 0" class="text-center py-12">
        <text class="text-4xl text-muted-foreground/30 block mb-3">📻</text>
        <text class="text-sm text-muted-foreground">暂无直播记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const filter = ref<string>('all')
const showMenu = ref<number | null>(null)

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'ended', label: '已结束' },
  { key: 'scheduled', label: '待开播' },
  { key: 'draft', label: '草稿' },
]

interface LiveItem {
  id: number
  title: string
  cover: string
  type: 'knowledge' | 'ecommerce'
  status: 'ended' | 'scheduled' | 'draft'
  viewers?: number
  peakViewers?: number
  duration?: string
  startTime?: string
  endTime?: string
  hasReplay?: boolean
  salesAmount?: number
  orderCount?: number
  scheduledTime?: string
  reserveCount?: number
  updatedAt?: string
}

const liveHistory: LiveItem[] = [
  { id: 1, title: '八字命理入门：如何看懂你的命盘', cover: '/placeholder.svg', type: 'knowledge', status: 'ended', viewers: 1234, peakViewers: 456, duration: '1小时32分', startTime: '2024-01-15 20:00', endTime: '2024-01-15 21:32', hasReplay: true },
  { id: 2, title: '国学文创好物推荐专场', cover: '/placeholder.svg', type: 'ecommerce', status: 'ended', viewers: 2567, peakViewers: 890, duration: '2小时15分', startTime: '2024-01-12 19:30', endTime: '2024-01-12 21:45', hasReplay: true, salesAmount: 12680, orderCount: 156 },
  { id: 3, title: '紫微斗数精讲第三期', cover: '/placeholder.svg', type: 'knowledge', status: 'scheduled', scheduledTime: '2024-01-20 20:00', reserveCount: 328 },
  { id: 4, title: '风水布局实战讲解', cover: '/placeholder.svg', type: 'knowledge', status: 'draft', updatedAt: '2024-01-10 15:30' },
]

const filteredLives = computed(() => {
  if (filter.value === 'all') return liveHistory
  return liveHistory.filter(l => l.status === filter.value)
})

function getStatusLabel(status: string): string {
  const map: Record<string, string> = { ended: '已结束', scheduled: '待开播', draft: '草稿' }
  return map[status] || status
}

function getStatusStyle(status: string): { backgroundColor: string; color: string } {
  const map: Record<string, { backgroundColor: string; color: string }> = {
    ended: { backgroundColor: '#F1EDE8', color: '#999' },
    scheduled: { backgroundColor: 'rgba(201,169,110,0.2)', color: '#C9A96E' },
    draft: { backgroundColor: '#F1EDE8', color: '#999' },
  }
  return map[status] || map.ended
}

function toggleMenu(id: number) {
  showMenu.value = showMenu.value === id ? null : id
}

function handleCopyLink(live: LiveItem) {
  uni.setClipboardData({ data: `https://rebu.com/live/${live.id}` })
  uni.showToast({ title: '链接已复制', icon: 'success' })
  showMenu.value = null
}

function navigateTo(path: string) {
  uni.navigateTo({ url: path })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
