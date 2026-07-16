<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="square">
    <!-- 顶部搜索区（红色，sticky） -->
    <view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="topbar-inner">
        <view class="tb-row">
          <view class="tb-left">
            <view class="tb-back" @tap="goBack">
              <app-icon name="arrow-left" :size="40" color="#ffffff" />
            </view>
            <text class="tb-title">智能体广场</text>
            <view class="tb-badge">
              <app-icon name="zap" :size="22" color="rgba(255,255,255,0.9)" />
              <text class="tb-badge-txt">{{ hotBots.length + 1 }}个在线</text>
            </view>
          </view>
          <view class="tb-history" @tap="navigateTo('/agents/history')">
            <app-icon name="clock" :size="28" color="rgba(255,255,255,0.8)" />
            <text class="tb-history-txt">对话记录</text>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-box">
          <app-icon name="search" :size="36" color="#999999" />
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜索智能体或直接提问..."
            placeholder-class="search-ph"
            :disabled="isListening"
          />
          <view v-if="searchQuery" class="search-clear" @tap="searchQuery = ''">
            <app-icon name="x" :size="28" color="#999999" />
          </view>
          <!-- 语音搜索：仅 H5 端用 Web Speech 真实识别，其余端不支持则隐藏入口 -->
          <template v-if="voiceSupported">
            <view class="search-divider" />
            <view class="voice-btn" :class="{ listening: isListening }" @tap="handleVoiceSearch">
              <app-icon name="mic" :size="30" :color="isListening ? '#ffffff' : '#666666'" />
            </view>
          </template>
          <!-- 聆听遮罩 -->
          <view v-if="isListening" class="listening-mask">
            <view class="dot" />
            <view class="dot dot-2" />
            <view class="dot dot-3" />
            <text class="listening-txt">正在聆听...</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索结果模式：命中的智能体平铺 -->
    <view v-if="searchQuery.trim()" class="section-px section-mt">
      <view class="sec-head">
        <view class="sec-head-left">
          <app-icon name="search" :size="32" color="#c41e3a" />
          <text class="sec-title">搜索“{{ searchQuery.trim() }}”</text>
        </view>
      </view>
      <view v-if="searchedBots.length" class="cat-grid">
        <view v-for="bot in searchedBots" :key="bot.id" class="grid-card" @tap="openBot(bot.id)">
          <view class="gc-banner" :style="{ background: botGrad(bot.name) }">
            <view class="gc-glyph serif">{{ (bot.name || '智')[0] }}</view>
            <view class="gc-avatar">
              <smart-avatar class="gc-avatar-img" :src="bot.avatar" :name="bot.name" />
            </view>
            <text v-if="bot.isNew" class="gc-new">NEW</text>
          </view>
          <view class="gc-body">
            <text class="gc-name">{{ bot.name }}</text>
            <text class="gc-desc">{{ bot.description || '暂无简介' }}</text>
            <view class="gc-foot">
              <text v-if="bot.useCount" class="gc-count">{{ formatCount(bot.useCount) }}次对话</text>
              <text v-else class="gc-count">{{ bot.categoryName }}</text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty-block"><text class="empty-txt">没有找到相关智能体，试试直接问智玄助手</text></view>
    </view>

    <!-- 常规陈列模式 -->
    <template v-else>
      <!-- ① 平台自有助手区（亲儿子置顶，与 Coze 广场智能体区分） -->
      <view class="section-px zx-wrap">
        <view class="zx-card" @tap="navigateTo('/agent/main')">
          <view class="zx-icon">
            <app-icon name="bot" :size="52" color="#c41e3a" />
          </view>
          <view class="zx-info">
            <view class="zx-title-row">
              <text class="zx-title">智玄 AI 助手</text>
              <view class="zx-official">
                <app-icon name="crown" :size="22" color="#a8863d" />
                <text class="zx-official-txt">平台官方</text>
              </view>
            </view>
            <text class="zx-desc">懂命理文化、通经典 · 会排盘的国学 AI，试试报出生辰起一盘</text>
            <view class="zx-caps">
              <text class="zx-cap">八字排盘</text>
              <text class="zx-cap">经典问答</text>
              <text class="zx-cap">流式对话</text>
            </view>
          </view>
          <view class="zx-go"><text class="zx-go-txt">对话</text></view>
        </view>
        <!-- 客服小入口 -->
        <view class="cs-row" @tap="navigateTo('/agent/customer-service')">
          <view class="cs-icon"><app-icon name="headphones" :size="30" color="#2563eb" /></view>
          <text class="cs-txt">平台使用问题？找智能客服</text>
          <app-icon name="chevron-right" :size="28" color="#cccccc" />
        </view>
      </view>

      <!-- ② 我的最近使用（my-conversations 聚合，未登录/无记录隐藏） -->
      <view v-if="recentConvs.length" class="section-mt">
        <view class="section-px sec-head">
          <view class="sec-head-left">
            <app-icon name="history" :size="34" color="#8b7355" />
            <text class="sec-title">最近使用</text>
          </view>
          <view class="sec-link" @tap="navigateTo('/agents/history')">
            <text class="sec-link-txt">全部</text>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
        </view>
        <scroll-view class="recent-scroll" scroll-x>
          <view class="recent-row">
            <view v-for="c in recentConvs" :key="c.id" class="recent-card" @tap="resumeConv(c)">
              <view class="recent-avatar">
                <smart-avatar class="recent-avatar-img" :src="c.agentAvatar" :name="c.agentName" />
              </view>
              <view class="recent-info">
                <text class="recent-name">{{ c.agentName }}</text>
                <text class="recent-msg">{{ c.lastMessage || '继续对话' }}</text>
              </view>
              <text class="recent-time">{{ c.lastTime }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ③ 热门 TOP5 横条（复用 ranking 真实热度） -->
      <view v-if="topRanking.length" class="section-mt">
        <view class="section-px sec-head">
          <view class="sec-head-left">
            <app-icon name="flame" :size="34" color="#ff6b35" />
            <text class="sec-title">热门 TOP{{ topRanking.length }}</text>
          </view>
          <view class="sec-link rank-link" @tap="navigateTo('/agents/ranking')">
            <app-icon name="crown" :size="26" color="#c9a96e" />
            <text class="rank-txt">完整热度榜</text>
          </view>
        </view>
        <scroll-view class="top-scroll" scroll-x>
          <view class="top-row">
            <view v-for="(r, i) in topRanking" :key="r.id" class="top-card" @tap="openBot(r.id)">
              <view class="top-rank" :class="'top-rank-' + i">{{ i + 1 }}</view>
              <view class="top-avatar">
                <smart-avatar class="top-avatar-img" :src="r.avatar" :name="r.name" />
              </view>
              <text class="top-name">{{ r.name }}</text>
              <text v-if="r.sessions" class="top-heat">{{ formatCount(r.sessions) }}次对话</text>
              <!-- 分类与名称相同则显示通用标签，避免上下两行重复同一文案 -->
              <text v-else class="top-heat muted">{{ r.category && r.category !== r.name ? r.category : 'AI 智能体' }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 热门问答（后端暂无该数据时整块隐藏） -->
      <view v-if="hotQuestions.length" class="section-px section-mt">
        <view class="sec-head">
          <view class="sec-head-left">
            <app-icon name="message-circle" :size="34" color="#ff6b35" />
            <text class="sec-title">大家都在问</text>
          </view>
          <view class="sec-link" @tap="navigateTo('/agents/questions')">
            <text class="sec-link-txt">更多</text>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
        </view>
        <view class="q-list">
          <view v-for="(q, index) in hotQuestions.slice(0, 3)" :key="q.id" class="q-item" @tap="goAsk(q)">
            <view class="q-rank" :class="'q-rank-' + index">{{ index + 1 }}</view>
            <view class="q-body">
              <text class="q-text">{{ q.question }}</text>
              <view class="q-meta">
                <text class="q-bot-name">{{ q.botName }}</text>
                <text class="q-dot">·</text>
                <text class="q-views">{{ formatCount(q.views) }}浏览</text>
              </view>
            </view>
            <app-icon name="chevron-right" :size="28" color="#cccccc" />
          </view>
        </view>
      </view>

      <!-- ④ 分类分区陈列（按 category 分组·双列卡） -->
      <view v-for="group in categoryGroups" :key="group.name" class="section-px section-mt">
        <view class="sec-head">
          <view class="sec-head-left">
            <view class="cat-dot" />
            <text class="sec-title">{{ group.name }}</text>
            <text class="cat-count">{{ group.bots.length }}</text>
          </view>
        </view>
        <view class="cat-grid">
          <view v-for="bot in group.bots" :key="bot.id" class="grid-card" @tap="openBot(bot.id)">
            <view class="gc-banner" :style="{ background: botGrad(bot.name) }">
              <view class="gc-glyph serif">{{ (bot.name || '智')[0] }}</view>
              <view class="gc-avatar">
                <smart-avatar class="gc-avatar-img" :src="bot.avatar" :name="bot.name" />
              </view>
              <text v-if="bot.isNew" class="gc-new">NEW</text>
            </view>
            <view class="gc-body">
              <text class="gc-name">{{ bot.name }}</text>
              <text class="gc-desc">{{ bot.description || '暂无简介' }}</text>
              <view class="gc-foot">
                <text v-if="bot.useCount" class="gc-count">{{ formatCount(bot.useCount) }}次对话</text>
                <text v-else-if="bot.isFree" class="gc-count">免费使用</text>
                <text v-else class="gc-count">按次计费</text>
                <view v-if="bot.capabilities.includes('语音对话')" class="gc-voice">
                  <app-icon name="volume-2" :size="24" color="#7c3aed" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!hotBots.length" class="empty-block">
        <text class="empty-txt">广场智能体正在上架中，先和智玄助手聊聊吧</text>
      </view>
    </template>

    <view class="bottom-gap" />
  </view>
</template>

<script setup lang="ts">
/**
 * 智能体广场 —— 陈列重排（2026-07 智能体体验批）
 * 信息架构：① 平台自有助手区（智玄大卡置顶·与 Coze 广场智能体区分）
 *          ② 我的最近使用（/bots/my-conversations 横滑续聊）
 *          ③ 热门 TOP5 横条（复用 /bots/ranking 真实热度·独立热度榜页保留）
 *          ④ 分类分区陈列（按 category 分组·双列卡：图标/名称/一句话简介/使用次数）
 * 数据真实性：使用次数来自 BotChatLog 聚合（后端 ranking 下发），无数据时降级显示分类/计费信息，不造假。
 */
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { navigateTo } from '@/utils/router'
import {
  agentsSquareApi,
  formatCount,
  type SquareBot,
  type SquareQuestion,
  type RankingAgent,
  type AgentConversation,
} from '@/lib/agents-square-data'

const loading = ref(true)
const error = ref('')
const statusBarHeight = ref(0)
const searchQuery = ref('')
const isListening = ref(false)

/** 智能体卡横幅渐变：雅致国学色系按名称哈希轮换（董事长反馈"卡片无背景无设计感"） */
const BOT_GRADS = [
  'linear-gradient(135deg, #6d4f80, #3d2a54)',
  'linear-gradient(135deg, #3a6b57, #1f3d31)',
  'linear-gradient(135deg, #8a5c3b, #573620)',
  'linear-gradient(135deg, #3e6390, #22405f)',
  'linear-gradient(135deg, #9c4150, #5c2230)',
  'linear-gradient(135deg, #8a6d3b, #54401e)',
]
function botGrad(name: string) {
  let h = 0
  const s = name || ''
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return BOT_GRADS[h % BOT_GRADS.length]
}
const voiceSupported = ref(false)

// #ifdef H5
// window.SpeechRecognition 为浏览器宿主 API，uni 类型无定义，保留 as any
voiceSupported.value =
  typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
// #endif

const hotBots = ref<SquareBot[]>([])
const hotQuestions = ref<SquareQuestion[]>([])
const ranking = ref<RankingAgent[]>([])
const recentConvs = ref<AgentConversation[]>([])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    // 广场列表 + 热度榜并行拉取；最近使用需登录，失败静默隐藏（未登录属正常态）
    const [bots, questions, rank] = await Promise.all([
      agentsSquareApi.getHotBots(),
      agentsSquareApi.getHotQuestions(),
      agentsSquareApi.getRanking().catch(() => [] as RankingAgent[]),
    ])
    hotBots.value = bots || []
    hotQuestions.value = questions || []
    ranking.value = rank || []
    // 真实热度回填到广场卡（使用次数）
    const heat = new Map(ranking.value.map((r) => [r.id, r.sessions || 0]))
    hotBots.value.forEach((b) => {
      const n = heat.get(b.id)
      if (n) b.useCount = n
    })
    agentsSquareApi.getConversations()
      .then((cs) => { recentConvs.value = (cs || []).slice(0, 6) })
      .catch(() => { recentConvs.value = [] })
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

uni.getSystemInfo({
  success: (res) => {
    statusBarHeight.value = res.statusBarHeight || 0
  },
})

/** 热门 TOP5（有热度数据的优先，全无热度时按后台权重顺序取前5） */
const topRanking = computed(() => ranking.value.slice(0, 5))

/** 分类分区：按 categoryName 分组（数据里有什么分类用什么），组内保持后端排序 */
const categoryGroups = computed(() => {
  const map = new Map<string, SquareBot[]>()
  for (const b of hotBots.value) {
    const key = b.categoryName || '综合助手'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(b)
  }
  return Array.from(map.entries()).map(([name, bots]) => ({ name, bots }))
})

/** 搜索过滤（名称/简介） */
const searchedBots = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return hotBots.value.filter(
    (b) => b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q),
  )
})

function openBot(id: string) {
  navigateTo('/agent/' + id)
}

/** 续聊：带 conversationId 进入对话页（与 /agents/history 行为一致） */
function resumeConv(c: AgentConversation) {
  navigateTo(`/agent/${c.botConfigId}?conversationId=${encodeURIComponent(c.conversationId)}`)
}

// 浏览器 SpeechRecognition 实例，uni 类型无定义，保留 any
let recognition: any = null
// 语音搜索：H5 端调用浏览器原生 Web Speech API 做真实识别（无 mock 假识别）
function handleVoiceSearch() {
  // #ifdef H5
  if (isListening.value) {
    recognition?.stop()
    return
  }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    uni.showToast({ title: '当前浏览器不支持语音识别', icon: 'none' })
    return
  }
  recognition = new SR()
  recognition.lang = 'zh-CN'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  // 浏览器语音识别结果事件，宿主 API 类型未定义，保留 any
  recognition.onresult = (e: any) => {
    const transcript = e?.results?.[0]?.[0]?.transcript || ''
    if (transcript) searchQuery.value = transcript
  }
  recognition.onerror = () => {
    uni.showToast({ title: '语音识别失败，请重试', icon: 'none' })
  }
  recognition.onend = () => {
    isListening.value = false
  }
  isListening.value = true
  recognition.start()
  // #endif
}

function goAsk(q: SquareQuestion) {
  navigateTo(`/agent/${q.botId}?q=${encodeURIComponent(q.question)}`)
}

function goBack() {
  // #ifdef H5
  if (window.history.length > 1) {
    uni.navigateBack()
    return
  }
  // #endif
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/paipan/index' })
}
</script>

<style scoped>
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }

.square {
  min-height: 100vh;
  background: var(--bg-paper, #faf8f5);
  padding-bottom: 48rpx;
}

/* 顶部搜索区 */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: linear-gradient(180deg, var(--brand) 0%, #a01530 100%);
}
.topbar-inner { padding: 16rpx 32rpx 28rpx; }
.tb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.tb-left { display: flex; align-items: center; gap: 16rpx; }
.tb-back {
  width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
  margin-left: -12rpx;
}
.tb-title { font-size: 40rpx; font-weight: 700; color: #ffffff; }
.tb-badge {
  display: flex; align-items: center; gap: 6rpx;
  padding: 2rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
}
.tb-badge-txt { font-size: 22rpx; color: rgba(255, 255, 255, 0.9); }
.tb-history { display: flex; align-items: center; gap: 6rpx; }
.tb-history-txt { font-size: 24rpx; color: rgba(255, 255, 255, 0.8); }

/* 搜索框 */
.search-box {
  position: relative;
  display: flex; align-items: center;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 18rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}
.search-input { flex: 1; margin-left: 16rpx; font-size: 28rpx; color: #333333; }
.search-ph { color: #999999; }
.search-clear { padding: 8rpx; }
.search-divider { width: 2rpx; height: 40rpx; background: #e5e5e5; margin: 0 16rpx; }
.voice-btn {
  width: 56rpx; height: 56rpx; border-radius: 999rpx;
  background: #f5f0e8;
  display: flex; align-items: center; justify-content: center;
}
.voice-btn.listening { background: var(--brand); }
.listening-mask {
  position: absolute; left: 0; top: 0; right: 0; bottom: 0;
  background: #ffffff; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
}
.dot { width: 14rpx; height: 14rpx; border-radius: 999rpx; background: var(--brand); animation: bounce 1s infinite; }
.dot-2 { animation-delay: 0.15s; }
.dot-3 { animation-delay: 0.3s; }
.listening-txt { margin-left: 12rpx; font-size: 28rpx; color: #666666; }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
}

/* 通用区块 */
.section-px { padding-left: 32rpx; padding-right: 32rpx; }
.section-mt { margin-top: 44rpx; }
.sec-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24rpx;
}
.sec-head-left { display: flex; align-items: center; gap: 12rpx; }
.sec-title { font-size: 32rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.sec-link { display: flex; align-items: center; gap: 4rpx; }
.sec-link-txt { font-size: 24rpx; color: #999999; }
.rank-link { gap: 6rpx; }
.rank-txt { font-size: 24rpx; color: #a8863d; }

/* ① 平台自有助手区（智玄大卡：宣纸白卡+金线描边，与红头形成留白层次） */
.zx-wrap { margin-top: 32rpx; }
.zx-card {
  position: relative;
  display: flex; align-items: flex-start; gap: 24rpx;
  background: #ffffff;
  border: 2rpx solid rgba(201, 169, 110, 0.5);
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 8rpx 28rpx rgba(140, 108, 60, 0.10);
}
.zx-icon {
  width: 104rpx; height: 104rpx; border-radius: 26rpx; flex-shrink: 0;
  background: rgba(196, 30, 58, 0.08);
  border: 1rpx solid rgba(196, 30, 58, 0.12);
  display: flex; align-items: center; justify-content: center;
}
.zx-info { flex: 1; min-width: 0; }
.zx-title-row { display: flex; align-items: center; gap: 14rpx; }
.zx-title { font-size: 34rpx; font-weight: 700; color: var(--text-ink, #2c2c2c); }
.zx-official {
  display: flex; align-items: center; gap: 4rpx;
  padding: 2rpx 14rpx;
  background: rgba(201, 169, 110, 0.16);
  border-radius: 999rpx;
}
.zx-official-txt { font-size: 20rpx; color: #a8863d; }
.zx-desc {
  display: block;
  font-size: 24rpx; color: #666666; line-height: 1.5;
  margin-top: 10rpx;
}
.zx-caps { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.zx-cap {
  padding: 4rpx 16rpx;
  background: var(--bg-paper, #faf8f5);
  border: 1rpx solid rgba(201, 169, 110, 0.35);
  color: #8b7355;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.zx-go {
  flex-shrink: 0; align-self: center;
  padding: 14rpx 32rpx;
  background: var(--brand);
  border-radius: 999rpx;
  box-shadow: 0 6rpx 16rpx rgba(196, 30, 58, 0.25);
}
.zx-go-txt { font-size: 26rpx; font-weight: 500; color: #ffffff; }

/* 客服小入口 */
.cs-row {
  display: flex; align-items: center; gap: 16rpx;
  margin-top: 16rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.cs-icon {
  width: 56rpx; height: 56rpx; border-radius: 14rpx; flex-shrink: 0;
  background: rgba(37, 99, 235, 0.10);
  display: flex; align-items: center; justify-content: center;
}
.cs-txt { flex: 1; font-size: 26rpx; color: #666666; }

/* ② 最近使用（横滑） */
.recent-scroll { white-space: nowrap; }
.recent-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.recent-card {
  display: flex; align-items: center; gap: 14rpx;
  width: 380rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.recent-avatar {
  width: 64rpx; height: 64rpx; border-radius: 16rpx; flex-shrink: 0; overflow: hidden;
  background: rgba(196, 30, 58, 0.08);
  display: flex; align-items: center; justify-content: center;
}
.recent-avatar-img { width: 64rpx; height: 64rpx; }
.recent-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.recent-name {
  font-size: 26rpx; font-weight: 600; color: var(--text-ink, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.recent-msg {
  font-size: 22rpx; color: #999999; margin-top: 4rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.recent-time { flex-shrink: 0; font-size: 20rpx; color: #bbbbbb; align-self: flex-start; }

/* ③ 热门 TOP5 横条 */
.top-scroll { white-space: nowrap; }
.top-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.top-card {
  position: relative;
  width: 200rpx;
  display: flex; flex-direction: column; align-items: center;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 16rpx 22rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.top-rank {
  position: absolute; top: 12rpx; left: 12rpx;
  width: 36rpx; height: 36rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 20rpx; font-weight: 700;
  background: #e8e3db; color: #666666;
}
.top-rank-0 { background: #ffd700; color: #5c4400; }
.top-rank-1 { background: #d9d9d9; color: #555555; }
.top-rank-2 { background: #e2a06c; color: #5a3312; }
.top-avatar {
  width: 84rpx; height: 84rpx; border-radius: 22rpx; overflow: hidden;
  background: rgba(196, 30, 58, 0.08);
  display: flex; align-items: center; justify-content: center;
}
.top-avatar-img { width: 60rpx; height: 60rpx; }
.top-name {
  max-width: 100%;
  font-size: 24rpx; font-weight: 600; color: var(--text-ink, #2c2c2c);
  margin-top: 14rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.top-heat { font-size: 20rpx; color: #ff6b35; margin-top: 6rpx; }
.top-heat.muted { color: #999999; }

/* 热门问答 */
.q-list { display: flex; flex-direction: column; gap: 16rpx; }
.q-item {
  display: flex; align-items: center; gap: 20rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.q-rank {
  width: 44rpx; height: 44rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 22rpx; font-weight: 700; flex-shrink: 0;
  background: #e8e3db; color: #666666;
}
.q-rank-0 { background: #ff6b35; color: #ffffff; }
.q-rank-1 { background: #ffb800; color: #ffffff; }
.q-body { flex: 1; min-width: 0; }
.q-text {
  font-size: 26rpx; color: var(--text-ink, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.q-meta { display: flex; align-items: center; gap: 10rpx; margin-top: 8rpx; }
.q-bot-name { font-size: 22rpx; color: #999999; }
.q-dot { font-size: 22rpx; color: #bbbbbb; }
.q-views { font-size: 22rpx; color: #999999; }

/* ④ 分类分区（双列卡） */
.cat-dot {
  width: 12rpx; height: 28rpx; border-radius: 6rpx;
  background: var(--brand);
}
.cat-count {
  font-size: 22rpx; color: #999999;
  background: #efeae2;
  border-radius: 999rpx;
  padding: 2rpx 14rpx;
}
.cat-grid {
  display: flex; flex-wrap: wrap; gap: 20rpx;
}
.grid-card {
  width: calc(50% - 10rpx);
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  display: flex; flex-direction: column;
}
/* 渐变横幅头：书法字水印 + 悬浮头像（设计感来源·色系按名称哈希轮换） */
.gc-banner {
  position: relative; height: 150rpx;
  display: flex; align-items: center; justify-content: center;
}
.serif { font-family: 'STKaiti', 'KaiTi', 'STSong', serif; }
.gc-glyph {
  position: absolute; right: 16rpx; bottom: 4rpx;
  font-size: 96rpx; font-weight: 700; line-height: 1;
  color: rgba(255, 255, 255, 0.14);
  pointer-events: none;
}
.gc-avatar {
  width: 96rpx; height: 96rpx; border-radius: 999rpx; overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  border: 4rpx solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
  display: flex; align-items: center; justify-content: center;
}
.gc-avatar-img { width: 100%; height: 100%; }
.gc-new {
  position: absolute; top: 12rpx; right: 12rpx;
  padding: 2rpx 10rpx;
  background: #52c41a; color: #ffffff;
  font-size: 18rpx; border-radius: 6rpx;
}
.gc-body { padding: 18rpx 24rpx 22rpx; display: flex; flex-direction: column; }
.gc-name {
  font-size: 28rpx; font-weight: 700; color: var(--text-ink, #2c2c2c);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gc-desc {
  font-size: 22rpx; color: #999999; line-height: 1.5;
  margin-top: 8rpx;
  height: 66rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.gc-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 14rpx;
}
.gc-count { font-size: 20rpx; color: #8b7355; }
.gc-voice { display: flex; align-items: center; }

/* 空态 */
.empty-block { padding: 80rpx 32rpx; display: flex; justify-content: center; }
.empty-txt { font-size: 26rpx; color: #999999; }

.bottom-gap { height: 32rpx; }
</style>
