<!-- AI 智能体广场 - 100% 对照 React app/agents/page.tsx | UniApp Vue3 + Tailwind 纯内联 | 无style块/无emoji/无BEM -->
<template>
  <view class="min-h-screen bg-[#FAF8F5] pb-24">

    <!-- 顶部搜索区：红色渐变 -->
    <view class="sticky top-0 z-50">
      <view class="bg-gradient-to-b from-primary to-primary/80 pt-safe">
        <view class="px-4 pt-3 pb-4">
          <!-- 标题行 -->
          <view class="flex items-center justify-between mb-3">
            <view class="flex items-center gap-2">
              <text class="text-xl font-bold text-primary-foreground">智能体广场</text>
              <view class="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                <svg class="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                <text class="text-[11px] text-primary-foreground/90">{{ hotBots.length }}个在线</text>
              </view>
            </view>
            <view @tap="() => uni.navigateTo({ url: '/pages/agents/history' })"
              class="flex items-center gap-1 text-primary-foreground/80">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <text class="text-xs">对话记录</text>
            </view>
          </view>

          <!-- 搜索框 -->
          <view class="relative">
            <view class="flex items-center bg-card rounded-xl px-3 py-2.5 shadow-lg gap-2">
              <svg class="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input v-model="searchQuery" placeholder="搜索智能体或直接提问..."
                class="flex-1 text-sm bg-transparent outline-none text-foreground"
                placeholder-class="text-muted-foreground" />
              <view v-if="searchQuery" @tap="searchQuery = ''" class="p-1">
                <svg class="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </view>
              <view class="w-px h-5 bg-border" />
              <view @tap="handleVoiceSearch"
                :class="isListening
                  ? 'w-8 h-8 rounded-full flex items-center justify-center bg-primary'
                  : 'w-8 h-8 rounded-full flex items-center justify-center bg-secondary'">
                <svg :class="isListening ? 'w-4 h-4 text-primary-foreground' : 'w-4 h-4 text-muted-foreground'"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </view>
            </view>
            <!-- 语音聆听覆盖层 -->
            <view v-if="isListening"
              class="absolute inset-0 flex items-center justify-center bg-card rounded-xl">
              <view class="flex items-center gap-2">
                <view class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms" />
                <view class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms" />
                <view class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms" />
                <text class="ml-2 text-sm text-muted-foreground">正在聆听...</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 主智能客服入口 -->
    <view class="px-4 pt-4">
      <view @tap="() => uni.navigateTo({ url: '/pages/agent/main' })" class="block">
        <view class="relative rounded-2xl p-4 overflow-hidden" style="background: linear-gradient(135deg, #1a1a2e, #16213e)">
          <view class="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl bg-primary" />
          <view class="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style="background: #7C3AED" />
          <view class="relative flex items-center gap-4">
            <view class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style="background: linear-gradient(135deg, #C41E3A, #7C3AED)">
              <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <path d="M12 11V7"/><path d="M8 7h8"/>
                <path d="M7 15h2"/><path d="M15 15h2"/>
              </svg>
            </view>
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="text-white font-bold text-base">热卜智能助手</text>
                <view class="px-1.5 py-0.5 rounded text-[10px] text-white" style="background: #52C41A">在线</view>
              </view>
              <text class="text-white/60 text-xs mt-1">有任何问题都可以问我，我来帮您解答</text>
            </view>
            <view class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 大家都在问 -->
    <view class="px-4 pt-5">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <svg class="w-5 h-5" style="color: #FF6B35" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
          <text class="font-bold text-foreground">大家都在问</text>
        </view>
        <view @tap="() => uni.navigateTo({ url: '/pages/agents/questions' })"
          class="flex items-center gap-1 text-xs text-muted-foreground">
          <text>更多</text>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </view>
      </view>
      <view class="flex flex-col gap-2">
        <view v-for="(q, index) in hotQuestions" :key="q.id"
          @tap="goToAgentWithQ(q.botId, q.question)"
          class="flex items-center gap-3 bg-card rounded-xl p-3 shadow-sm">
          <view :class="index === 0
            ? 'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0'
            : index === 1
            ? 'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0'
            : 'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-secondary text-muted-foreground'"
            :style="index === 0 ? 'background:#FF6B35' : index === 1 ? 'background:#FFB800' : ''">
            <text>{{ index + 1 }}</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm text-foreground line-clamp-1">{{ q.question }}</text>
            <view class="flex items-center gap-2 mt-1">
              <image :src="q.botAvatar" class="w-4 h-4 rounded" mode="aspectFill" />
              <text class="text-xs text-muted-foreground">{{ q.botName }}</text>
              <text class="text-xs text-muted-foreground">·</text>
              <text class="text-xs text-muted-foreground">{{ formatCount(q.views) }}浏览</text>
            </view>
          </view>
          <svg class="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </view>
      </view>
    </view>

    <!-- 智能体列表 -->
    <view class="px-4 pt-5">
      <view class="flex items-center justify-between mb-3">
        <view class="flex items-center gap-2">
          <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
          <text class="font-bold text-foreground">智能体</text>
        </view>
        <view @tap="() => uni.navigateTo({ url: '/pages/agents/ranking' })"
          class="flex items-center gap-1 text-xs text-accent">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 20h20M5 20V10l7-7 7 7v10"/>
          </svg>
          <text>热度榜</text>
        </view>
      </view>

      <view class="flex flex-col gap-3">
        <view v-for="(bot, index) in displayBots" :key="bot.id"
          @tap="goToAgent(bot.id)"
          class="bg-card rounded-2xl p-4 shadow-sm">
          <view class="flex items-start gap-3">
            <!-- 头像 -->
            <view class="relative shrink-0">
              <view class="w-14 h-14 rounded-xl flex items-center justify-center"
                :style="{ background: `linear-gradient(135deg, ${bot.gradientFrom}, ${bot.gradientTo})` }">
                <image :src="bot.avatar" class="w-10 h-10" mode="aspectFit" />
              </view>
              <view v-if="index < 3"
                :class="index === 0
                  ? 'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow text-foreground'
                  : index === 1
                  ? 'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow text-white'
                  : 'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow text-white'"
                :style="index === 0 ? 'background:#FFD700' : index === 1 ? 'background:#C0C0C0' : 'background:#CD7F32'">
                <text>{{ index + 1 }}</text>
              </view>
            </view>

            <!-- 信息 -->
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2">
                <text class="font-bold text-[15px] text-foreground truncate">{{ bot.name }}</text>
                <svg v-if="bot.isOfficial" class="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 20h20M5 20V10l7-7 7 7v10"/>
                </svg>
                <view v-if="bot.isNew" class="px-1.5 py-0.5 rounded text-[9px] text-white shrink-0" style="background:#52C41A">
                  <text>NEW</text>
                </view>
              </view>
              <text class="text-xs text-muted-foreground line-clamp-2 mt-1">{{ bot.description }}</text>
              <!-- 能力标签 -->
              <view class="flex items-center gap-1.5 mt-2 flex-wrap">
                <view v-for="(cap, i) in bot.capabilities.slice(0, 3)" :key="i"
                  class="px-2 py-0.5 rounded-full text-[10px]"
                  style="background: rgba(201,169,110,0.15); color: #8B7355">
                  <text>{{ cap }}</text>
                </view>
              </view>
              <!-- 统计数据 -->
              <view class="flex items-center gap-3 mt-2">
                <view class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <text class="text-xs text-muted-foreground">{{ bot.rating }}</text>
                </view>
                <text class="text-xs text-muted-foreground">{{ formatCount(bot.useCount) }}次对话</text>
                <view v-if="bot.capabilities.includes('语音对话')" class="flex items-center gap-0.5">
                  <svg class="w-3.5 h-3.5" style="color: #7C3AED" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <text class="text-[11px]" style="color: #7C3AED">语音</text>
                </view>
              </view>
            </view>

            <!-- 对话按钮 -->
            <view @tap.stop="goToAgent(bot.id)"
              class="px-4 py-2 rounded-full bg-primary shrink-0 flex items-center justify-center">
              <text class="text-sm font-medium text-primary-foreground">对话</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 展开/收起 -->
      <view v-if="hotBots.length > 4" @tap="showAllBots = !showAllBots"
        class="flex items-center justify-center gap-1 mt-3 py-2.5 bg-card rounded-xl shadow-sm">
        <text class="text-sm text-muted-foreground">
          {{ showAllBots ? '收起' : `查看全部${hotBots.length}个智能体` }}
        </text>
        <svg :class="showAllBots ? 'w-4 h-4 text-muted-foreground rotate-180 transition-transform' : 'w-4 h-4 text-muted-foreground transition-transform'"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </view>
    </view>

    <view class="h-8" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const hotBots = [
  { id: '1', name: '八字命理大师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a', description: '专业八字排盘解读，精准分析命局特点，为您揭示人生密码', hotScore: 9856, useCount: 128000, rating: 4.9, isOfficial: true, isNew: false, isFree: false, capabilities: ['语音对话', '图片识别', '深度解析'], gradientFrom: '#C41E3A', gradientTo: '#A01530' },
  { id: '2', name: '奇门遁甲助手', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=qimen&backgroundColor=7c3aed', description: '奇门遁甲起局断卦，预测事业、感情、财运，指点迷津', hotScore: 7823, useCount: 89000, rating: 4.8, isOfficial: true, isNew: false, isFree: true, capabilities: ['实时起局', '详细解读'], gradientFrom: '#7C3AED', gradientTo: '#5B21B6' },
  { id: '3', name: '国学经典导读', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=guoxue&backgroundColor=059669', description: '《易经》《道德经》等国学经典深度解读，让古籍活起来', hotScore: 6542, useCount: 67000, rating: 4.9, isOfficial: true, isNew: true, isFree: true, capabilities: ['语音朗读', '原文释义', '智慧问答'], gradientFrom: '#059669', gradientTo: '#047857' },
  { id: '4', name: '智能起名顾问', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c', description: '结合八字五行、三才五格，为宝宝取一个吉祥好名', hotScore: 8234, useCount: 102000, rating: 4.7, isOfficial: false, isNew: false, isFree: false, price: 9.9, capabilities: ['五行分析', '寓意解读', '多方案推荐'], gradientFrom: '#EA580C', gradientTo: '#C2410C' },
  { id: '5', name: '紫微斗数解盘', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ziwei&backgroundColor=6366f1', description: '紫微斗数命盘解读，十二宫位详解，了解命运轨迹', hotScore: 5678, useCount: 56000, rating: 4.8, isOfficial: true, isNew: false, isFree: true, capabilities: ['命盘生成', '详细解读'], gradientFrom: '#6366F1', gradientTo: '#4F46E5' },
  { id: '6', name: '国学文案大师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=copywrite&backgroundColor=0891b2', description: '一键生成国学风格推广文案、朋友圈文案、短视频脚本', hotScore: 9234, useCount: 156000, rating: 4.9, isOfficial: true, isNew: false, isFree: true, capabilities: ['多风格文案', '一键生成', '智能改写'], gradientFrom: '#0891B2', gradientTo: '#0E7490' },
]

const hotQuestions = [
  { id: 'q1', question: '我的八字适合创业还是打工？', botId: '1', botName: '八字命理大师', botAvatar: hotBots[0].avatar, views: 12800 },
  { id: 'q2', question: '2024年下半年财运如何？', botId: '1', botName: '八字命理大师', botAvatar: hotBots[0].avatar, views: 9600 },
  { id: 'q3', question: '奇门遁甲如何预测项目成败？', botId: '2', botName: '奇门遁甲助手', botAvatar: hotBots[1].avatar, views: 8700 },
]

const searchQuery = ref('')
const isListening = ref(false)
const showAllBots = ref(false)
const displayBots = computed(() => showAllBots.value ? hotBots : hotBots.slice(0, 4))

function formatCount(num: number) {
  return num >= 10000 ? `${(num / 10000).toFixed(1)}万` : num.toLocaleString()
}

function handleVoiceSearch() {
  isListening.value = true
  setTimeout(() => { isListening.value = false; searchQuery.value = '八字分析' }, 2000)
}

function goToAgent(botId: string) {
  uni.navigateTo({ url: `/pages/agent/detail?id=${botId}` })
}

function goToAgentWithQ(botId: string, question: string) {
  uni.navigateTo({ url: `/pages/agent/detail?id=${botId}&q=${encodeURIComponent(question)}` })
}
</script>
