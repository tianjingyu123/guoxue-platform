<template>
  <view v-if="loading" class="min-h-screen bg-background">
    <view class="sticky top-0 z-20 bg-white border-b border-border px-4 py-3 h-14" />
    <view class="p-4 space-y-4">
      <view class="flex gap-3 overflow-x-auto pb-2">
        <view v-for="i in 5" :key="i" class="w-20 h-10 bg-gray-200 rounded-full animate-pulse shrink-0" />
      </view>
      <view class="h-48 bg-gray-200 rounded-2xl animate-pulse" />
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="aspect-video bg-gray-200 rounded-xl animate-pulse" />
      </view>
    </view>
  </view>

  <view v-else class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="sticky top-0 z-20 bg-gradient-to-r from-primary to-[#D4456A] text-white">
      <view class="flex items-center justify-between px-4 py-3">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="text-2xl text-white">←</text>
        </view>
        <text class="text-lg font-semibold">直播回放</text>
        <view @click="showSearch = true" class="p-1 -mr-1">
          <text class="text-white"></text>
        </view>
      </view>
    </view>

    <!-- 搜索覆盖层 -->
    <view v-if="showSearch" class="fixed inset-0 z-50 bg-white">
      <view class="flex items-center gap-3 px-4 py-3 border-b border-border">
        <view class="flex-1 flex items-center gap-2 bg-background rounded-full px-4 py-2">
          <text class="text-gray-400"></text>
          <input
            v-model="searchQuery"
            placeholder="搜索回放..."
            class="flex-1 bg-transparent text-sm outline-none"
            focus
          />
          <text v-if="searchQuery" @click="searchQuery = ''" class="text-gray-400">✕</text>
        </view>
        <text @click="showSearch = false" class="text-primary text-sm">取消</text>
      </view>
      <view class="p-4">
        <view v-if="searchQuery">
          <view v-for="r in filteredSearch" :key="r.id" @click="goTo('/pages/live/id-detail/index?id=' + r.id + '&mode=replay')" class="flex gap-3 p-2 bg-white rounded-xl mb-2">
            <view class="w-24 aspect-video bg-gray-100 rounded-lg overflow-hidden relative shrink-0" />
            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium text-foreground line-clamp-2 block">{{ r.title }}</text>
              <text class="text-xs text-gray-500 block mt-1">{{ r.host.name }}</text>
            </view>
          </view>
        </view>
        <view v-else>
          <text class="text-sm font-medium text-foreground mb-3 block">热门搜索</text>
          <view class="flex flex-wrap gap-2">
            <text v-for="tag in hotTags" :key="tag" @click="searchQuery = tag" class="px-3 py-1.5 bg-background rounded-full text-sm text-gray-600">{{ tag }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="p-4 space-y-5">
      <!-- 分类导航 -->
      <view class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <view
          v-for="cat in categories"
          :key="cat.id"
          @click="selectedCategory = selectedCategory === cat.id ? null : cat.id"
          :class="['shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all', selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-border']"
        >
          <text>{{ cat.icon }}</text>
          <text>{{ cat.name }}</text>
          <text class="text-xs opacity-70">({{ cat.count }})</text>
        </view>
      </view>

      <!-- 热门回放 -->
      <view v-if="!selectedCategory">
        <view class="flex items-center justify-between mb-3">
          <text class="text-base font-semibold text-foreground">热门回放</text>
          <view @click="goTo('/pages/live/replays/index')" class="flex items-center gap-1 text-sm text-primary">
            <text>更多</text>
            <text>›</text>
          </view>
        </view>
        <view class="space-y-4">
          <view v-for="(replay, index) in hotReplays" :key="replay.id" @click="goTo('/pages/live/id-detail/index?id=' + replay.id + '&mode=replay')" class="bg-white rounded-2xl overflow-hidden shadow-sm">
            <view class="relative aspect-[16/9] bg-gray-100">
              <view class="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400" />
              <view class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <!-- 热门标签 -->
              <view class="absolute top-3 left-3 flex items-center gap-1 bg-primary text-white text-xs px-2 py-1 rounded-full">
                <text></text>
                <text>热门</text>
              </view>
              <!-- 排名 -->
              <view class="absolute top-3 right-3 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold">
                <text>{{ index + 1 }}</text>
              </view>
              <!-- 播放按钮 -->
              <view class="absolute inset-0 flex items-center justify-center">
                <view class="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <text class="text-white text-3xl ml-0.5">▶</text>
                </view>
              </view>
              <!-- 时长 -->
              <view class="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                <text>🕐</text>
                <text>{{ formatDuration(replay.duration) }}</text>
              </view>
              <!-- 底部信息 -->
              <view class="absolute bottom-3 left-3 right-20">
                <text class="text-white font-medium line-clamp-1 block">{{ replay.title }}</text>
              </view>
            </view>
            <view class="p-3 flex items-center justify-between">
              <view class="flex items-center gap-2">
                <view class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <text class="text-xs text-ink-soft">{{ replay.host.name[0] }}</text>
                </view>
                <text class="text-sm text-gray-700">{{ replay.host.name }}</text>
                <text class="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded">{{ replay.category }}</text>
              </view>
              <view class="flex items-center gap-1 text-sm text-gray-500">
                <text></text>
                <text>{{ formatViews(replay.views) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 回放列表 -->
      <view>
        <view class="flex items-center justify-between mb-3">
          <text class="text-base font-semibold text-foreground">
            {{ selectedCategory && selectedCategory !== 'all' ? getCategoryName(selectedCategory) + '回放' : '最新回放' }}
          </text>
          <view class="flex items-center gap-1 text-sm text-gray-500">
            <text>⚙</text>
            <text>筛选</text>
          </view>
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="replay in filteredReplays" :key="replay.id" @click="goTo('/pages/live/id-detail/index?id=' + replay.id + '&mode=replay')" class="bg-white rounded-xl overflow-hidden shadow-sm">
            <view class="relative aspect-video bg-gray-100">
              <view class="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400" />
              <view class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <!-- 回放标识 -->
              <view class="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                <text class="text-white text-xs">▶</text>
                <text>回放</text>
              </view>
              <!-- 时长 -->
              <view class="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                <text>{{ formatDuration(replay.duration) }}</text>
              </view>
            </view>
            <view class="p-2.5">
              <text class="text-sm font-medium text-foreground line-clamp-2 leading-tight block">{{ replay.title }}</text>
              <view class="flex items-center justify-between mt-2">
                <view class="flex items-center gap-1.5">
                  <view class="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <text class="text-[8px] text-ink-soft">{{ replay.host.name[0] }}</text>
                  </view>
                  <text class="text-xs text-gray-500">{{ replay.host.name }}</text>
                </view>
                <view class="flex items-center gap-0.5 text-xs text-gray-400">
                  <text></text>
                  <text>{{ formatViews(replay.views) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view class="text-center py-4">
        <text class="text-sm text-gray-400">上拉加载更多</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ReplayCategory {
  id: string; name: string; icon: string; count: number
}

interface ReplayItem {
  id: string; title: string; cover: string
  host: { id: string; name: string; avatar: string }
  duration: number; views: number; category: string; createdAt: string; isHot?: boolean
}

const categories: ReplayCategory[] = [
  { id: 'all', name: '全部', icon: '', count: 128 },
  { id: 'yijing', name: '易经', icon: '️', count: 35 },
  { id: 'fengshui', name: '风水', icon: '🏠', count: 28 },
  { id: 'bazi', name: '八字', icon: '', count: 24 },
  { id: 'meihua', name: '梅花', icon: '🌸', count: 18 },
  { id: 'liuyao', name: '六爻', icon: '⚊', count: 15 },
  { id: 'qimen', name: '奇门', icon: '🚪', count: 8 },
]

const hotReplays: ReplayItem[] = [
  { id: '1', title: '2024甲辰年运势全解析', cover: '', host: { id: 'h1', name: '玄真子', avatar: '' }, duration: 7200, views: 58600, category: '易经', createdAt: '2024-01-15', isHot: true },
  { id: '2', title: '家居风水布局实战课', cover: '', host: { id: 'h2', name: '明德居士', avatar: '' }, duration: 5400, views: 42300, category: '风水', createdAt: '2024-01-10', isHot: true },
]

const replayList: ReplayItem[] = [
  { id: '3', title: '八字入门：如何排盘与看命', cover: '', host: { id: 'h3', name: '子平先生', avatar: '' }, duration: 4800, views: 28500, category: '八字', createdAt: '2024-01-20' },
  { id: '4', title: '梅花易数断卦技巧', cover: '', host: { id: 'h4', name: '易林', avatar: '' }, duration: 3600, views: 19200, category: '梅花', createdAt: '2024-01-18' },
  { id: '5', title: '六爻预测实战案例分析', cover: '', host: { id: 'h5', name: '卦象大师', avatar: '' }, duration: 5100, views: 15800, category: '六爻', createdAt: '2024-01-16' },
  { id: '6', title: '奇门遁甲入门指南', cover: '', host: { id: 'h6', name: '遁甲居士', avatar: '' }, duration: 6000, views: 12400, category: '奇门', createdAt: '2024-01-14' },
]

const hotTags = ['易经入门', '风水布局', '八字排盘', '梅花易数', '运势解析']

const loading = ref(true)
const showSearch = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)

onMounted(() => {
  setTimeout(() => { loading.value = false }, 800)
})

const filteredSearch = computed(() =>
  replayList.filter(r => r.title.includes(searchQuery.value) || r.host.name.includes(searchQuery.value))
)

const filteredReplays = computed(() => {
  if (!selectedCategory.value || selectedCategory.value === 'all') return replayList
  return replayList.filter(r => r.category === categories.find(c => c.id === selectedCategory.value)?.name)
})

function getCategoryName(id: string): string {
  return categories.find(c => c.id === id)?.name || ''
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

function formatViews(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return String(num)
}

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
