<template>
  <view class="min-h-screen bg-background pb-24">
    <!-- 顶部搜索区 -->
    <view class="sticky top-0 z-50 bg-gradient-to-b from-primary to-[#A01530] pt-safe">
      <view class="px-4 pt-3 pb-4">
        <view class="flex items-center justify-between mb-3">
          <view class="flex items-center gap-2">
            <text class="text-[20px] font-bold text-white">智能体广场</text>
            <view class="px-2 py-0.5 bg-white/20 rounded-full">
              <text class="text-[11px] text-white/90">⚡ {{ hotBots.length }}个在线</text>
            </view>
          </view>
          <view class="flex items-center gap-1 text-white/80" @click="goTo('/pages/agents/history')">
            <text>🕐</text>
            <text class="text-sm">对话记录</text>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="relative">
          <view class="flex items-center bg-white rounded-xl px-3 py-2.5 shadow-lg">
            <text class="text-muted-foreground shrink-0"></text>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索智能体或直接提问..."
              class="flex-1 ml-2 text-[14px] bg-transparent outline-none text-[#333]"
            />
            <view v-if="searchQuery" class="p-1" @click="searchQuery = ''">
              <text class="text-muted-foreground">✕</text>
            </view>
            <view class="w-px h-5 bg-[#E5E5E5] mx-2" />
            <view
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              :class="isListening ? 'bg-primary animate-pulse' : 'bg-[#F5F0E8]'"
              @click="handleVoiceSearch"
            >
              <text></text>
            </view>
          </view>
          <view v-if="isListening" class="absolute inset-0 flex items-center justify-center bg-white rounded-xl">
            <view class="flex items-center gap-2">
              <view class="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <view class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay:150ms" />
              <view class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay:300ms" />
              <text class="ml-2 text-[14px] text-ink-soft">正在聆听...</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 主智能客服入口 -->
    <view class="px-4 pt-4">
      <view @click="goTo('/pages/agent/main')">
        <view class="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-4 overflow-hidden">
          <view class="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
          <view class="absolute bottom-0 left-0 w-24 h-24 bg-[#7C3AED]/20 rounded-full blur-2xl" />
          <view class="relative flex items-center gap-4">
            <view class="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[#7C3AED] flex items-center justify-center shadow-lg">
              <text class="text-2xl">🤖</text>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="text-white font-bold text-[16px]">热卜智能助手</text>
                <view class="px-1.5 py-0.5 bg-success rounded">
                  <text class="text-white text-[10px]">在线</text>
                </view>
              </view>
              <text class="text-white/60 text-[12px] mt-1 block">有任何问题都可以问我，我来帮您解答</text>
            </view>
            <view class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <text class="text-white"></text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 热门问答 -->
    <view class="px-4 pt-5">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text></text>
          <text class="font-bold text-foreground">大家都在问</text>
        </view>
        <view class="flex items-center text-sm text-muted-foreground" @click="goTo('/pages/agents/questions')">
          <text>更多</text>
          <text>›</text>
        </view>
      </view>
      <view class="space-y-2">
        <view v-for="(q, index) in hotQuestions.slice(0, 3)" :key="q.id" class="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm" @click="goTo('/pages/agent/main')">
          <text class="text-primary font-bold text-lg">{{ index + 1 }}</text>
          <text class="flex-1 text-sm text-foreground">{{ q.question }}</text>
          <view class="flex items-center gap-1 text-xs text-muted-foreground">
            <text></text>
            <text>{{ formatCount(q.views) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 智能体列表 -->
    <view class="px-4 pt-5">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <text>📈</text>
          <text class="font-bold text-foreground">智能体</text>
        </view>
        <view class="flex items-center gap-1 text-sm text-muted-foreground" @click="goTo('/pages/agents/ranking')">
          <text>👑</text>
          <text>热度榜</text>
        </view>
      </view>

      <!-- 智能体卡片 -->
      <view class="space-y-3">
        <view v-for="(bot, index) in displayBots" :key="bot.id" class="bg-white rounded-2xl p-4 shadow-sm" @click="goTo('/pages/agent/id-detail?id=' + bot.id)">
          <view class="flex items-start gap-3">
            <!-- 头像 -->
            <view class="relative shrink-0">
              <view class="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center" :class="bot.gradient">
                <image :src="bot.avatar" mode="aspectFill" class="w-10 h-10" />
              </view>
              <view
                v-if="index < 3"
                class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow"
                :class="index === 0 ? 'bg-[#FFD700] text-[#333]' : index === 1 ? 'bg-[#C0C0C0] text-white' : 'bg-[#CD7F32] text-white'"
              >
                <text>{{ index + 1 }}</text>
              </view>
            </view>

            <!-- 信息 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-bold text-[15px] text-foreground truncate">{{ bot.name }}</text>
                <text v-if="bot.isOfficial" class="text-accent shrink-0">👑</text>
                <view v-if="bot.isNew" class="px-1.5 py-0.5 bg-success rounded shrink-0">
                  <text class="text-white text-[9px]">NEW</text>
                </view>
              </view>
              <text class="text-[12px] text-ink-soft line-clamp-2 mt-1 block">{{ bot.description }}</text>

              <!-- 能力标签 -->
              <view v-if="bot.capabilities && bot.capabilities.length > 0" class="flex gap-1.5 mt-2 flex-wrap">
                <view v-for="(cap, i) in bot.capabilities.slice(0, 3)" :key="i" class="px-2 py-0.5 bg-[#F5F0E8] rounded-full">
                  <text class="text-[#8B7355] text-[10px]">{{ cap }}</text>
                </view>
              </view>

              <!-- 数据统计 -->
              <view class="flex items-center gap-3 mt-2">
                <view class="flex items-center gap-1">
                  <text class="text-[#FFB800]"></text>
                  <text class="text-[12px] text-ink-soft">{{ bot.rating }}</text>
                </view>
                <text class="text-[12px] text-muted-foreground">{{ formatCount(bot.useCount) }}次对话</text>
                <view v-if="bot.capabilities?.includes('语音对话')" class="flex items-center gap-0.5">
                  <text class="text-[#7C3AED]"></text>
                  <text class="text-[11px] text-[#7C3AED]">语音</text>
                </view>
              </view>
            </view>

            <!-- 对话按钮 -->
            <view class="shrink-0 self-center w-9 h-9 rounded-full bg-[#F5F0E8] flex items-center justify-center" @click.stop="goTo('/pages/agent/id-detail?id=' + bot.id)">
              <text class="text-primary"></text>
            </view>
          </view>
        </view>
      </view>

      <!-- 查看更多 -->
      <view
        v-if="hotBots.length > 4"
        class="mt-4 text-center"
        @click="showAllBots = !showAllBots"
      >
        <text class="text-sm text-primary">{{ showAllBots ? '收起' : '查看全部 ' + hotBots.length + ' 个智能体' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

function goBack() { uni.navigateBack() }
function goTo(url: string) { uni.navigateTo({ url }) }

interface Bot {
  id: string
  name: string
  avatar: string
  description: string
  category: string
  categoryName: string
  hotScore: number
  useCount: number
  rating: number
  ratingCount: number
  tags: string[]
  isOfficial: boolean
  isRecommended: boolean
  isNew: boolean
  isFree: boolean
  price?: number
  capabilities: string[]
  gradient: string
}

const hotBots: Bot[] = [
  {
    id: '1', name: '八字命理大师', avatar: 'https://via.placeholder.com/40/C41E3A/ffffff?text=八',
    description: '专业八字排盘解读，精准分析命局特点，为您揭示人生密码', category: 'bazi', categoryName: '八字命理',
    hotScore: 9856, useCount: 128000, rating: 4.9, ratingCount: 3256,
    tags: ['八字', '命理', '流年运势'], isOfficial: true, isRecommended: true, isNew: false, isFree: false,
    capabilities: ['语音对话', '图片识别', '深度解析'], gradient: 'from-primary to-[#A01530]',
  },
  {
    id: '2', name: '奇门遁甲助手', avatar: 'https://via.placeholder.com/40/7C3AED/ffffff?text=奇',
    description: '奇门遁甲起局断卦，预测事业、感情、财运，指点迷津', category: 'qimen', categoryName: '奇门遁甲',
    hotScore: 7823, useCount: 89000, rating: 4.8, ratingCount: 2134,
    tags: ['奇门', '预测', '决策'], isOfficial: true, isRecommended: true, isNew: false, isFree: true,
    capabilities: ['实时起局', '详细解读'], gradient: 'from-[#7C3AED] to-[#5B21B6]',
  },
  {
    id: '3', name: '国学经典导读', avatar: 'https://via.placeholder.com/40/059669/ffffff?text=经',
    description: '《易经》《道德经》等国学经典深度解读，让古籍活起来', category: 'guoxue', categoryName: '国学经典',
    hotScore: 6542, useCount: 67000, rating: 4.9, ratingCount: 1876,
    tags: ['易经', '国学', '智慧'], isOfficial: true, isRecommended: false, isNew: true, isFree: true,
    capabilities: ['语音朗读', '原文释义', '智慧问答'], gradient: 'from-[#059669] to-[#047857]',
  },
  {
    id: '4', name: '智能起名顾问', avatar: 'https://via.placeholder.com/40/EA580C/ffffff?text=名',
    description: '结合八字五行、三才五格，为宝宝取一个吉祥好名', category: 'naming', categoryName: '起名改名',
    hotScore: 8234, useCount: 102000, rating: 4.7, ratingCount: 2567,
    tags: ['起名', '五行', '吉祥'], isOfficial: false, isRecommended: true, isNew: false, isFree: false, price: 9.9,
    capabilities: ['五行分析', '寓意解读', '多方案推荐'], gradient: 'from-[#EA580C] to-[#C2410C]',
  },
  {
    id: '5', name: '紫微斗数解盘', avatar: 'https://via.placeholder.com/40/6366F1/ffffff?text=紫',
    description: '紫微斗数命盘解读，十二宫位详解，了解命运轨迹', category: 'ziwei', categoryName: '紫微斗数',
    hotScore: 5678, useCount: 56000, rating: 4.8, ratingCount: 1432,
    tags: ['紫微', '命盘', '宫位'], isOfficial: true, isRecommended: false, isNew: false, isFree: true,
    capabilities: ['命盘生成', '详细解读'], gradient: 'from-[#6366F1] to-[#4F46E5]',
  },
  {
    id: '6', name: '国学文案大师', avatar: 'https://via.placeholder.com/40/0891B2/ffffff?text=文',
    description: '一键生成国学风格推广文案、朋友圈文案、短视频脚本', category: 'content', categoryName: '文案创作',
    hotScore: 9234, useCount: 156000, rating: 4.9, ratingCount: 3567,
    tags: ['文案', '朋友圈', '短视频'], isOfficial: true, isRecommended: true, isNew: false, isFree: true,
    capabilities: ['多风格文案', '一键生成', '智能改写'], gradient: 'from-[#0891B2] to-[#0E7490]',
  },
]

const hotQuestions = [
  { id: 'q1', question: '我的八字适合创业还是打工？', botId: '1', botName: '八字命理大师', views: 12800 },
  { id: 'q2', question: '2024年下半年财运如何？', botId: '1', botName: '八字命理大师', views: 9600 },
  { id: 'q3', question: '奇门遁甲如何预测项目成败？', botId: '2', botName: '奇门遁甲助手', views: 8700 },
  { id: 'q4', question: '给属龙宝宝起名有什么讲究？', botId: '4', botName: '智能起名顾问', views: 7500 },
  { id: 'q5', question: '如何入门学习《易经》？', botId: '3', botName: '国学经典导读', views: 6800 },
]

function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

const searchQuery = ref('')
const isListening = ref(false)
const showAllBots = ref(false)

const displayBots = computed(() => (showAllBots.value ? hotBots : hotBots.slice(0, 4)))

function handleVoiceSearch() {
  isListening.value = true
  setTimeout(() => {
    isListening.value = false
    searchQuery.value = '八字分析'
  }, 2000)
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
