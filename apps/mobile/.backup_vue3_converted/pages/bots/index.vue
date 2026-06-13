<template>
  <view class="min-h-screen bg-background">
    <!-- 骨架屏 -->
    <view v-if="loading" class="min-h-screen bg-background">
      <view class="bg-gradient-to-r from-primary to-[#A01830] text-white p-4 pb-6">
        <view class="flex items-center gap-3 mb-4">
          <view class="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
          <view class="h-6 w-32 bg-white/20 animate-pulse rounded" />
        </view>
        <view class="h-10 w-full rounded-full bg-white/20 animate-pulse" />
      </view>
      <view class="p-4 space-y-4">
        <view class="flex gap-2 overflow-x-auto pb-2">
          <view v-for="i in 5" :key="i" class="h-8 w-20 rounded-full bg-muted animate-pulse flex-shrink-0" />
        </view>
        <view class="grid grid-cols-2 gap-3">
          <view v-for="i in 4" :key="i" class="h-48 rounded-xl bg-muted animate-pulse" />
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <text class="text-4xl mb-4">😵</text>
      <text class="text-gray-500 mb-4">{{ error }}</text>
      <view class="px-6 py-2 bg-primary text-white rounded-full text-sm" @click="onRetry">
        <text>重新加载</text>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else class="min-h-screen bg-background">
      <!-- 顶部导航 -->
      <view class="bg-gradient-to-r from-primary to-[#A01830] text-white">
        <view class="p-4 pb-2">
          <!-- 标题栏 -->
          <view class="flex items-center justify-between mb-4">
            <view class="flex items-center gap-3">
              <view class="w-8 h-8 flex items-center justify-center" @click="goBack">
                <text class="text-white text-lg">◀</text>
              </view>
              <text class="text-lg font-bold flex items-center gap-2">
                <text class="text-lg"></text>
                智能体广场
              </text>
            </view>
            <view class="flex items-center px-3 py-1.5" @click="goToRanking">
              <text class="text-xs text-white mr-1">📈</text>
              <text class="text-xs text-white">排行榜</text>
            </view>
          </view>

          <!-- 搜索框（点击打开弹层） -->
          <view class="flex items-center bg-white/20 rounded-full px-4 py-2" @click="showSearch = true">
            <text class="text-sm text-white/70 mr-2"></text>
            <text class="text-sm text-white/70">搜索智能体...</text>
          </view>
        </view>

        <!-- 分类Tab -->
        <view class="px-4 pb-4 pt-2">
          <scroll-view scroll-x show-scrollbar="false" class="w-full">
            <view class="flex gap-2" style="display: inline-flex; white-space: nowrap;">
              <view
                v-for="cat in categories"
                :key="cat.id"
                :class="[
                  'flex-shrink-0 inline-flex items-center rounded-full px-3 py-1.5 text-sm transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-white text-primary'
                    : 'bg-white/20 text-white'
                ]"
                @click="handleCategoryChange(cat.id)"
              >
                <text class="mr-1">{{ categoryIcons[cat.id] || '🔲' }}</text>
                <text>{{ cat.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- Banner 轮播 -->
      <view v-if="banners.length > 0" class="px-4 -mt-2">
        <view class="rounded-xl overflow-hidden shadow-lg">
          <image :src="banners[0].image" mode="aspectFill" class="w-full h-32" />
        </view>
      </view>

      <!-- 热门推荐 -->
      <view class="p-4">
        <view class="flex items-center justify-between mb-3">
          <text class="font-bold text-foreground flex items-center gap-2">
            <text class="text-lg text-primary"></text>
            热门智能体
          </text>
          <view class="flex items-center text-sm text-primary" @click="handleCategoryChange('all')">
            <text>查看全部</text>
            <text class="ml-1">▶</text>
          </view>
        </view>

        <!-- 列表加载骨架 -->
        <view v-if="listLoading" class="grid grid-cols-2 gap-3">
          <view v-for="i in 4" :key="i" class="h-48 rounded-xl bg-muted animate-pulse" />
        </view>

        <!-- Bot 卡片网格 -->
        <view v-else-if="botList.length > 0" class="grid grid-cols-2 gap-3">
          <view
            v-for="bot in botList"
            :key="bot.id"
            class="bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
            @click="handleBotClick(bot.id)"
          >
            <!-- 头像和标签 -->
            <view class="relative mb-3 flex justify-center">
              <image :src="bot.avatar" mode="aspectFill" class="w-14 h-14 rounded-xl" />
              <!-- 官方认证 -->
              <view v-if="bot.isOfficial" class="absolute -top-1 -right-1">
                <text class="text-primary text-base"></text>
              </view>
              <!-- NEW 标签 -->
              <view v-if="bot.isNew" class="absolute -top-1 -left-1 bg-green-500 text-white text-[10px] px-1 rounded">
                <text>NEW</text>
              </view>
            </view>

            <!-- 名称 -->
            <text class="font-medium text-foreground text-center text-sm truncate block">{{ bot.name }}</text>

            <!-- 描述 -->
            <text class="text-xs text-gray-500 text-center line-clamp-2 block mb-2" style="min-height: 32px;">{{ bot.description }}</text>

            <!-- 评分和热度 -->
            <view class="flex items-center justify-between text-xs">
              <view class="flex items-center gap-1 text-accent">
                <text class="text-xs"></text>
                <text>{{ bot.rating }}</text>
              </view>
              <view class="flex items-center gap-1 text-gray-400">
                <text class="text-xs"></text>
                <text>{{ formatHotScore(bot.useCount) }}</text>
              </view>
            </view>

            <!-- 价格标签 -->
            <view class="mt-2 text-center">
              <view v-if="bot.isFree" class="inline-block text-green-600 border border-green-200 bg-green-50 text-[10px] px-1.5 py-0.5 rounded">
                <text>免费使用</text>
              </view>
              <view v-else class="inline-block bg-accent text-white text-[10px] px-1.5 py-0.5 rounded">
                <text class="mr-0.5">👑</text>
                <text>{{ bot.price }}元/次</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="flex flex-col items-center justify-center py-10">
          <text class="text-4xl mb-4">🤖</text>
          <text class="text-sm text-gray-400">暂无智能体</text>
        </view>
      </view>

      <!-- 新上线 -->
      <view v-if="newBots.length > 0" class="p-4 pt-0">
        <view class="flex items-center justify-between mb-3">
          <text class="font-bold text-foreground flex items-center gap-2">
            <text class="text-lg text-accent"></text>
            新上线
          </text>
        </view>
        <scroll-view scroll-x show-scrollbar="false" class="pb-2">
          <view class="flex gap-3" style="display: inline-flex;">
            <view
              v-for="bot in newBots"
              :key="bot.id"
              class="flex-shrink-0 w-32 bg-white rounded-xl p-3 shadow-sm border border-gray-100"
              @click="handleBotClick(bot.id)"
            >
              <image :src="bot.avatar" mode="aspectFill" class="w-12 h-12 rounded-xl mx-auto mb-2" />
              <text class="text-sm font-medium text-center truncate block">{{ bot.name }}</text>
              <text class="text-[10px] text-gray-400 text-center mt-1 block">{{ bot.categoryName }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- AI 推荐 Feed -->
      <view v-if="feedCards.length > 0" class="p-4 pt-0">
        <text class="font-bold text-foreground mb-3 block">为你推荐</text>
        <view class="space-y-3">
          <view
            v-for="card in feedCards"
            :key="card.id"
            class="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            @click="goToFeed(card.link)"
          >
            <!-- bot_recommend 类型 -->
            <view v-if="card.type === 'bot_recommend' && card.bot" class="flex items-center gap-3">
              <image :src="card.bot.avatar" mode="aspectFill" class="w-12 h-12 rounded-xl" />
              <view class="flex-1 min-w-0">
                <view class="flex items-center gap-2">
                  <text class="font-medium text-foreground truncate">{{ card.bot.name }}</text>
                  <view v-if="card.bot.isRecommended" class="bg-primary text-white text-[10px] px-1 rounded">
                    <text>推荐</text>
                  </view>
                </view>
                <text class="text-sm text-gray-500 truncate block">{{ card.description }}</text>
              </view>
              <text class="text-gray-300 text-base">▶</text>
            </view>

            <!-- hot_topic 类型 -->
            <view v-if="card.type === 'hot_topic' && card.topic" class="flex items-center gap-3">
              <view class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <text class="text-white text-lg"></text>
              </view>
              <view class="flex-1">
                <text class="font-medium text-foreground block">#{{ card.topic.name }}</text>
                <text class="text-sm text-gray-500">{{ card.topic.discussCount }}人讨论</text>
              </view>
              <text class="text-gray-300 text-base">▶</text>
            </view>

            <!-- user_story 类型 -->
            <view v-if="card.type === 'user_story' && card.story">
              <view class="flex items-center gap-2 mb-2">
                <image :src="card.story.user.avatar" mode="aspectFill" class="w-6 h-6 rounded-full" />
                <text class="text-sm text-gray-600">{{ card.story.user.name }}</text>
                <view class="inline-block border border-gray-200 rounded text-[10px] px-1">
                  <text>使用了{{ card.story.botName }}</text>
                </view>
              </view>
              <text class="text-gray-700 text-sm">{{ card.story.content }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部安全间距 -->
      <view class="h-20" />

      <!-- 搜索弹层 -->
      <view v-if="showSearch" class="fixed inset-0 bg-white z-50">
        <view class="p-4">
          <view class="flex items-center gap-3 mb-4">
            <view class="w-8 h-8 flex items-center justify-center" @click="showSearch = false">
              <text class="text-gray-700 text-lg">◀</text>
            </view>
            <view class="flex-1 relative">
              <text class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></text>
              <input
                v-model="searchKeyword"
                placeholder="搜索智能体..."
                class="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 text-sm"
                focus
              />
            </view>
            <view class="text-primary text-sm font-medium" @click="doSearch">
              <text>搜索</text>
            </view>
          </view>
          <!-- 热门搜索 -->
          <view>
            <text class="text-sm font-medium text-gray-500 mb-2 block">热门搜索</text>
            <view class="flex flex-wrap gap-2">
              <view
                v-for="tag in hotSearchTags"
                :key="tag"
                class="inline-block border border-gray-200 rounded-full px-3 py-1 text-sm"
                @click="handleHotSearch(tag)"
              >
                <text>{{ tag }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 类型定义
type BotCategory = 'all' | 'bazi' | 'fengshui' | 'health' | 'divination' | 'naming' | 'dream' | 'face' | 'palm' | 'other'

interface CategoryItem {
  id: BotCategory
  name: string
}

interface BannerItem {
  image: string
}

interface BotItem {
  id: number
  avatar: string
  name: string
  description: string
  isOfficial: boolean
  isNew: boolean
  rating: number
  useCount: number
  isFree: boolean
  price: number
  categoryName: string
}

interface FeedCardBot {
  avatar: string
  name: string
  isRecommended: boolean
}

interface FeedCardTopic {
  name: string
  discussCount: number
}

interface FeedCardStory {
  user: { avatar: string; name: string }
  botName: string
  content: string
}

interface FeedCard {
  id: number
  type: 'bot_recommend' | 'hot_topic' | 'user_story'
  description?: string
  link: string
  bot?: FeedCardBot
  topic?: FeedCardTopic
  story?: FeedCardStory
}

// 分类图标映射
const categoryIcons: Record<string, string> = {
  all: '🔲',
  bazi: '',
  fengshui: '🧭',
  health: '',
  divination: '',
  naming: '✏️',
  dream: '',
  face: '',
  palm: '✋',
  other: '⋯',
}

// 热门搜索标签
const hotSearchTags = ['八字', '起名', '风水', '塔罗', '解梦', '养生']

// Mock 分类数据
const categories: CategoryItem[] = [
  { id: 'all', name: '全部' },
  { id: 'bazi', name: '八字' },
  { id: 'fengshui', name: '风水' },
  { id: 'health', name: '养生' },
  { id: 'divination', name: '占卜' },
  { id: 'naming', name: '起名' },
  { id: 'dream', name: '解梦' },
  { id: 'face', name: '相面' },
  { id: 'palm', name: '手相' },
  { id: 'other', name: '其他' },
]

// Mock 数据生成
function createMockBots(): BotItem[] {
  return [
    { id: 1, avatar: 'https://picsum.photos/seed/bot1/100/100', name: '八字命理分析师', description: '专业八字排盘、运势分析、命理解读', isOfficial: true, isNew: false, rating: 4.9, useCount: 12800, isFree: false, price: 19.9, categoryName: '八字' },
    { id: 2, avatar: 'https://picsum.photos/seed/bot2/100/100', name: '紫微斗数大师', description: '紫微命盘解读、格局分析、流年预测', isOfficial: true, isNew: false, rating: 4.8, useCount: 8560, isFree: false, price: 29.9, categoryName: '紫微斗数' },
    { id: 3, avatar: 'https://picsum.photos/seed/bot3/100/100', name: '风水布局顾问', description: '家居风水、办公室布局、财运提升', isOfficial: true, isNew: true, rating: 4.7, useCount: 6280, isFree: false, price: 39.9, categoryName: '风水' },
    { id: 4, avatar: 'https://picsum.photos/seed/bot4/100/100', name: '易经占卜师', description: '六爻占卜、卦象解读、事态预测', isOfficial: true, isNew: false, rating: 4.6, useCount: 5120, isFree: true, price: 0, categoryName: '易经' },
    { id: 5, avatar: 'https://picsum.photos/seed/bot5/100/100', name: '奇门遁甲参谋', description: '奇门遁甲择吉、方位选择、决策参谋', isOfficial: false, isNew: true, rating: 4.5, useCount: 3860, isFree: false, price: 49.9, categoryName: '奇门遁甲' },
    { id: 6, avatar: 'https://picsum.photos/seed/bot6/100/100', name: '姓名学专家', description: '姓名五行分析、吉凶判定、改名建议', isOfficial: false, isNew: false, rating: 4.4, useCount: 3240, isFree: true, price: 0, categoryName: '姓名学' },
  ]
}

function createMockFeedCards(): FeedCard[] {
  return [
    {
      id: 1, type: 'bot_recommend', description: 'AI智能分析您的八字命盘，精准解读人生走向', link: '/bots/chat/1',
      bot: { avatar: 'https://picsum.photos/seed/bot1/100/100', name: '八字命理分析师', isRecommended: true },
    },
    {
      id: 2, type: 'hot_topic', link: '/bots/topic/bazi',
      topic: { name: '八字排盘热门话题', discussCount: 1280 },
    },
    {
      id: 3, type: 'user_story', link: '/bots/story/1',
      story: { user: { avatar: 'https://picsum.photos/seed/user1/100/100', name: '易学爱好者' }, botName: '八字命理分析师', content: '用了这个智能体后，我对自己的命理有了全新的认识，推荐！' },
    },
  ]
}

function createMockNewBots(): BotItem[] {
  return [
    { id: 7, avatar: 'https://picsum.photos/seed/bot7/100/100', name: '塔罗占卜师', description: '塔罗牌占卜', isOfficial: false, isNew: true, rating: 4.3, useCount: 980, isFree: false, price: 9.9, categoryName: '占卜' },
    { id: 8, avatar: 'https://picsum.photos/seed/bot8/100/100', name: '养生顾问', description: '中医养生建议', isOfficial: false, isNew: true, rating: 4.2, useCount: 650, isFree: true, price: 0, categoryName: '养生' },
  ]
}

// 状态
const loading = ref(true)
const listLoading = ref(false)
const error = ref<string | null>(null)
const selectedCategory = ref<BotCategory>('all')
const searchKeyword = ref('')
const showSearch = ref(false)
const botList = ref<BotItem[]>([])
const allBots = ref<BotItem[]>(createMockBots())
const banners = ref<BannerItem[]>([])
const newBots = ref<BotItem[]>([])
const feedCards = ref<FeedCard[]>([])

// 加载数据
onMounted(() => {
  setTimeout(() => {
    try {
      banners.value = [{ image: 'https://picsum.photos/seed/banner/400/160' }]
      newBots.value = createMockNewBots()
      feedCards.value = createMockFeedCards()
      botList.value = allBots.value.filter(b => b.useCount > 5000) // hot bots
    } catch {
      error.value = '加载失败，请重试'
    } finally {
      loading.value = false
    }
  }, 800)
})

// 切换分类
const handleCategoryChange = (category: BotCategory) => {
  selectedCategory.value = category
  listLoading.value = true
  setTimeout(() => {
    if (category === 'all') {
      botList.value = allBots.value
    } else {
      botList.value = allBots.value.filter(b => b.categoryName.includes(getCategoryName(category)) || category === 'all')
      if (category === 'bazi') botList.value = allBots.value.filter(b => b.id === 1 || b.id === 6)
      if (category === 'fengshui') botList.value = allBots.value.filter(b => b.id === 3)
      if (category === 'divination') botList.value = allBots.value.filter(b => b.id === 4 || b.id === 7)
      if (category === 'naming') botList.value = allBots.value.filter(b => b.id === 6)
      if (category === 'health') botList.value = allBots.value.filter(b => b.id === 8)
    }
    listLoading.value = false
  }, 300)
}

function getCategoryName(id: BotCategory): string {
  const map: Record<string, string> = {
    all: '', bazi: '八字', fengshui: '风水', health: '养生',
    divination: '占卜', naming: '姓名', dream: '解梦', face: '相面', palm: '手相', other: '其他',
  }
  return map[id] || ''
}

// 评分热度格式化
function formatHotScore(count: number): string {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

// 导航
function goBack() { uni.navigateBack() }

function handleBotClick(botId: number) {
  uni.navigateTo({ url: `/pages/bots/chat/botId-detail/index?botId=${botId}` })
}

function goToRanking() {
  uni.navigateTo({ url: '/pages/bots/ranking/index' })
}

function doSearch() {
  if (!searchKeyword.value.trim()) return
  uni.navigateTo({ url: `/pages/bots/search/index?q=${encodeURIComponent(searchKeyword.value)}` })
}

function handleHotSearch(tag: string) {
  searchKeyword.value = tag
  uni.navigateTo({ url: `/pages/bots/search/index?q=${encodeURIComponent(tag)}` })
}

function goToFeed(link: string) {
  uni.navigateTo({ url: link })
}

function onRetry() {
  loading.value = true
  error.value = null
  setTimeout(() => {
    loading.value = false
  }, 500)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
