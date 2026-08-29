<template>
  <view v-if="loading" class="load-state" role="status" aria-live="polite"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state" role="alert" aria-live="assertive">
    <text class="load-state-text">{{ error }}</text>
    <view
      class="retry-btn"
      role="button"
      tabindex="0"
      aria-label="重新加载智能体广场"
      @tap="loadData"
      @keydown="activateOnKeyboard($event, loadData)"
    ><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="square">
    <!-- 顶部搜索区（红色，sticky） -->
    <view class="topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="topbar-inner">
        <view class="tb-row">
          <view class="tb-left">
            <view
              class="tb-back"
              role="button"
              tabindex="0"
              aria-label="返回上一页"
              @tap="goBack"
              @keydown="activateOnKeyboard($event, goBack)"
            >
              <app-icon name="arrow-left" :size="40" color="#ffffff" />
            </view>
            <text class="tb-title" role="heading" aria-level="1">智能体广场</text>
            <view class="tb-badge">
              <app-icon name="zap" :size="22" color="rgba(255,255,255,0.9)" />
              <text class="tb-badge-txt">{{ hotBots.length + 1 }}个在线</text>
            </view>
          </view>
          <view
            class="tb-history"
            role="link"
            tabindex="0"
            aria-label="打开智能体对话记录"
            @tap="navigateTo('/agents/history')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/agents/history'))"
          >
            <app-icon name="clock" :size="28" color="rgba(255,255,255,0.8)" />
            <text class="tb-history-txt">对话记录</text>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-box" role="search" aria-label="搜索智能体">
          <app-icon name="search" :size="36" color="#999999" />
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="搜索智能体或直接提问..."
            placeholder-class="search-ph"
            :disabled="isListening"
            aria-label="输入智能体名称或问题"
          />
          <view
            v-if="searchQuery"
            class="search-clear"
            role="button"
            tabindex="0"
            aria-label="清空智能体搜索"
            @tap="searchQuery = ''"
            @keydown="activateOnKeyboard($event, () => { searchQuery = '' })"
          >
            <app-icon name="x" :size="28" color="#999999" />
          </view>
          <!-- 语音搜索：仅 H5 端用 Web Speech 真实识别，其余端不支持则隐藏入口 -->
          <template v-if="voiceSupported">
            <view class="search-divider" />
            <view
              class="voice-btn"
              :class="{ listening: isListening }"
              role="button"
              tabindex="0"
              :aria-label="isListening ? '停止语音搜索' : '开始语音搜索'"
              :aria-pressed="isListening"
              @tap="handleVoiceSearch"
              @keydown="activateOnKeyboard($event, handleVoiceSearch)"
            >
              <app-icon name="mic" :size="30" :color="isListening ? '#ffffff' : '#666666'" />
            </view>
          </template>
          <!-- 聆听遮罩 -->
          <view v-if="isListening" class="listening-mask" role="status" aria-live="polite">
            <view class="dot" />
            <view class="dot dot-2" />
            <view class="dot dot-3" />
            <text class="listening-txt">正在聆听...</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索结果模式：命中的智能体平铺 -->
    <view v-if="searchQuery.trim()" class="section-px section-mt" aria-label="智能体搜索结果">
      <view class="sec-head">
        <view class="sec-head-left">
          <app-icon name="search" :size="32" color="#c41e3a" />
          <text class="sec-title">搜索“{{ searchQuery.trim() }}”</text>
        </view>
      </view>
      <view v-if="searchedBots.length" class="cat-grid">
        <square-agent-card
          v-for="bot in searchedBots"
          :key="bot.id"
          :bot="bot"
          @select="openBot"
        />
      </view>
      <view v-else class="empty-block" role="status" aria-live="polite"><text class="empty-txt">没有找到相关智能体，试试直接问智玄助手</text></view>
    </view>

    <!-- 常规陈列模式 -->
    <template v-else>
      <!-- ① 官方学习向导：承担平台内容导航，不与下方垂直学伴重复 -->
      <view class="section-px zx-wrap">
        <view
          class="zx-card"
          role="link"
          tabindex="0"
          aria-label="打开智玄国学学习向导，规划内容、学伴和学习路线"
          @tap="navigateTo('/agent/main')"
          @keydown="activateOnKeyboard($event, () => navigateTo('/agent/main'))"
        >
          <view class="guide-visual">
            <view class="guide-grid" />
            <view class="guide-orbit guide-orbit-a" />
            <view class="guide-orbit guide-orbit-b" />
            <view class="guide-core">
              <text class="guide-core-glyph">导</text>
            </view>
            <view class="guide-node guide-node-a"><text>书</text></view>
            <view class="guide-node guide-node-b"><text>课</text></view>
            <view class="guide-node guide-node-c"><text>伴</text></view>
          </view>
          <view class="zx-info">
            <view class="zx-title-row">
              <text class="zx-title">智玄 · 国学学习向导</text>
              <view class="zx-official">
                <app-icon name="crown" :size="22" color="#a8863d" />
                <text class="zx-official-txt">平台官方</text>
              </view>
            </view>
            <text class="zx-desc">先了解你的兴趣与基础，再帮你找内容、选学伴、定学习路径。</text>
            <view class="zx-caps">
              <text class="zx-cap">内容导航</text>
              <text class="zx-cap">学伴匹配</text>
              <text class="zx-cap">路线规划</text>
            </view>
          </view>
          <view class="zx-go">
            <text class="zx-go-txt">帮我规划</text>
            <app-icon name="arrow-up-right" :size="24" color="#ffffff" />
          </view>
        </view>
      </view>

      <station-pinned-rail board="agent" />

      <!-- ② 我的最近使用（my-conversations 聚合，未登录/无记录隐藏） -->
      <view v-if="recentConvs.length" class="section-mt">
        <view class="section-px sec-head">
          <view class="sec-head-left">
            <app-icon name="history" :size="34" color="#8b7355" />
            <text class="sec-title">最近使用</text>
          </view>
          <view
            class="sec-link"
            role="link"
            tabindex="0"
            aria-label="查看全部最近使用的智能体"
            @tap="navigateTo('/agents/history')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/agents/history'))"
          >
            <text class="sec-link-txt">全部</text>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
        </view>
        <scroll-view class="recent-scroll" scroll-x>
          <view class="recent-row">
            <view
              v-for="c in recentConvs"
              :key="c.id"
              class="recent-card"
              role="link"
              tabindex="0"
              :aria-label="`继续与${c.agentName}对话：${recentMessageSummary(c.lastMessage)}`"
              @tap="resumeConv(c)"
              @keydown="activateOnKeyboard($event, () => resumeConv(c))"
            >
              <view class="recent-avatar">
                <smart-avatar class="recent-avatar-img" :src="c.agentAvatar" :name="c.agentName" />
              </view>
              <view class="recent-info">
                <view class="recent-meta">
                  <text class="recent-name">{{ c.agentName }}</text>
                  <text class="recent-time">{{ c.lastTime }}</text>
                </view>
                <text class="recent-msg">{{ recentMessageSummary(c.lastMessage) }}</text>
              </view>
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
          <view
            class="sec-link rank-link"
            role="link"
            tabindex="0"
            aria-label="查看完整智能体热度榜"
            @tap="navigateTo('/agents/ranking')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/agents/ranking'))"
          >
            <app-icon name="crown" :size="26" color="#c9a96e" />
            <text class="rank-txt">完整热度榜</text>
          </view>
        </view>
        <scroll-view class="top-scroll" scroll-x>
          <view class="top-row">
            <view
              v-for="(r, i) in topRanking"
              :key="r.id"
              class="top-card"
              :style="agentThemeStyle(r.categoryKey || r.category)"
              role="link"
              tabindex="0"
              :aria-label="`热度第${i + 1}名，${r.name}，${r.sessions ? `${formatCount(r.sessions)}次对话` : r.category || 'AI学伴'}`"
              @tap="openBot(r.id)"
              @keydown="activateOnKeyboard($event, () => openBot(r.id))"
            >
              <view class="top-rank" :class="'top-rank-' + i">{{ i + 1 }}</view>
              <view class="top-visual">
                <view class="top-orbit" />
                <view class="top-avatar">
                  <smart-avatar v-if="r.avatar" class="top-avatar-img" :src="r.avatar" :name="r.name" />
                  <text v-else class="top-avatar-glyph">{{ resolveAgentTheme(r.categoryKey || r.category).glyph }}</text>
                </view>
              </view>
              <view class="top-copy">
                <text class="top-name">{{ r.name }}</text>
                <text v-if="r.sessions" class="top-heat">{{ formatCount(r.sessions) }}次对话</text>
                <text v-else class="top-heat muted">{{ r.category && r.category !== r.name ? r.category : 'AI 学伴' }}</text>
              </view>
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
          <view
            class="sec-link"
            role="link"
            tabindex="0"
            aria-label="查看更多热门问题"
            @tap="navigateTo('/agents/questions')"
            @keydown="activateOnKeyboard($event, () => navigateTo('/agents/questions'))"
          >
            <text class="sec-link-txt">更多</text>
            <app-icon name="chevron-right" :size="28" color="#999999" />
          </view>
        </view>
        <view class="q-list">
          <view
            v-for="(q, index) in hotQuestions.slice(0, 3)"
            :key="q.id"
            class="q-item"
            role="link"
            tabindex="0"
            :aria-label="`向${q.botName}提问：${q.question}`"
            @tap="goAsk(q)"
            @keydown="activateOnKeyboard($event, () => goAsk(q))"
          >
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
            <view class="cat-dot" :style="{ background: resolveAgentTheme(group.key).accent }" />
            <text class="sec-title">{{ group.name }}</text>
            <text class="cat-count">{{ group.bots.length }}</text>
          </view>
        </view>
        <view class="cat-grid">
          <square-agent-card
            v-for="bot in group.bots"
            :key="bot.id"
            :bot="bot"
            @select="openBot"
          />
        </view>
      </view>

      <view v-if="!hotBots.length" class="empty-block" role="status" aria-live="polite">
        <text class="empty-txt">广场智能体正在上架中，先和智玄助手聊聊吧</text>
      </view>

      <!-- 客服属于平台工具，不占用首屏的学习内容位置 -->
      <view class="section-px service-footer">
        <view
          class="cs-row"
          role="link"
          tabindex="0"
          aria-label="联系智能客服，处理账号、购买、功能与反馈问题"
          @tap="navigateTo('/agent/customer-service')"
          @keydown="activateOnKeyboard($event, () => navigateTo('/agent/customer-service'))"
        >
          <view class="cs-icon"><app-icon name="headphones" :size="30" color="#5b6a86" /></view>
          <view class="cs-copy">
            <text class="cs-title">平台使用帮助</text>
            <text class="cs-txt">账号、购买、功能与反馈问题，联系智能客服</text>
          </view>
          <app-icon name="chevron-right" :size="28" color="#a8afbc" />
        </view>
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
import SquareAgentCard from './components/square-agent-card.vue'
import StationPinnedRail from '@/components/station/station-pinned-rail.vue'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'
import { agentThemeStyle, resolveAgentTheme } from '@/lib/agent-experience'
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

const voiceSupported = ref(false)

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<unknown>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

// #ifdef H5
// window.SpeechRecognition 为浏览器宿主 API，uni 类型无定义，保留 as any
voiceSupported.value =
  typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
// #endif

const hotBots = ref<SquareBot[]>([])
const hotQuestions = ref<SquareQuestion[]>([])
const ranking = ref<RankingAgent[]>([])
const recentConvs = ref<AgentConversation[]>([])

/** 最近使用只承担“识别并续聊”：压平长回复、去除 Markdown 噪声并限制摘要长度。 */
function recentMessageSummary(message?: string): string {
  const compact = String(message || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/[*_`>#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!compact) return '继续对话'

  const chars = Array.from(compact)
  return chars.length > 48 ? `${chars.slice(0, 48).join('')}…` : compact
}

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
    // 最近会话是登录态增强项：游客只浏览公开广场，不触发 401 全局登录跳转。
    if (getToken()) {
      agentsSquareApi.getConversations()
        .then((cs) => {
          const publicBotIds = new Set(hotBots.value.map((bot) => bot.id))
          recentConvs.value = (cs || []).filter((conv) => publicBotIds.has(conv.botConfigId)).slice(0, 6)
        })
        .catch(() => { recentConvs.value = [] })
    } else {
      recentConvs.value = []
    }
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
  const map = new Map<string, { key: string; bots: SquareBot[] }>()
  for (const b of hotBots.value) {
    const key = b.categoryName || '综合助手'
    if (!map.has(key)) map.set(key, { key: b.category, bots: [] })
    map.get(key)!.bots.push(b)
  }
  return Array.from(map.entries()).map(([name, group]) => ({ name, ...group }))
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
  position: relative;
  width: 56rpx; height: 56rpx; border-radius: 999rpx;
  background: #f5f0e8;
  display: flex; align-items: center; justify-content: center;
}
.voice-btn::before {
  content: '';
  position: absolute;
  inset: -16rpx;
  border-radius: 999rpx;
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

/* ① 官方学习向导：采用“路线中枢”视觉，与垂直学伴同源但不抢类别身份 */
.zx-wrap { margin-top: 32rpx; }
.zx-card {
  position: relative;
  display: flex; align-items: center; gap: 24rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 14% 12%, rgba(109,143,255,.15), transparent 28%),
    linear-gradient(145deg, #f7f9ff, #ffffff 58%, #fffaf2);
  border: 1rpx solid rgba(83, 103, 166, 0.2);
  border-radius: 28rpx;
  padding: 28rpx 24rpx 30rpx;
  box-shadow: 0 12rpx 32rpx rgba(55, 68, 105, 0.1);
}
.guide-visual {
  position: relative;
  width: 166rpx;
  height: 166rpx;
  flex: 0 0 166rpx;
  overflow: hidden;
  border-radius: 28rpx;
  background: linear-gradient(145deg, #172f6d, #475cd1 56%, #7b6cef);
  box-shadow: 0 12rpx 28rpx rgba(58, 75, 165, .25);
}
.guide-grid {
  position: absolute;
  inset: 0;
  opacity: .42;
  background-image:
    linear-gradient(rgba(255,255,255,.12) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255,255,255,.12) 1rpx, transparent 1rpx);
  background-size: 28rpx 28rpx;
}
.guide-orbit {
  position: absolute;
  border: 1rpx solid rgba(255,255,255,.4);
  border-radius: 999rpx;
  animation: orbit-turn 16s linear infinite;
}
.guide-orbit-a { inset: 22rpx; }
.guide-orbit-b { inset: 43rpx; border-style: dashed; animation-direction: reverse; animation-duration: 10s; }
.guide-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 58rpx;
  height: 58rpx;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255,255,255,.85);
  border-radius: 18rpx;
  background: rgba(255,255,255,.16);
  box-shadow: 0 0 26rpx rgba(166,210,255,.6);
}
.guide-core-glyph { font-size: 34rpx; font-weight: 700; color: #fff; }
.guide-node {
  position: absolute;
  z-index: 2;
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255,255,255,.8);
  border-radius: 10rpx;
  background: rgba(22,39,96,.72);
  box-shadow: 0 0 16rpx rgba(164,213,255,.44);
}
.guide-node text { font-size: 17rpx; color: #fff; }
.guide-node-a { top: 17rpx; right: 28rpx; }
.guide-node-b { right: 18rpx; bottom: 24rpx; }
.guide-node-c { bottom: 20rpx; left: 23rpx; }
.guide-node-a,
.guide-node-b,
.guide-node-c { animation: guide-node 2.8s ease-in-out infinite; }
.guide-node-b { animation-delay: .7s; }
.guide-node-c { animation-delay: 1.4s; }
.zx-info {
  flex: 1;
  min-width: 0;
  padding-bottom: 54rpx;
}
.zx-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx 12rpx; }
.zx-title { font-size: 31rpx; font-weight: 700; color: #27304f; }
.zx-official {
  display: flex; align-items: center; gap: 4rpx;
  padding: 3rpx 12rpx;
  background: rgba(201, 169, 110, 0.14);
  border-radius: 999rpx;
}
.zx-official-txt { font-size: 20rpx; color: #a8863d; }
.zx-desc {
  display: block;
  font-size: 23rpx; color: #69718a; line-height: 1.55;
  margin-top: 10rpx;
}
.zx-caps { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 14rpx; }
.zx-cap {
  padding: 4rpx 12rpx;
  background: rgba(83, 103, 166, .07);
  border: 1rpx solid rgba(83, 103, 166, .14);
  color: #5b668d;
  font-size: 20rpx;
  border-radius: 999rpx;
}
.zx-go {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 5rpx;
  padding: 11rpx 20rpx;
  background: linear-gradient(135deg, #4358c9, #7868e8);
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(65, 83, 191, .25);
}
.zx-go-txt { font-size: 22rpx; font-weight: 600; color: #ffffff; }

/* 客服在末尾作为平台工具，不与学习内容竞争首屏 */
.service-footer { margin-top: 56rpx; }
.cs-row {
  display: flex; align-items: center; gap: 16rpx;
  background: rgba(255,255,255,.76);
  border: 1rpx solid rgba(91,106,134,.12);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
}
.cs-icon {
  width: 56rpx; height: 56rpx; border-radius: 14rpx; flex-shrink: 0;
  background: rgba(91,106,134,.09);
  display: flex; align-items: center; justify-content: center;
}
.cs-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3rpx; }
.cs-title { font-size: 25rpx; font-weight: 600; color: #485064; }
.cs-txt { font-size: 21rpx; color: #8a91a0; }

/* ② 最近使用：固定高度的横向续聊带，长回复只显示两行摘要 */
.recent-scroll {
  width: 100%;
  height: 144rpx;
  min-height: 144rpx;
  max-height: 144rpx;
  white-space: nowrap;
  overflow: hidden;
}
.recent-row {
  display: inline-flex;
  align-items: flex-start;
  flex-wrap: nowrap;
  gap: 16rpx;
  height: 144rpx;
  min-height: 144rpx;
  max-height: 144rpx;
  padding: 0 32rpx;
  box-sizing: border-box;
  vertical-align: top;
}
.recent-card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  width: 420rpx;
  height: 144rpx;
  min-height: 144rpx;
  max-height: 144rpx;
  box-sizing: border-box;
  align-self: flex-start;
  flex: 0 0 420rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 16rpx 18rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.recent-avatar {
  width: 64rpx; height: 64rpx; border-radius: 16rpx; flex-shrink: 0; overflow: hidden;
  background: rgba(196, 30, 58, 0.08);
  display: flex; align-items: center; justify-content: center;
}
.recent-avatar-img { width: 64rpx; height: 64rpx; }
.recent-info {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}
.recent-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
  max-width: 100%;
}
.recent-name {
  display: block;
  flex: 1;
  min-width: 0;
  max-width: 100%;
  font-size: 26rpx;
  line-height: 32rpx;
  font-weight: 600;
  color: var(--text-ink, #2c2c2c);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-msg {
  display: -webkit-box;
  width: 100%;
  max-width: 100%;
  max-height: 56rpx;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 28rpx;
  color: #888888;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-time {
  flex-shrink: 0;
  font-size: 20rpx;
  line-height: 28rpx;
  color: #bbbbbb;
  white-space: nowrap;
}

/* ③ 热门 TOP5：复用下方分类色与“轨道核心”识别，不再是另一套灰白榜单 */
.top-scroll { white-space: nowrap; }
.top-row { display: inline-flex; gap: 16rpx; padding: 0 32rpx; }
.top-card {
  position: relative;
  width: 220rpx;
  overflow: hidden;
  display: flex; flex-direction: column;
  background: #ffffff;
  border-radius: 20rpx;
  border: 1rpx solid rgba(93,111,159,.13);
  box-shadow: 0 6rpx 18rpx rgba(54,68,105,.07);
}
.top-rank {
  position: absolute; top: 10rpx; left: 10rpx; z-index: 3;
  width: 36rpx; height: 36rpx; border-radius: 999rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 20rpx; font-weight: 700;
  background: #e8e3db; color: #666666;
}
.top-rank-0 { background: #ffd700; color: #5c4400; }
.top-rank-1 { background: #d9d9d9; color: #555555; }
.top-rank-2 { background: #e2a06c; color: #5a3312; }
.top-visual {
  position: relative;
  height: 112rpx;
  flex-shrink: 0;
  background:
    radial-gradient(circle at 78% 16%, var(--agent-glow), transparent 42%),
    linear-gradient(145deg, var(--agent-deep), var(--agent-accent));
}
.top-orbit {
  position: absolute;
  top: 20rpx;
  left: 50%;
  width: 72rpx;
  height: 72rpx;
  transform: translateX(-50%);
  border: 1rpx dashed rgba(255,255,255,.55);
  border-radius: 999rpx;
  animation: top-orbit-turn 12s linear infinite;
}
.top-avatar {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 58rpx; height: 58rpx; border-radius: 18rpx; overflow: hidden;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,.16);
  border: 2rpx solid rgba(255,255,255,.88);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 20rpx var(--agent-glow);
}
.top-avatar-img { width: 54rpx; height: 54rpx; }
.top-avatar-glyph { font-size: 31rpx; font-weight: 700; color: #fff; }
.top-copy { min-height: 88rpx; box-sizing: border-box; padding: 13rpx 14rpx 14rpx; }
.top-name {
  display: block;
  max-width: 100%;
  font-size: 23rpx; font-weight: 700; color: #273047;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.top-heat { display: block; font-size: 19rpx; color: var(--agent-ink); margin-top: 4rpx; }
.top-heat.muted { color: #8c94a6; }

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

/* 空态 */
.empty-block { padding: 80rpx 32rpx; display: flex; justify-content: center; }
.empty-txt { font-size: 26rpx; color: #999999; }

.bottom-gap { height: 32rpx; }
@keyframes orbit-turn {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes guide-node {
  0%, 100% { transform: translateY(0); opacity: .82; }
  50% { transform: translateY(-4rpx); opacity: 1; }
}
@keyframes top-orbit-turn {
  from { transform: translateX(-50%) rotate(0deg); }
  to { transform: translateX(-50%) rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .guide-orbit,
  .guide-node,
  .top-orbit { animation: none; }
}
</style>
