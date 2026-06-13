<template>
  <view class="min-h-screen pb-24" style="background:#FAF8F5;">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-40 bg-white/95 backdrop-blur-lg" style="border-bottom:1px solid #E8E0D5;">
      <view class="flex items-center justify-between px-4" style="height:56px;">
        <view class="flex items-center gap-3">
          <view @click="goBack" class="p-1 -ml-1">
            <text class="text-xl" style="color:#2C2C2C;">←</text>
          </view>
          <text class="font-semibold text-base" style="color:#2C2C2C;">直播管理</text>
        </view>
        <view class="flex items-center gap-2">
          <view class="p-2 rounded-full" @click="handleNotify">
            <text class="text-lg" style="color:#999;"></text>
          </view>
          <view class="p-2 rounded-full" @click="handleSettings">
            <text class="text-lg" style="color:#999;">⚙</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据概览卡片 - 横向滑动 -->
    <view class="px-4 py-4">
      <scroll-view scroll-x class="flex" style="white-space:nowrap;overflow-x:auto;">
        <view
          v-for="stat in statsData"
          :key="stat.id"
          class="inline-flex flex-col w-28 p-3 rounded-xl text-white mr-3 flex-shrink-0"
          :style="{ background: stat.gradient }"
        >
          <text class="text-lg opacity-80 mb-2 block">{{ stat.icon }}</text>
          <text class="text-xl font-bold block">{{ stat.value }}<text class="text-sm font-normal opacity-80">{{ stat.unit }}</text></text>
          <text class="text-xs opacity-80 mt-0.5 block">{{ stat.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 快捷操作区 -->
    <view class="px-4 mb-4">
      <!-- 创建直播按钮 -->
      <view
        class="w-full h-14 rounded-xl text-base font-semibold flex items-center justify-center text-white shadow-lg mb-3"
        style="background:linear-gradient(135deg, #C41E3A, #C9A96E);box-shadow:0 4px 14px rgba(196,30,58,0.2);"
        @click="goTo('/pages/creator/live/create/index')"
      >
        <text class="text-lg mr-2"></text>
        <text>创建直播</text>
      </view>

      <!-- 快捷入口 -->
      <view class="flex gap-3">
        <view class="flex-1 p-3 rounded-xl bg-white flex flex-col items-center gap-1.5" style="border:1px solid #E8E0D5;" @click="goTo('/pages/creator/live/create/index?type=knowledge')">
          <view class="w-10 h-10 rounded-full flex items-center justify-center" style="background:rgba(59,130,246,0.1);">
            <text class="text-lg" style="color:#3B82F6;"></text>
          </view>
          <text class="text-xs" style="color:#999;">知识授课</text>
        </view>
        <view class="flex-1 p-3 rounded-xl bg-white flex flex-col items-center gap-1.5" style="border:1px solid #E8E0D5;" @click="goTo('/pages/creator/live/create/index?type=commerce')">
          <view class="w-10 h-10 rounded-full flex items-center justify-center" style="background:rgba(251,146,60,0.1);">
            <text class="text-lg" style="color:#FB923C;"></text>
          </view>
          <text class="text-xs" style="color:#999;">电商带货</text>
        </view>
        <view class="flex-1 p-3 rounded-xl bg-white flex flex-col items-center gap-1.5" style="border:1px solid #E8E0D5;" @click="goTo('/pages/creator/live/console/index')">
          <view class="w-10 h-10 rounded-full flex items-center justify-center" style="background:rgba(168,85,247,0.1);">
            <text class="text-lg" style="color:#A855F7;">📡</text>
          </view>
          <text class="text-xs" style="color:#999;">快速开播</text>
        </view>
      </view>
    </view>

    <!-- 直播列表区 -->
    <view class="px-4">
      <!-- Tab切换 -->
      <view class="flex items-center gap-1 mb-4 overflow-x-auto" style="scrollbar-width:none;">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'"
        >
          <text>{{ tab.label }}</text>
          <text v-if="getTabCount(tab.key) > 0" :class="['ml-1.5 text-xs', activeTab === tab.key ? 'text-white/80' : 'text-muted-foreground']">{{ getTabCount(tab.key) }}</text>
        </view>
      </view>

      <!-- 直播列表 -->
      <view v-if="filteredList.length > 0" class="space-y-3">
        <view
          v-for="item in filteredList"
          :key="item.id"
          class="bg-white rounded-xl overflow-hidden"
          :class="item.status === 'live' ? 'ring-2' : ''"
          :style="item.status === 'live' ? 'border:2px solid rgba(239,68,68,0.3);' : 'border:1px solid #E8E0D5;'"
        >
          <view class="flex gap-3 p-3">
            <!-- 封面图 -->
            <view class="relative w-28 h-20 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
              <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="w-full h-full" />
              <view v-else class="w-full h-full flex items-center justify-center">
                <text class="text-2xl" style="color:rgba(153,153,153,0.3);">📹</text>
              </view>
              <!-- 状态标签 -->
              <view class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] text-white" :style="{ background: statusConfig[item.status].bgColor }">
                <text v-if="item.status === 'live'" class="w-1.5 h-1.5 rounded-full bg-white mr-1 inline-block animate-pulse" />
                <text>{{ statusConfig[item.status].label }}</text>
              </view>
              <!-- 类型标签 -->
              <view class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] text-white" style="background:rgba(0,0,0,0.5);">
                <text>{{ item.type === 'knowledge' ? '知识' : '带货' }}</text>
              </view>
            </view>

            <!-- 内容信息 -->
            <view class="flex-1 min-w-0 flex flex-col justify-between">
              <view>
                <text class="font-medium text-sm line-clamp-2 block" style="color:#2C2C2C;">{{ item.title }}</text>
                <view v-if="item.scheduledTime" class="flex items-center gap-1 mt-1 text-xs" style="color:#999;">
                  <text></text>
                  <text>{{ item.scheduledTime }}</text>
                </view>
              </view>
              <!-- 数据统计 -->
              <view class="flex items-center gap-3 text-xs" style="color:#999;">
                <template v-if="item.status === 'preview'">
                  <text class="flex items-center gap-1"> {{ item.previewCount }}人预约</text>
                </template>
                <template v-else-if="item.status !== 'draft'">
                  <text class="flex items-center gap-1"> {{ formatNumber(item.viewers) }}</text>
                  <text class="flex items-center gap-1">🕐 {{ item.duration }}</text>
                  <text v-if="item.income > 0" class="flex items-center gap-1" style="color:#D97706;">🎁 ¥{{ item.income }}</text>
                </template>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="flex flex-col items-end justify-between">
              <view class="p-1.5 rounded-full" @click="toggleActions(item.id)">
                <text class="text-lg" style="color:#999;">⋯</text>
              </view>
              <view
                v-if="item.status === 'live'"
                class="px-3 py-1.5 rounded-lg text-white text-xs"
                style="background:#EF4444;"
                @click="goTo('/pages/creator/live/console/index')"
              >
                <text>▶ 进入直播</text>
              </view>
              <view
                v-else-if="item.status === 'preview'"
                class="px-3 py-1.5 rounded-lg text-xs"
                style="border:1px solid #E8E0D5;color:#666;"
                @click="handleEdit(item)"
              >
                <text> 编辑</text>
              </view>
              <view
                v-else-if="item.status === 'draft'"
                class="px-3 py-1.5 rounded-lg text-white text-xs"
                style="background:#C41E3A;"
                @click="handleEdit(item)"
              >
                <text>继续编辑</text>
              </view>
              <view
                v-else
                class="px-3 py-1.5 rounded-lg text-xs"
                style="color:#999;"
                @click="handleViewData(item)"
              >
                <text>📊 数据</text>
              </view>
            </view>
          </view>

          <!-- 操作菜单 -->
          <view v-if="showActions === item.id" class="flex items-center justify-end gap-2 px-3 pb-3 pt-2" style="border-top:1px solid #E8E0D5;">
            <view class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style="color:#666;" @click="handleEdit(item)">
              <text></text>
              <text>编辑</text>
            </view>
            <view class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style="color:#666;" @click="handleViewData(item)">
              <text>📊</text>
              <text>数据详情</text>
            </view>
            <view class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style="color:#C41E3A;" @click="handleDelete(item)">
              <text>🗑</text>
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="flex flex-col items-center justify-center py-16">
        <view class="w-32 h-32 rounded-full flex items-center justify-center mb-4" style="background:rgba(245,241,235,0.5);">
          <text class="text-4xl" style="color:rgba(153,153,153,0.3);">📹</text>
        </view>
        <text class="text-lg font-medium block mb-2" style="color:#2C2C2C;">暂无直播记录</text>
        <text class="text-sm text-center block mb-6" style="color:#999;">开始你的第一场直播，与粉丝实时互动</text>
        <view
          class="px-6 py-3 rounded-xl text-white flex items-center gap-2"
          style="background:linear-gradient(135deg, #C41E3A, #C9A96E);"
          @click="goTo('/pages/creator/live/create/index')"
        >
          <text></text>
          <text>创建直播</text>
        </view>
      </view>
    </view>

    <!-- 底部悬浮按钮 - 快速开播 -->
    <view class="fixed bottom-6 right-4 z-30">
      <view
        class="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style="background:linear-gradient(135deg, #EF4444, #EC4899);box-shadow:0 4px 14px rgba(239,68,68,0.3);"
        @click="goTo('/pages/creator/live/console/index')"
      >
        <text class="text-white text-xl">📡</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface StatItem {
  id: number; label: string; value: string; unit: string; icon: string; gradient: string
}

const statsData: StatItem[] = [
  { id: 1, label: '本月直播', value: '12', unit: '场', icon: '📹', gradient: 'linear-gradient(135deg, #3B82F6, #6366F1)' },
  { id: 2, label: '累计观看', value: '8.6', unit: '万', icon: '', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
  { id: 3, label: '新增粉丝', value: '1,280', unit: '', icon: '', gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
  { id: 4, label: '打赏收入', value: '¥3,680', unit: '', icon: '🎁', gradient: 'linear-gradient(135deg, #F59E0B, #F97316)' },
  { id: 5, label: '带货成交', value: '¥12,800', unit: '', icon: '', gradient: 'linear-gradient(135deg, #10B981, #14B8A6)' },
]

interface LiveItem {
  id: number; title: string; cover: string; type: string; status: string;
  scheduledTime: string; duration: string; viewers: number; peakViewers: number;
  income: number; likes: number; previewCount?: number
}

const liveList: LiveItem[] = [
  { id: 1, title: '八字命理入门：如何快速解读四柱八字', cover: '', type: 'knowledge', status: 'live', scheduledTime: '2024-01-15 20:00', duration: '进行中', viewers: 1258, peakViewers: 2100, income: 680, likes: 3200 },
  { id: 2, title: '开光貔貅专场：招财转运好物推荐', cover: '', type: 'commerce', status: 'preview', scheduledTime: '2024-01-16 19:30', duration: '-', viewers: 0, peakViewers: 0, income: 0, likes: 0, previewCount: 328 },
  { id: 3, title: '紫微斗数命盘实战解析', cover: '', type: 'knowledge', status: 'ended', scheduledTime: '2024-01-14 20:00', duration: '2小时15分', viewers: 5680, peakViewers: 3200, income: 1280, likes: 8900 },
  { id: 4, title: '风水布局直播：家居风水调整指南', cover: '', type: 'knowledge', status: 'ended', scheduledTime: '2024-01-12 19:00', duration: '1小时45分', viewers: 4200, peakViewers: 2800, income: 960, likes: 6500 },
  { id: 5, title: '新品预告直播（未发布）', cover: '', type: 'commerce', status: 'draft', scheduledTime: '', duration: '-', viewers: 0, peakViewers: 0, income: 0, likes: 0 },
]

const statusConfig: Record<string, { label: string; bgColor: string }> = {
  preview: { label: '预告中', bgColor: '#3B82F6' },
  live: { label: '直播中', bgColor: '#EF4444' },
  ended: { label: '已结束', bgColor: '#9CA3AF' },
  draft: { label: '草稿', bgColor: '#EAB308' },
}

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'preview', label: '预告中' },
  { key: 'live', label: '直播中' },
  { key: 'ended', label: '已结束' },
  { key: 'draft', label: '草稿' },
]

const activeTab = ref('all')
const showActions = ref<number | null>(null)

const filteredList = computed(() => {
  if (activeTab.value === 'all') return liveList
  return liveList.filter(item => item.status === activeTab.value)
})

function getTabCount(key: string): number {
  if (key === 'all') return liveList.length
  return liveList.filter(item => item.status === key).length
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

function toggleActions(id: number) {
  showActions.value = showActions.value === id ? null : id
}

function handleEdit(item: LiveItem) {
  uni.navigateTo({ url: '/pages/creator/live/create/index?id=' + item.id })
}

function handleViewData(item: LiveItem) {
  uni.navigateTo({ url: `/pages/creator/live/analytics/index?id=${item.id}` })
}

function handleDelete(item: LiveItem) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除"' + item.title + '"吗？',
    success(res) {
      if (res.confirm) {
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function handleNotify() {
  uni.navigateTo({ url: '/pages/notifications/index' })
}

function handleSettings() {
  uni.navigateTo({ url: '/pages/creator/live/settings/index' })
}

function goBack() { uni.navigateBack() }

function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
