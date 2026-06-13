<template>
<view class="min-h-screen bg-background pb-20">
  <!-- Header -->
  <view class="sticky top-0 z-10 bg-background border-b border-border">
    <view class="flex items-center justify-between px-4 py-3">
      <view class="flex items-center gap-3">
        <view @click="goBack" class="p-1 -ml-1">
          <text class="w-6 h-6">&#8249;</text>
        </view>
        <text class="text-lg font-semibold">悬赏广场</text>
      </view>
      <view @click="goTo('/pages/bounty/create')" class="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium">
        <text class="w-4 h-4">+</text>
        发布悬赏
      </view>
    </view>

    <!-- Status Tabs -->
    <scroll-view scroll-x class="flex gap-2 px-4 pb-3" style="white-space: nowrap;">
      <view v-for="tab in STATUS_TABS" :key="tab.key" @tap="activeTab = tab.key" :class="['px-4 py-1.5 rounded-full text-sm inline-block transition-colors', activeTab === tab.key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground']">
        {{ tab.label }}
      </view>
    </scroll-view>
  </view>

  <!-- Bounty List -->
  <view class="p-4 space-y-4">
    <!-- Skeleton Loading -->
    <view v-if="loading">
      <view v-for="i in 3" :key="i" class="bg-white rounded-2xl p-4 animate-pulse mb-4">
        <view class="flex items-start gap-3">
          <view class="w-10 h-10 rounded-full bg-muted"></view>
          <view class="flex-1 space-y-2">
            <view class="h-4 bg-muted rounded w-1/4"></view>
            <view class="h-5 bg-muted rounded w-3/4"></view>
            <view class="h-4 bg-muted rounded w-full"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- Empty State -->
    <view v-else-if="bounties.length === 0" class="text-center py-20">
      <view class="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <text class="text-5xl text-muted-foreground">&#128172;</text>
      </view>
      <text class="text-muted-foreground mb-4 block">暂无悬赏问题</text>
      <view @click="goTo('/pages/bounty/create')" class="px-6 py-2 bg-primary text-white rounded-full text-sm inline-block">
        发布悬赏
      </view>
    </view>

    <!-- Bounty List Items -->
    <view v-else v-for="bounty in bounties" :key="bounty.id" @click="goTo('/pages/bounty/id-detail?id=' + bounty.id)" class="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
      <!-- Header -->
      <view class="flex items-start gap-3 mb-3">
        <image v-if="bounty.poster.avatar" :src="bounty.poster.avatar" mode="aspectFill" class="w-10 h-10 rounded-full"></image>
        <view v-else class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <text class="text-sm text-muted-foreground">{{ bounty.poster.name[0] }}</text>
        </view>
        <view class="flex-1 min-w-0">
          <view class="flex items-center gap-2">
            <text class="text-sm font-medium">{{ bounty.poster.name }}</text>
            <text class="text-xs text-muted-foreground">{{ formatTime(bounty.createdAt) }}</text>
          </view>
          <text v-if="bounty.category" class="text-xs text-muted-foreground">{{ bounty.category }}</text>
        </view>
        <view :class="['px-2 py-0.5 rounded-full text-xs', STATUS_CONFIG[bounty.status]?.bg, STATUS_CONFIG[bounty.status]?.color]">
          {{ STATUS_CONFIG[bounty.status]?.label }}
        </view>
      </view>

      <!-- Content -->
      <text class="font-medium mb-2 block" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{{ bounty.title }}</text>
      <text class="text-sm text-muted-foreground block mb-3" style="overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">{{ bounty.description }}</text>

      <!-- Tags -->
      <view v-if="bounty.tags && bounty.tags.length > 0" class="flex flex-wrap gap-2 mb-3">
        <text v-for="tag in bounty.tags" :key="tag" class="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">#{{ tag }}</text>
      </view>

      <!-- Footer -->
      <view class="flex items-center justify-between pt-3 border-t border-border">
        <view class="flex items-center gap-4 text-xs text-muted-foreground">
          <view class="flex items-center gap-1">
            <text class="text-sm">&#128065;</text>
            <text>{{ bounty.viewCount }}</text>
          </view>
          <view class="flex items-center gap-1">
            <text class="text-sm">&#128172;</text>
            <text>{{ bounty.answerCount }}个回答</text>
          </view>
          <view v-if="bounty.status === 'open'" class="flex items-center gap-1 text-orange-500">
            <text class="text-sm">&#128339;</text>
            <text>{{ getRemainingTime(bounty.expireAt) }}</text>
          </view>
        </view>
        <view class="flex items-center gap-1 text-primary font-semibold">
          <text class="text-sm">&#127991;</text>
          <text>&#165;{{ bounty.amount }}</text>
        </view>
      </view>
    </view>
  </view>
</view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'

// 导航辅助
function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

interface Bounty {
  id: string
  title: string
  description: string
  amount: number
  status: string
  poster: { id: string; name: string; avatar: string }
  answerCount: number
  viewCount: number
  category: string
  tags: string[]
  createdAt: string
  expireAt: string
}

// Mock 数据
const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '进行中' },
  { key: 'resolved', label: '已解决' },
  { key: 'expired', label: '已过期' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: '进行中', color: 'text-green-600', bg: 'bg-green-50' },
  answered: { label: '待采纳', color: 'text-orange-600', bg: 'bg-orange-50' },
  resolved: { label: '已解决', color: 'text-blue-600', bg: 'bg-blue-50' },
  expired: { label: '已过期', color: 'text-muted-foreground', bg: 'bg-muted' },
  cancelled: { label: '已取消', color: 'text-muted-foreground', bg: 'bg-muted' },
}

const activeTab = ref('all')
const bounties = ref<Bounty[]>([])
const loading = ref(true)
const page = ref(1)
const hasMore = ref(true)

watch([activeTab], () => {
  loadBounties(true)
})

onMounted(() => {
  loadBounties(true)
})

const loadBounties = async (reset = false) => {
  if (reset) {
    loading.value = true
    page.value = 1
  }

  // Mock data
  const mockBounties: Bounty[] = [
    {
      id: '1',
      title: '求解八字命盘中的财运分析方法',
      description: '想了解如何从八字命盘中分析一个人的财运走势，包括正财、偏财的判断方法...',
      amount: 50,
      status: 'open',
      poster: { id: 'u1', name: '易学初学者', avatar: '' },
      answerCount: 3,
      viewCount: 128,
      category: '八字',
      tags: ['财运', '命盘分析'],
      createdAt: '2024-01-15T10:00:00Z',
      expireAt: '2024-01-22T10:00:00Z',
    },
    {
      id: '2',
      title: '风水布局中如何化解尖角煞？',
      description: '家里客厅有一个突出的墙角对着沙发，听说这是尖角煞，请问有什么化解方法？',
      amount: 30,
      status: 'resolved',
      poster: { id: 'u2', name: '风水爱好者', avatar: '' },
      answerCount: 5,
      viewCount: 256,
      category: '风水',
      tags: ['家居风水', '化煞'],
      createdAt: '2024-01-14T08:00:00Z',
      expireAt: '2024-01-21T08:00:00Z',
    },
    {
      id: '3',
      title: '梅花易数起卦时间问题请教',
      description: '用梅花易数起卦时，如果是别人问事，应该用问卦人的时间还是起卦人的时间？',
      amount: 20,
      status: 'answered',
      poster: { id: 'u3', name: '梅花学徒', avatar: '' },
      answerCount: 2,
      viewCount: 89,
      category: '梅花易数',
      tags: ['起卦', '时间'],
      createdAt: '2024-01-13T15:00:00Z',
      expireAt: '2024-01-20T15:00:00Z',
    },
    {
      id: '4',
      title: '六爻预测中的用神取用问题',
      description: '在六爻预测中，如何准确判断用神？特别是测事业和财运时的用神取法...',
      amount: 100,
      status: 'open',
      poster: { id: 'u4', name: '六爻研究者', avatar: '' },
      answerCount: 1,
      viewCount: 312,
      category: '六爻',
      tags: ['用神', '预测技巧'],
      createdAt: '2024-01-12T09:00:00Z',
      expireAt: '2024-01-19T09:00:00Z',
    },
    {
      id: '5',
      title: '奇门遁甲中的三奇六仪如何理解？',
      description: '刚开始学习奇门遁甲，对三奇六仪的概念比较模糊，希望能有详细的解释...',
      amount: 40,
      status: 'expired',
      poster: { id: 'u5', name: '奇门新手', avatar: '' },
      answerCount: 0,
      viewCount: 45,
      category: '奇门遁甲',
      tags: ['基础概念', '入门'],
      createdAt: '2024-01-01T10:00:00Z',
      expireAt: '2024-01-08T10:00:00Z',
    },
  ]

  const filtered = activeTab.value === 'all'
    ? mockBounties
    : mockBounties.filter(b => b.status === activeTab.value)

  setTimeout(() => {
    bounties.value = reset ? filtered : [...bounties.value, ...filtered]
    hasMore.value = false
    loading.value = false
  }, 500)
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const getRemainingTime = (expireAt: string) => {
  const expire = new Date(expireAt)
  const now = new Date()
  const diff = expire.getTime() - now.getTime()
  if (diff <= 0) return '已过期'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `剩余${days}天`
  return `剩余${hours}小时`
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
