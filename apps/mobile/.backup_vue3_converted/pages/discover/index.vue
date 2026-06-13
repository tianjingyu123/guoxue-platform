<template>
  <!-- 发现页 - 瀑布流内容聚合（V0 React 高保真转换） -->
  <view class="min-h-screen bg-background pb-14">
    <!-- 顶部固定区域 -->
    <view class="sticky top-0 z-30 bg-background">
      <!-- 搜索栏 -->
      <view class="px-4 py-3">
        <view
          class="flex items-center gap-[10px] px-4 py-[10px] rounded-full transition-all duration-300"
          :class="searchFocused ? 'bg-white shadow-[0_4px_16px_rgba(196,30,58,0.15)]' : 'bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)]'"
        >
          <text class="text-base leading-none shrink-0"></text>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索商品、课程、智能体..."
            class="flex-1 bg-transparent text-sm text-foreground outline-none border-none h-[22px] placeholder:text-muted-foreground"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @confirm="onSearch"
          />
        </view>

        <!-- 热搜词 -->
        <view class="flex items-center gap-2 mt-3 overflow-hidden">
          <view class="flex items-center gap-1 shrink-0">
            <text class="text-base"></text>
            <text class="text-xs text-muted-foreground whitespace-nowrap">热搜</text>
          </view>
          <scroll-view class="whitespace-nowrap overflow-x-scroll flex flex-row gap-2 scrollbar-width-none" scroll-x enable-flex>
            <view
              v-for="(word, i) in hotWords"
              :key="word"
              class="inline-flex shrink-0 px-3 py-1 rounded-full text-xs transition-all duration-200 mr-1"
              :class="i === 0 ? 'bg-[rgba(196,30,58,0.1)] text-primary font-medium' : 'bg-white/60 text-foreground active:bg-white'"
              @click="onHotWordTap(word)"
            >
              <text>{{ word }}</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 分类入口 -->
      <view class="px-4 pb-4">
        <view class="grid grid-cols-4 gap-2">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="flex flex-col items-center gap-[6px]"
            @click="goTo(cat.href)"
            hover-class="opacity-70"
            :hover-stay-time="100"
          >
            <view class="w-12 h-12 rounded-2xl bg-[rgba(196,30,58,0.08)] flex items-center justify-center">
              <text class="text-2xl leading-none">{{ cat.icon }}</text>
            </view>
            <text class="text-xs text-foreground">{{ cat.label }}</text>
          </view>
        </view>
      </view>

      <!-- 分隔线 -->
      <view class="h-2 bg-muted" />
    </view>

    <!-- 瀑布流内容 - 双列 Masonry -->
    <view class="px-[5px] py-3">
      <view class="flex gap-2 items-start">
        <view class="flex-1 flex flex-col gap-2 min-w-0">
          <view
            v-for="(item, i) in leftColumn"
            :key="'l-' + item.data.id"
            class="break-inside-avoid w-full"
          >
            <FeedCard :item="item" />
          </view>
        </view>
        <view class="flex-1 flex flex-col gap-2 min-w-0">
          <view
            v-for="(item, i) in rightColumn"
            :key="'r-' + item.data.id"
            class="break-inside-avoid w-full"
          >
            <FeedCard :item="item" />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部导航栏 -->
    <view class="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom,0)] z-[100]">
      <view
        v-for="tab in bottomTabs"
        :key="tab.id"
        class="flex flex-col items-center gap-[2px] py-[6px] min-w-[64px]"
        @click="onBottomTabTap(tab)"
      >
        <text class="text-xl leading-none">{{ tab.icon }}</text>
        <text class="text-[10px]" :class="tab.active ? 'text-primary font-medium' : 'text-muted-foreground'">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FeedCard from './feed-card.vue'

// ── 响应式状态 ──
const searchQuery = ref('')
const searchFocused = ref(false)

// ── 热搜词 ──
const hotWords = ['八字入门', '紫微斗数', '风水罗盘', '开运水晶', '六爻占卜']

// ── 分类入口 ──
const categories = [
  { id: 'mall', icon: '', label: '商城', href: '/pages/mall/index' },
  { id: 'course', icon: '', label: '课程', href: '/pages/courses/index' },
  { id: 'agent', icon: '🤖', label: '智能体', href: '/pages/agents/index' },
  { id: 'classics', icon: '📜', label: '古籍', href: '/pages/classics/index' },
  { id: 'video', icon: '▶', label: '视频', href: '/pages/videos/index' },
  { id: 'live', icon: '📡', label: '直播', href: '/pages/live/index' },
  { id: 'flash', icon: '⚡', label: '秒杀', href: '/pages/flash-sale/index' },
  { id: 'rank', icon: '📈', label: '榜单', href: '/pages/rankings/index' },
]

// ── 底部导航 ──
const bottomTabs = [
  { id: 'home', icon: '🏠', label: '首页', active: false, href: '/pages/index/index' },
  { id: 'discover', icon: '', label: '发现', active: true, href: '' },
  { id: 'message', icon: '', label: '消息', active: false, href: '/pages/im/conversations/index' },
  { id: 'mine', icon: '', label: '我的', active: false, href: '/pages/mine/settings/index' },
]

// ── 数据类型 ──
interface ProductCardData {
  id: string; title: string; cover: string; coverRatio?: string
  price: number; originalPrice: number; sales: number; tag?: string
}
interface AgentCardData {
  id: string; name: string; avatar: string; description: string
  useCount: number; rating: number; tag?: string
}
interface CourseCardData {
  id: string; title: string; cover: string; coverRatio?: string
  teacher: string; teacherAvatar: string; price: number
  originalPrice: number; students: number; lessons: number; tag?: string
}
interface LiveCardData {
  id: string; title: string; host: string; hostAvatar: string
  cover: string; coverRatio?: string; viewers?: number; reservations?: number
  status: string; scheduledTime?: string; liveType: string
}
interface ClassicCardData {
  id: string; title: string; author: string; dynasty: string
  description: string; isFree?: boolean; hasAudio?: boolean; readers: number
}
interface VideoCardData {
  id: string; title: string; cover: string; coverRatio?: string
  author: string; plays: number; likes: number; duration: string
}
type FeedItem =
  | { kind: 'product'; data: ProductCardData }
  | { kind: 'course'; data: CourseCardData }
  | { kind: 'live'; data: LiveCardData }
  | { kind: 'agent'; data: AgentCardData }
  | { kind: 'classic'; data: ClassicCardData }
  | { kind: 'video'; data: VideoCardData }

// ── 瀑布流数据（V0完整保留） ──
const feedItems: FeedItem[] = [
  {
    kind: 'product',
    data: {
      id: 'p1', title: '天然黑曜石貔貅手链 招财转运',
      cover: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80',
      coverRatio: '3/4', price: 128, originalPrice: 268, sales: 2600, tag: '热销',
    },
  },
  {
    kind: 'agent',
    data: {
      id: 'a1', name: '八字命理大师',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      description: '精准分析四柱八字，解读事业财运婚姻', useCount: 128000, rating: 4.9, tag: 'HOT',
    },
  },
  {
    kind: 'course',
    data: {
      id: 'c1', title: '紫微斗数入门到精通',
      cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
      coverRatio: '1/1', teacher: '林道长',
      teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
      price: 199, originalPrice: 399, students: 3200, lessons: 36, tag: '系统课',
    },
  },
  {
    kind: 'live',
    data: {
      id: 'l1', title: '八字实战：如何看婚姻宫', host: '易学张老师',
      hostAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80',
      cover: 'https://images.unsplash.com/photo-1557425493-6f90ae4659fc?w=400&q=80',
      coverRatio: '3/4', viewers: 13000, status: 'live', liveType: 'knowledge',
    },
  },
  {
    kind: 'classic',
    data: {
      id: 'b1', title: '渊海子平', author: '徐子平', dynasty: '宋',
      description: '命理学开山之作，八字预测必读经典', isFree: true, readers: 62000,
    },
  },
  {
    kind: 'video',
    data: {
      id: 'v1', title: '一分钟看懂你的命宫主星是什么',
      cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
      coverRatio: '3/4', author: '紫微门人', plays: 286000, likes: 12000, duration: '01:23',
    },
  },
  {
    kind: 'product',
    data: {
      id: 'p2', title: '专业风水罗盘 纯铜精工',
      cover: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80',
      coverRatio: '1/1', price: 298, originalPrice: 598, sales: 890, tag: '秒杀',
    },
  },
  {
    kind: 'agent',
    data: {
      id: 'a2', name: '周易占卜师',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
      description: '六爻起卦断事，趋吉避凶指引方向', useCount: 86000, rating: 4.8, tag: '精准',
    },
  },
  {
    kind: 'course',
    data: {
      id: 'c2', title: '风水堪舆实战班',
      cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
      coverRatio: '1/1', teacher: '王大师',
      teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
      price: 299, originalPrice: 599, students: 1800, lessons: 48, tag: 'TOP3',
    },
  },
  {
    kind: 'classic',
    data: {
      id: 'b2', title: '滴天髓', author: '刘伯温', dynasty: '明',
      description: '命理学巅峰之作，论命精髓尽在此书', hasAudio: true, readers: 45000,
    },
  },
  {
    kind: 'live',
    data: {
      id: 'l2', title: '开运水晶专场 限量秒杀', host: '福缘阁主',
      hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
      cover: 'https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=400&q=80',
      coverRatio: '3/4', reservations: 328, status: 'upcoming', scheduledTime: '今晚 20:00', liveType: 'commerce',
    },
  },
  {
    kind: 'video',
    data: {
      id: 'v2', title: '客厅财位怎么找？三步定位法',
      cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
      coverRatio: '1/1', author: '风水王老师', plays: 563000, likes: 38000, duration: '02:45',
    },
  },
  {
    kind: 'product',
    data: {
      id: 'p3', title: '开光五帝钱挂件 镇宅化煞',
      cover: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80',
      coverRatio: '1/1', price: 58, originalPrice: 128, sales: 4500, tag: '新品',
    },
  },
  {
    kind: 'course',
    data: {
      id: 'c3', title: '六爻预测从零开始',
      cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80',
      coverRatio: '3/4', teacher: '陈老师',
      teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
      price: 128, originalPrice: 299, students: 1300, lessons: 24,
    },
  },
]

// ── 瀑布流双列拆分（Masonry 效果） ──
const leftColumn = computed<FeedItem[]>(() => feedItems.filter((_, i) => i % 2 === 0))
const rightColumn = computed<FeedItem[]>(() => feedItems.filter((_, i) => i % 2 === 1))

// ── 工具函数 ──
function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function goTo(url: string) {
  if (!url) return
  uni.navigateTo({ url })
}

function onSearch() {
  if (!searchQuery.value.trim()) return
  uni.navigateTo({ url: '/pages/search/index?q=' + encodeURIComponent(searchQuery.value.trim()) })
}

function onHotWordTap(word: string) {
  searchQuery.value = word
  uni.navigateTo({ url: '/pages/search/index?q=' + encodeURIComponent(word) })
}

function onBottomTabTap(tab: { id: string; active: boolean; href: string }) {
  if (tab.active || !tab.href) return
  uni.switchTab({ url: tab.href })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
