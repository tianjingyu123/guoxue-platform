<script setup lang="ts">
/**
 * 智能体对话核心页（原型 app/agent/[id]/page.tsx 迁移）
 * 文字对话（真连 /bots/:id/chat）+ 推荐卡片(课程/圈子/商品/排盘·软性导流预留) + 续聊回填。
 * 语音通话(Coze RTC)真机联调下一轮，本期入口诚实提示「即将上线」，不做假壳。
 */
import { ref, computed, nextTick, onUnmounted, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import GuidedRecommendCard from '@/components/agent/guided-recommend-card.vue'
import RichMessage from '@/components/agent/rich-message.vue'
import AgentAnswerCard from '@/components/agent/cards/agent-answer-card.vue'
import { goBack, navigateTo, toastComingSoon } from '@/utils/router'
import {
  agentApi, chatWelcome, nowTime,
  type ChatMessage, type RecommendItem, type Recommendation,
} from '@/lib/agent-data'
import { botApi, type BotQuota } from '@/lib/bot-data'
import { formatPrice } from '@/utils/format'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'
import { agentThemeStyle, resolveAgentExperience } from '@/lib/agent-experience'
import { resolveAgentReferral } from '@/lib/agent-routing'
import { gotoComplaint } from '@/lib/trust-entry'

const loading = ref(true)
const error = ref('')
const agentId = ref('')
// 模板中多处裸访问 agentDetail 字段，收敛为具体类型会触发大量报错，保留 any
const agentDetail = ref<any>({ name: '', freeQuota: 0, pricePerChat: 0, callPrice: 0 })
const quickQuestions = ref<string[]>([])
// 推荐课程/圈子来自后端动态结构（未在模板渲染，仅暂存），结构未固定，保留 any
const recommendedCourses = ref<any[]>([])
const recommendedCircles = ref<any[]>([])

const messages = ref<ChatMessage[]>([
  { id: 0, role: 'assistant', content: chatWelcome, time: nowTime() },
])
const inputValue = ref('')
const isTyping = ref(false)
const freeRemaining = ref(0)
// 当前 Coze 续聊会话 id（流式 body 传参 + onMeta 回写；与 agentApi 内部会话表保持同步）
const conversationId = ref('')
const showMenu = ref(false)
const scrollId = ref('')
const showBirthForm = ref(false)
const expandedAnswers = ref<Record<number, boolean>>({})
const birthForm = ref({
  calendar: 'solar' as 'solar' | 'lunar',
  date: '',
  time: '',
  timeUnknown: false,
  gender: '男' as '男' | '女',
  city: '',
})

// ───── AI 计费：追问额度（GET /bots/:id/quota）─────
const quota = ref<BotQuota | null>(null)
// 耗尽购买弹窗
const showPurchaseModal = ref(false)
// 购买防重复提交
const purchasing = ref(false)

let streamTimer: ReturnType<typeof setInterval> | null = null

const showQuick = computed(() => messages.value.length <= 1)
const experience = computed(() => resolveAgentExperience(agentDetail.value))
const experienceStyle = computed(() => agentThemeStyle(experience.value.theme.key))
const isBaziAgent = computed(() => /八字|命理|子平/.test([
  agentDetail.value.name,
  agentDetail.value.description,
  agentDetail.value.type,
].join(' ')))
const serviceModeLabel = computed(() => agentDetail.value.voiceEnabled ? '语音通话型' : experience.value.modeLabel)

function cleanAnswerText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim()
}

function answerParagraphs(text: string) {
  return cleanAnswerText(text)
    .split(/\n+/)
    .map((item) => item.replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[、.)：:\s]*/, '').trim())
    .filter(Boolean)
}

function answerLead(text: string) {
  const first = answerParagraphs(text)[0] || '我已经为您整理好本次解读。'
  return first.length > 92 ? `${first.slice(0, 92)}…` : first
}

function answerPoints(text: string) {
  const lead = answerLead(text).replace(/…$/, '')
  return answerParagraphs(text)
    .filter((item) => !lead.startsWith(item) && !item.startsWith(lead))
    .slice(0, 3)
    .map((item) => item.length > 54 ? `${item.slice(0, 54)}…` : item)
}

function isLongAnswer(msg: ChatMessage) {
  return msg.role === 'assistant' && !msg.isStreaming && !msg.isError && msg.content.length > 220
}

function toggleAnswer(id: number) {
  expandedAnswers.value[id] = !expandedAnswers.value[id]
}

/** 免费试用剩余次数 */
const trialLeft = computed(() => {
  const q = quota.value
  return q ? Math.max(0, q.freeUses - q.freeUsed) : 0
})

/**
 * 额度提示条状态：
 * hidden=不显示（免费智能体/额度未拉到） member=会员畅享
 * trial=试用期内 pack=有追问包 exhausted=均已用完
 */
const quotaState = computed<'hidden' | 'member' | 'trial' | 'pack' | 'exhausted'>(() => {
  const q = quota.value
  if (!q || q.pricePer10Coin <= 0) return 'hidden' // 免费智能体或未登录拉不到额度 → 不打扰
  if (q.memberFree) return 'member'
  if (trialLeft.value > 0) return 'trial'
  if (q.paidRemaining > 0) return 'pack'
  return 'exhausted'
})
const servicePriceLabel = computed(() => {
  if (quotaState.value === 'member') return '会员畅享'
  if (agentDetail.value.pricePerChat > 0) return `${formatPrice(agentDetail.value.pricePerChat)}元/次`
  return '免费使用'
})

/** 约合单价（币/次·定价透明化），整数不带小数 */
const perUsePrice = computed(() => {
  const p = (quota.value?.pricePer10Coin ?? 0) / 10
  return Number.isInteger(p) ? String(p) : p.toFixed(1)
})

/** 拉取追问额度（失败静默：未登录/免费智能体均不打扰对话主流程） */
async function refreshQuota() {
  if (!agentId.value) return
  try {
    quota.value = await botApi.getQuota(agentId.value, true)
  } catch (_e) {
    quota.value = null
  }
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const pages = getCurrentPages()
    // 宿主页面实例对象，uni 类型未暴露 options/$page 字段，保留 as any
    const currentPage = pages[pages.length - 1] as any
    const opts = currentPage?.options || currentPage?.$page?.options || {}
    const id = opts.id || '1'
    agentId.value = id
    const convId = opts.conversationId || ''

    const [detail, questions, recs] = await Promise.all([
      agentApi.getDetail(id),
      agentApi.getQuickQuestions(),
      agentApi.getRecommendations(),
    ])
    agentDetail.value = detail || { name: '', freeQuota: 0, pricePerChat: 0, callPrice: 0 }
    const tailored = resolveAgentExperience(agentDetail.value)
    quickQuestions.value = tailored.quickQuestions.length ? tailored.quickQuestions : (questions || [])
    messages.value = [{ id: 0, role: 'assistant', content: tailored.welcome, time: nowTime() }]
    recommendedCourses.value = recs?.courses || []
    recommendedCircles.value = recs?.circles || []
    freeRemaining.value = detail?.freeQuota || 0

    // 续聊并回填真实历史消息（拉取失败则保留欢迎语，不伪造历史）
    if (convId) {
      // ① 从「最近使用」带会话 id 进入：直接续聊该会话
      conversationId.value = convId
      agentApi.setConversation(id, convId)
      try {
        const hist = await agentApi.getChatHistory(id, convId, true)
        if (hist.length) messages.value = hist
      } catch (_e) { /* 历史拉取失败：保持欢迎语，不造假 */ }
    } else {
      // ② 直接点智能体进入：自动接上该智能体的最近一次会话（退出再进能续上，不是每次全新对话）
      try {
        const list = await agentApi.getHistory(true)
        const last = list.find((h) => h.botConfigId === id)
        if (last?.conversationId) {
          conversationId.value = last.conversationId
          agentApi.setConversation(id, last.conversationId)
          const hist = await agentApi.getChatHistory(id, last.conversationId, true)
          if (hist.length) messages.value = hist
        }
      } catch (_e) { /* 无历史或拉取失败：保持欢迎语开新会话 */ }
    }

    // 携带预填问题（广场「大家都在问」入口 ?q= 透传）
    if (opts.q) inputValue.value = decodeURIComponent(opts.q)

    // 追问额度（不阻塞主加载，失败静默）
    refreshQuota()
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

function scrollToBottom() {
  nextTick(() => { scrollId.value = 'anchor-' + Date.now() })
}

// 逐字展示：uni-app 小程序端不支持 EventSource，故对真实 sendMessage 返回的完整内容做客户端逐字动画（内容真实，仅动画）
function simulateStreaming(fullText: string, messageId: number, recommendation?: Recommendation) {
  let idx = 0
  streamTimer = setInterval(() => {
    if (idx < fullText.length) {
      idx = Math.min(idx + 3, fullText.length)
      const target = messages.value.find((m) => m.id === messageId)
      if (target) { target.content = fullText.slice(0, idx); target.isStreaming = idx < fullText.length }
      scrollToBottom()
    } else {
      if (streamTimer) clearInterval(streamTimer)
      const target = messages.value.find((m) => m.id === messageId)
      if (target) { target.isStreaming = false; target.recommendation = recommendation }
      isTyping.value = false
      scrollToBottom()
    }
  }, 25)
}

async function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isTyping.value) return
  messages.value.push({ id: messages.value.length, role: 'user', content: text, time: nowTime() })
  inputValue.value = ''
  const referral = resolveAgentReferral(text, experience.value.theme.key, agentDetail.value.name)
  if (referral) {
    messages.value.push({
      id: messages.value.length + 1,
      role: 'assistant',
      type: 'agent-route-card',
      payload: referral,
      content: '',
      time: nowTime(),
    })
    scrollToBottom()
    return
  }
  sendCore(text)
}

/**
 * 发送核心（handleSend 与失败重试共用；user 气泡由调用方保证已在列表中）。
 * H5 走真流式 SSE（增量上屏，根治 Coze 30s 轮询 502）；小程序/App 端不支持 fetch 流 → 降级原非流式接口 + 假打字机。
 */
function sendCore(text: string) {
  if (streamChatSupported()) sendCoreStream(text)
  else sendCoreFallback(text)
}

/** 额度耗尽/回复失败的统一错误处理（流式与降级共用，保持原有购买引导/失败气泡逻辑一致） */
function handleSendError(e: unknown, text: string) {
  const msg = (e as Error)?.message || ''
  if (msg.includes('追问次数已用完')) {
    // 额度耗尽：刷新额度并弹购买引导弹窗
    refreshQuota()
    showPurchaseModal.value = true
  } else {
    // 失败态落在气泡内（含重试），一次性 toast 一闪即逝且不给出路
    messages.value.push({
      id: messages.value.length + 1, role: 'assistant', time: nowTime(),
      content: msg || '回复失败了，请稍后重试', isError: true, failedQuery: text,
    })
    scrollToBottom()
  }
}

/** 发送成功后本地额度同步减 1（试用优先，其次追问包，与后端 consumeQuota 消耗顺序一致） */
function consumeQuotaLocal() {
  const q = quota.value
  if (q && q.pricePer10Coin > 0 && !q.memberFree) {
    if (q.freeUsed < q.freeUses) q.freeUsed += 1
    else if (q.paidRemaining > 0) q.paidRemaining -= 1
  }
}

/** H5 真流式：POST /bots/:id/chat/stream（chunk 增量实时上屏 + meta 会话/免责/导流） */
async function sendCoreStream(text: string) {
  isTyping.value = true
  if (freeRemaining.value > 0) freeRemaining.value -= 1
  scrollToBottom()
  // 先 push 一条空 assistant 消息，流式增量往里追加
  const msgId = messages.value.length + 1
  messages.value.push({ id: msgId, role: 'assistant', content: '', time: nowTime(), isStreaming: true })
  const live = () => messages.value.find((m) => m.id === msgId)
  try {
    await streamChat(
      `/bots/${agentId.value}/chat/stream`,
      { query: text, conversationId: conversationId.value || undefined },
      {
        onChunk: (t) => {
          const m = live()
          if (m) m.content += t
          scrollToBottom()
        },
        onMeta: (meta) => {
          const m = live()
          if (m) {
            // disclaimer 为后端下发的 AI 风险免责声明（合规要求）
            if (meta.disclaimer) m.disclaimer = meta.disclaimer
            if (meta.recommendation) m.recommendation = meta.recommendation as Recommendation
          }
          // 会话续聊 id：同步本地 ref 与 agentApi 内部会话表
          if (meta.conversationId) {
            conversationId.value = meta.conversationId
            agentApi.setConversation(agentId.value, meta.conversationId)
          }
        },
      },
    )
    // 成功：收尾流式态 + 本地额度同步减 1
    const done = live()
    if (done) done.isStreaming = false
    isTyping.value = false
    consumeQuotaLocal()
    scrollToBottom()
  } catch (e) {
    isTyping.value = false
    freeRemaining.value += 1 // 失败不消耗额度，回退发送前的本地预扣
    // 移除刚 push 的空流式消息（若内容仍为空）；已有部分内容则保留并收尾流式态
    const m = live()
    if (m) {
      if (!m.content) messages.value = messages.value.filter((x) => x !== m)
      else m.isStreaming = false
    }
    handleSendError(e, text)
  }
}

/** 非 H5 降级：原非流式接口 sendMessage + 客户端假打字机（内容真实，仅动画） */
function sendCoreFallback(text: string) {
  isTyping.value = true
  if (freeRemaining.value > 0) freeRemaining.value -= 1
  scrollToBottom()
  setTimeout(async () => {
    try {
      const { text: reply, disclaimer, recommendation } = await agentApi.sendMessage(agentId.value, text)
      const id = messages.value.length + 1
      // disclaimer 为后端下发的 AI 风险免责声明（合规要求），随该条 assistant 消息保存并展示
      messages.value.push({ id, role: 'assistant', content: '', time: nowTime(), isStreaming: true, disclaimer })
      simulateStreaming(reply, id, recommendation)
      // 发送成功：本地余量同步减 1
      consumeQuotaLocal()
    } catch (e) {
      isTyping.value = false
      freeRemaining.value += 1 // 失败不消耗额度，回退发送前的本地预扣
      handleSendError(e, text)
    }
  }, 600)
}

/** 重试失败的提问：移除失败气泡，原文重发（user 气泡还在列表里，不重复插入） */
function retryFailed(m: ChatMessage) {
  if (isTyping.value || !m.failedQuery) return
  messages.value = messages.value.filter((x) => x !== m)
  sendCore(m.failedQuery)
}

// ───── 耗尽购买弹窗：购买追问包 / 开通会员 ─────

/** 购买追问包（10次/包·防重复提交；余额不足 → 提示并跳充值页） */
async function doPurchase() {
  if (purchasing.value) return
  purchasing.value = true
  try {
    await botApi.purchaseUses(agentId.value)
    uni.showToast({ title: '已到账 10 次', icon: 'success' })
    await refreshQuota()
    showPurchaseModal.value = false
  } catch (e) {
    const msg = (e as Error)?.message || '购买失败'
    uni.showToast({ title: msg, icon: 'none' })
    // 国学币余额不足 → 引导去充值页
    if (msg.includes('余额不足')) {
      setTimeout(() => navigateTo('/wallet/recharge'), 600)
    }
  } finally {
    purchasing.value = false
  }
}

/** 开通会员畅享全部智能体 → 会员中心 */
function goMember() {
  showPurchaseModal.value = false
  navigateTo('/vip')
}

function handleQuick(q: string) {
  inputValue.value = q
}

function onBirthDateChange(e: any) {
  birthForm.value.date = e?.detail?.value || ''
}

function onBirthTimeChange(e: any) {
  birthForm.value.time = e?.detail?.value || ''
}

function submitBirthForm() {
  const form = birthForm.value
  if (!form.date) {
    uni.showToast({ title: '请选择出生日期', icon: 'none' })
    return
  }
  if (!form.timeUnknown && !form.time) {
    uni.showToast({ title: '请选择出生时间', icon: 'none' })
    return
  }
  if (!form.city.trim()) {
    uni.showToast({ title: '请填写出生城市', icon: 'none' })
    return
  }
  if (isTyping.value) return

  const timeText = form.timeUnknown ? '时辰不详' : form.time
  const calendarText = form.calendar === 'solar' ? '公历' : '农历'
  const query = [
    '请按以下资料排八字，并先给结论提要，再用平台图文模板分项解读：',
    `历法：${calendarText}`,
    `出生日期：${form.date}`,
    `出生时间：${timeText}`,
    `性别：${form.gender}`,
    `出生城市：${form.city.trim()}`,
  ].join('\n')
  messages.value.push({
    id: messages.value.length,
    role: 'user',
    content: query,
    time: nowTime(),
    structuredInput: {
      kind: 'bazi',
      data: {
        calendar: form.calendar,
        date: form.date,
        time: form.time,
        timeUnknown: form.timeUnknown,
        gender: form.gender,
        city: form.city.trim(),
      },
    },
  })
  showBirthForm.value = false
  scrollToBottom()
  sendCore(query)
}

function handleClearContext() {
  // 真正清除上下文：丢弃当前 Coze 会话 id，下一条消息开启全新会话（非仅清屏）
  agentApi.clearConversation(agentId.value)
  messages.value = [{ id: 0, role: 'assistant', content: `对话已重置。\n\n${experience.value.welcome}`, time: nowTime() }]
  showMenu.value = false
}

function openAgentComplaint() {
  showMenu.value = false
  gotoComplaint('智能体回答与付费服务', `${agentDetail.value?.name || '智能体'} · 智能体ID ${agentId.value}`)
}

function openCustomerService() {
  showMenu.value = false
  navigateTo('/customer-service')
}

// 软性导流：同意/拒绝查看推荐
function consentReco(msg: ChatMessage) {
  msg.recoConsented = true
  scrollToBottom()
}
function declineReco(msg: ChatMessage) {
  msg.recommendation = undefined
}

// 推荐卡片点击 → 跳转对应板块
function openRecommend(item: RecommendItem) {
  if (item.data?.href) navigateTo(item.data.href)
  else if (item.type === 'course') navigateTo(`/courses/${item.data.id}`)
  else if (item.type === 'circle') navigateTo(`/circles/${item.data.id}`)
  else if (item.type === 'product') navigateTo(`/shop/${item.data.id}`)
  else if (item.type === 'article') navigateTo(`/articles/${item.data.id}`)
  else if (item.type === 'classic') navigateTo(`/classics/${item.data.id}`)
  else if (item.type === 'video') navigateTo(`/video/${item.data.id}`)
  else if (item.type === 'live') navigateTo(`/live/${item.data.id}`)
  else if (item.type === 'agent') navigateTo(`/agent/${item.data.id}`)
  else if (item.type === 'paipan') navigateTo('/paipan')
  else toastComingSoon()
}

onUnmounted(() => {
  if (streamTimer) clearInterval(streamTimer)
})
</script>

<template>
  <!-- 状态态返回栏：加载/硬失败时也能退出，避免卡死 -->
  <view v-if="loading || error" class="state-back" @tap="goBack()">
    <AppIcon name="arrow-left" :size="40" color="#1A1A1A" />
  </view>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <view v-else class="page" :style="experienceStyle">
    <!-- 顶部导航 -->
    <view class="header safe-pt">
      <view class="head-bar">
        <view class="back" @tap="goBack()"><AppIcon name="arrow-left" :size="44" color="#1A1A1A" /></view>
        <view class="head-center">
          <view class="head-avatar">
            <text class="head-avatar-glyph">{{ experience.theme.glyph }}</text>
            <view class="online-dot" />
          </view>
          <view class="head-text">
            <text class="head-name">{{ agentDetail.name }}</text>
            <view class="head-status"><view class="status-dot" /><text class="status-txt">在线 · {{ serviceModeLabel }}</text></view>
          </view>
        </view>
        <view class="head-actions">
          <view class="menu-wrap">
            <view class="act" @tap="showMenu = !showMenu"><AppIcon name="more-horizontal" :size="34" color="#999" /></view>
            <view v-if="showMenu" class="menu-mask" @tap="showMenu = false" />
            <view v-if="showMenu" class="menu">
              <view class="menu-item" @tap="handleClearContext"><AppIcon name="trash-2" :size="28" color="#1a1a1a" /><text class="menu-txt">清除上下文</text></view>
              <view class="menu-item" @tap="openCustomerService"><AppIcon name="headphones" :size="28" color="#1a1a1a" /><text class="menu-txt">联系平台客服</text></view>
              <view class="menu-item" @tap="openAgentComplaint"><AppIcon name="shield-alert" :size="28" color="#C41E3A" /><text class="menu-txt">投诉此服务</text></view>
            </view>
          </view>
        </view>
      </view>
      <view class="service-strip">
        <view class="service-pill">
          <AppIcon :name="agentDetail.voiceEnabled ? 'phone' : 'file-text'" :size="22" :color="experience.theme.ink" />
          <text class="service-pill-text">{{ serviceModeLabel }}</text>
        </view>
        <text class="service-price">{{ servicePriceLabel }}</text>
        <text v-if="quotaState === 'hidden' && freeRemaining > 0" class="service-trial">剩 {{ freeRemaining }} 次</text>
      </view>
    </view>

    <!-- 对话区 -->
    <scroll-view scroll-y class="msg-area" :scroll-into-view="scrollId" :scroll-with-animation="true">
      <view class="msg-list">
        <view v-for="msg in messages" :key="msg.id" class="msg-row" :class="{ 'msg-row-user': msg.role === 'user' }">
          <view v-if="msg.role === 'assistant'" class="msg-avatar"><text class="msg-avatar-glyph">{{ experience.theme.glyph }}</text></view>
          <view class="msg-content" :class="{ 'content-user': msg.role === 'user' }">
            <view v-if="msg.type && msg.type !== 'text'" class="rich-message-wrap">
              <RichMessage :type="msg.type" :content="msg.content" :payload="msg.payload" />
            </view>
            <!-- 八字资料通过表格卡提交，避免长段自然语言重复确认 -->
            <view v-else-if="msg.role === 'user' && msg.structuredInput?.kind === 'bazi'" class="birth-summary">
              <view class="birth-summary-head">
                <AppIcon name="calendar" :size="26" color="#6977c9" />
                <text class="birth-summary-title">我的出生资料</text>
                <text class="birth-summary-done">已提交</text>
              </view>
              <view class="birth-summary-grid">
                <view class="birth-summary-item"><text class="birth-summary-label">历法</text><text class="birth-summary-value">{{ msg.structuredInput.data.calendar === 'solar' ? '公历' : '农历' }}</text></view>
                <view class="birth-summary-item"><text class="birth-summary-label">日期</text><text class="birth-summary-value">{{ msg.structuredInput.data.date }}</text></view>
                <view class="birth-summary-item"><text class="birth-summary-label">时间</text><text class="birth-summary-value">{{ msg.structuredInput.data.timeUnknown ? '时辰不详' : msg.structuredInput.data.time }}</text></view>
                <view class="birth-summary-item"><text class="birth-summary-label">性别</text><text class="birth-summary-value">{{ msg.structuredInput.data.gender }}</text></view>
                <view class="birth-summary-item birth-summary-wide"><text class="birth-summary-label">出生地</text><text class="birth-summary-value">{{ msg.structuredInput.data.city }}</text></view>
              </view>
            </view>
            <!-- 完成后的 AI 回复统一转为专业图文模板；流式生成中保持轻量文本，结束后自然“成卡” -->
            <AgentAnswerCard
              v-else-if="msg.role === 'assistant' && !msg.isStreaming && !msg.isError && msg.content"
              :content="msg.content"
              :experience="experience"
              :agent-name="agentDetail.name"
            />
            <view v-else class="bubble" :class="msg.role === 'user' ? 'bubble-user' : msg.isError ? 'bubble-error' : 'bubble-ai'">
              <text class="bubble-text" :class="{ 'streaming-cursor': msg.isStreaming }">{{ msg.content }}</text>
              <view v-if="msg.isError" class="bubble-retry" @tap="retryFailed(msg)">
                <AppIcon name="refresh-cw" :size="24" color="#c41e3a" /><text class="bubble-retry-txt">点击重试</text>
              </view>
            </view>
            <!-- AI 风险免责声明（后端下发，仅 assistant 消息且非流式时展示） -->
            <text v-if="msg.role === 'assistant' && msg.disclaimer && !msg.isStreaming" class="ai-disclaimer">{{ msg.disclaimer }}</text>
            <!-- 软性导流推荐（先征求同意，同意才展开真实卡片） -->
            <view v-if="msg.role === 'assistant' && msg.recommendation && !msg.isStreaming" class="recommend-block">
              <!-- 征求同意 -->
              <view v-if="!msg.recoConsented" class="reco-consent">
                <text class="reco-consent-text">{{ msg.recommendation.consentPrompt }}</text>
                <view class="reco-consent-btns">
                  <view class="reco-btn reco-btn-yes" @tap="consentReco(msg)"><text class="reco-btn-yes-text">好的，看看</text></view>
                  <view class="reco-btn reco-btn-no" @tap="declineReco(msg)"><text class="reco-btn-no-text">不用了</text></view>
                </view>
              </view>
              <!-- 同意后展开真实卡片 -->
              <template v-else>
                <view class="recommend-head"><AppIcon name="sparkles" :size="24" color="#c9a96e" /><text class="recommend-label">为您推荐</text></view>
                <GuidedRecommendCard
                  v-for="(rec, i) in msg.recommendation.items"
                  :key="`${rec.type}-${rec.data?.id || i}`"
                  :item="rec"
                  @tap="openRecommend"
                />
              </template>
            </view>
          </view>
        </view>

        <!-- 正在输入 -->
        <view v-if="isTyping && messages[messages.length - 1]?.role === 'user'" class="msg-row">
          <view class="msg-avatar"><text class="msg-avatar-glyph">{{ experience.theme.glyph }}</text></view>
          <view class="bubble bubble-ai typing">
            <view class="dots"><view class="dot typing-dot" style="animation-delay:0s" /><view class="dot typing-dot" style="animation-delay:0.15s" /><view class="dot typing-dot" style="animation-delay:0.3s" /></view>
          </view>
        </view>

        <!-- 智能体专属任务台：跟随欢迎语进入消息流，避免挤压对话可视区域 -->
        <view v-if="showQuick" class="experience-deck">
          <view class="experience-head">
            <view>
              <text class="experience-kicker">{{ experience.modeLabel }}</text>
              <text class="experience-title">{{ experience.taskTitle }}</text>
            </view>
            <text class="experience-hint">{{ experience.taskHint }}</text>
          </view>
          <view class="experience-tasks">
            <view
              v-for="(task, taskIndex) in experience.tasks"
              :key="task.label"
              class="experience-task"
              @tap="handleQuick(quickQuestions[taskIndex] || task.label)"
            >
              <text class="experience-task-no">0{{ taskIndex + 1 }}</text>
              <text class="experience-task-label">{{ task.label }}</text>
              <text class="experience-task-desc">{{ task.description }}</text>
            </view>
          </view>
        </view>

        <view v-if="showQuick" class="quick-zone">
          <view class="quick-head"><AppIcon name="sparkles" :size="24" :color="experience.theme.ink" /><text class="quick-label">试着这样问</text></view>
          <view class="quick-list">
            <view v-for="(q, i) in quickQuestions" :key="i" class="quick-chip" @tap="handleQuick(q)">{{ q }}</view>
          </view>
        </view>

        <view :id="scrollId" class="anchor" />
      </view>
    </scroll-view>

    <!-- 追问额度轻提示条（仅付费计费智能体展示，不打扰免费对话） -->
    <view v-if="quotaState === 'member'" class="quota-bar quota-bar-vip">
      <AppIcon name="crown" :size="24" color="#c9a96e" /><text class="quota-vip-txt">会员畅享</text>
    </view>
    <view v-else-if="quotaState === 'trial'" class="quota-bar">
      <AppIcon name="zap" :size="24" color="#c9a96e" /><text class="quota-txt">免费试用剩 <text class="quota-num">{{ trialLeft }}</text> 次</text>
    </view>
    <view v-else-if="quotaState === 'pack'" class="quota-bar">
      <AppIcon name="package" :size="24" color="#c9a96e" /><text class="quota-txt">追问包剩 <text class="quota-num">{{ quota?.paidRemaining }}</text> 次</text>
    </view>
    <view v-else-if="quotaState === 'exhausted'" class="quota-bar">
      <AppIcon name="zap" :size="24" color="#bbb" /><text class="quota-txt">免费次数已用完</text>
      <view class="quota-buy-btn" @tap="showPurchaseModal = true"><text class="quota-buy-txt">购买追问包</text></view>
    </view>

    <!-- 智能体专用资料工具：用结构化表单代替反复追问 -->
    <view v-if="isBaziAgent" class="compose-tools">
      <view class="compose-tool" @tap="showBirthForm = !showBirthForm">
        <AppIcon name="calendar" :size="25" color="#6977c9" />
        <text class="compose-tool-text">填写出生信息</text>
        <text class="compose-tool-sub">一次填完，直接排盘</text>
      </view>
      <view v-if="agentDetail.voiceEnabled" class="compose-tool compose-tool-voice" @tap="toastComingSoon()">
        <AppIcon name="phone" :size="24" color="#c41e3a" />
        <text class="compose-tool-text compose-tool-text-voice">语音通话</text>
        <text class="compose-tool-soon">即将开放</text>
      </view>
    </view>

    <view v-if="showBirthForm" class="birth-form">
      <view class="birth-form-head">
        <view>
          <text class="birth-form-title">出生信息</text>
          <text class="birth-form-sub">仅用于本次排盘，信息将按隐私规则保护</text>
        </view>
        <view class="birth-form-close" @tap="showBirthForm = false"><AppIcon name="x" :size="30" color="#7d8088" /></view>
      </view>
      <view class="birth-calendar-switch">
        <view class="birth-calendar-option" :class="{ active: birthForm.calendar === 'solar' }" @tap="birthForm.calendar = 'solar'"><text>公历</text></view>
        <view class="birth-calendar-option" :class="{ active: birthForm.calendar === 'lunar' }" @tap="birthForm.calendar = 'lunar'"><text>农历</text></view>
      </view>
      <view class="birth-form-grid">
        <picker mode="date" :value="birthForm.date || '1990-01-01'" @change="onBirthDateChange">
          <view class="birth-field">
            <text class="birth-field-label">出生日期</text>
            <text class="birth-field-value" :class="{ muted: !birthForm.date }">{{ birthForm.date || '请选择' }}</text>
          </view>
        </picker>
        <picker mode="time" :value="birthForm.time || '12:00'" :disabled="birthForm.timeUnknown" @change="onBirthTimeChange">
          <view class="birth-field" :class="{ disabled: birthForm.timeUnknown }">
            <text class="birth-field-label">出生时间</text>
            <text class="birth-field-value" :class="{ muted: !birthForm.time }">{{ birthForm.timeUnknown ? '时辰不详' : (birthForm.time || '请选择') }}</text>
          </view>
        </picker>
        <view class="birth-field">
          <text class="birth-field-label">性别</text>
          <view class="birth-gender">
            <text :class="{ active: birthForm.gender === '男' }" @tap="birthForm.gender = '男'">男</text>
            <text :class="{ active: birthForm.gender === '女' }" @tap="birthForm.gender = '女'">女</text>
          </view>
        </view>
        <view class="birth-field">
          <text class="birth-field-label">出生城市</text>
          <input v-model="birthForm.city" class="birth-city-input" placeholder="如：成都" maxlength="20" />
        </view>
      </view>
      <view class="birth-unknown" @tap="birthForm.timeUnknown = !birthForm.timeUnknown">
        <view class="birth-check" :class="{ checked: birthForm.timeUnknown }"><AppIcon v-if="birthForm.timeUnknown" name="check" :size="20" color="#fff" /></view>
        <text class="birth-unknown-text">不记得具体时辰</text>
      </view>
      <view class="birth-submit" @tap="submitBirthForm">
        <AppIcon name="sparkles" :size="26" color="#fff" />
        <text class="birth-submit-text">提交资料并开始排盘</text>
      </view>
    </view>

    <!-- 底部输入 -->
    <view class="input-bar safe-pb">
      <textarea class="input" v-model="inputValue" placeholder="输入您的问题..." :maxlength="-1" auto-height :show-confirm-bar="false" />
      <view class="send-btn" :class="{ disabled: !inputValue.trim() || isTyping }" @tap="handleSend()"><AppIcon name="send" :size="34" color="#ffffff" /></view>
    </view>
    <view class="disclaimer safe-pb">此内容由AI生成，仅供参考，不构成专业建议</view>

    <!-- 耗尽购买弹窗（额度用完时居中弹出） -->
    <view v-if="showPurchaseModal" class="pm-mask" @tap="showPurchaseModal = false">
      <view class="pm-card" @tap.stop>
        <text class="pm-title">继续追问</text>
        <text class="pm-desc">购买追问包继续与『{{ agentDetail.name }}』对话</text>
        <view class="pm-price-row">
          <text class="pm-price">{{ quota?.pricePer10Coin }} 币 / 10 次</text>
          <text class="pm-per">约合 {{ perUsePrice }} 币/次</text>
        </view>
        <view class="pm-btn pm-btn-buy" :class="{ 'pm-btn-disabled': purchasing }" @tap="doPurchase">
          <text class="pm-btn-buy-txt">{{ purchasing ? '购买中...' : '购买追问包' }}</text>
        </view>
        <view class="pm-btn pm-btn-vip" @tap="goMember">
          <AppIcon name="crown" :size="28" color="#c9a96e" /><text class="pm-btn-vip-txt">开通会员畅享</text>
        </view>
        <view class="pm-cancel" @tap="showPurchaseModal = false"><text class="pm-cancel-txt">暂不</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 加载/错误状态 */
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
.state-back { position: fixed; left: 24rpx; top: calc(var(--status-bar-height, 0px) + 20rpx); z-index: 10; width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }

.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background:
    radial-gradient(circle at 86% 10%, var(--agent-soft), transparent 26%),
    linear-gradient(180deg, var(--agent-wash), #fff 34%);
}
.safe-pt { padding-top: var(--status-bar-height, 0); }
.safe-pb { padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); }

/* 顶部 */
.header { flex-shrink: 0; background: rgba(255,255,255,0.94); border-bottom: 1rpx solid rgba(91,108,154,.12); backdrop-filter: blur(18rpx); }
.head-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx; height: 88rpx; }
.head-center { display: flex; align-items: center; gap: 16rpx; }
.head-avatar {
  position: relative;
  width: 58rpx;
  height: 58rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, var(--agent-deep), var(--agent-accent));
  box-shadow: 0 7rpx 18rpx var(--agent-glow);
}
.head-avatar-glyph { font-size: 28rpx; font-weight: 700; color: #fff; }
.online-dot { position: absolute; bottom: -2rpx; right: -2rpx; width: 20rpx; height: 20rpx; background: #22c55e; border-radius: 50%; border: 3rpx solid #fff; }
.head-name { font-size: 29rpx; font-weight: 700; color: #252a34; }
.head-status { display: flex; align-items: center; gap: 6rpx; }
.status-dot { width: 12rpx; height: 12rpx; background: #22c55e; border-radius: 50%; }
.status-txt { font-size: 20rpx; color: #69717d; }
.head-actions { display: flex; align-items: center; gap: 8rpx; }
.act { padding: 10rpx; }
.menu-wrap { position: relative; }
.menu-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 40; }
.menu { position: absolute; right: 0; top: 100%; margin-top: 12rpx; width: 280rpx; background: #fff; border: 1rpx solid #ececec; border-radius: 16rpx; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); overflow: hidden; z-index: 50; }
.menu-item { display: flex; align-items: center; gap: 12rpx; padding: 24rpx 28rpx; }
.menu-item.bordered { border-top: 1rpx solid #f0f0f0; }
.menu-txt { font-size: 28rpx; color: #1a1a1a; }

.service-strip { height: 52rpx; padding: 0 24rpx 10rpx 88rpx; display: flex; align-items: center; gap: 12rpx; }
.service-pill { height: 38rpx; padding: 0 14rpx; display: flex; align-items: center; gap: 6rpx; border-radius: 999rpx; background: var(--agent-soft); }
.service-pill-text { font-size: 20rpx; color: var(--agent-ink); font-weight: 600; }
.service-price { font-size: 20rpx; color: #8a8f99; }
.service-trial { margin-left: auto; font-size: 20rpx; color: #a88645; }

/* 消息 */
.msg-area { flex: 1; overflow: hidden; }
.msg-list { padding: 28rpx 24rpx 40rpx; display: flex; flex-direction: column; gap: 36rpx; }
.msg-row { display: flex; gap: 14rpx; }
.msg-row-user { flex-direction: row-reverse; }
.msg-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, var(--agent-deep), var(--agent-accent));
  box-shadow: 0 6rpx 16rpx var(--agent-glow);
}
.msg-avatar-glyph { font-size: 23rpx; font-weight: 700; color: #fff; }
.msg-content { width: calc(100% - 62rpx); min-width: 0; }
.content-user { display: flex; flex-direction: column; align-items: flex-end; }
.content-user .bubble { max-width: 86%; }
.bubble { border-radius: 22rpx; padding: 20rpx 24rpx; }
.bubble-ai { background: transparent; padding: 2rpx 8rpx 2rpx 0; }
.bubble-user { background: linear-gradient(145deg, var(--agent-deep), var(--agent-accent)); border-bottom-right-radius: 7rpx; }
.bubble-error { background: #fdf3f3; border: 1rpx solid rgba(196, 30, 58, 0.18); border-bottom-left-radius: 6rpx; }
.bubble-error .bubble-text { color: #8a3a3a; }
.bubble-retry { display: inline-flex; align-items: center; gap: 8rpx; margin-top: 14rpx; padding: 8rpx 20rpx 8rpx 14rpx; border-radius: 999rpx; background: rgba(196, 30, 58, 0.08); }
.bubble-retry-txt { font-size: 24rpx; color: #c41e3a; font-weight: 500; }
.bubble-text { font-size: 30rpx; line-height: 1.72; white-space: pre-wrap; color: #252a34; }
.bubble-user .bubble-text { color: #fff; }
.typing { padding: 24rpx 28rpx; }
.dots { display: flex; gap: 10rpx; }
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: var(--agent-accent); }
.anchor { height: 1rpx; }

/* 分类知识卡：相同阅读骨架，标题、颜色和下一步随智能体改变 */
.answer-card { width: 100%; overflow: hidden; border: 1rpx solid rgba(91,108,154,.15); border-radius: 24rpx; background: linear-gradient(145deg, #fff 0%, var(--agent-wash) 100%); box-shadow: 0 10rpx 30rpx rgba(49,58,103,0.07); }
.answer-card-head { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 26rpx 18rpx; border-bottom: 1rpx solid rgba(91,108,154,.12); }
.answer-kicker { display: block; font-size: 20rpx; letter-spacing: 4rpx; color: var(--agent-ink); }
.answer-title { display: block; margin-top: 5rpx; font-family: "Songti SC", "STSong", serif; font-size: 34rpx; font-weight: 700; color: #252a34; }
.answer-seal { width: 54rpx; height: 54rpx; border: 2rpx solid var(--agent-accent); border-radius: 16rpx 8rpx 15rpx 9rpx; display: flex; align-items: center; justify-content: center; transform: rotate(-3deg); }
.answer-seal-text { font-family: "Songti SC", "STSong", serif; font-size: 26rpx; font-weight: 700; color: var(--agent-ink); }
.answer-lead { display: block; padding: 24rpx 26rpx 20rpx; font-size: 31rpx; line-height: 1.7; font-weight: 600; color: #252a34; }
.answer-points { padding: 0 26rpx 10rpx; }
.answer-point { display: flex; gap: 16rpx; padding: 16rpx 0; border-top: 1rpx solid rgba(37,42,52,0.08); }
.answer-point-no { flex-shrink: 0; padding-top: 2rpx; font-size: 19rpx; letter-spacing: 1rpx; color: var(--agent-ink); font-weight: 700; }
.answer-point-text { font-size: 27rpx; line-height: 1.58; color: #525966; }
.answer-toggle { margin: 4rpx 26rpx 22rpx; height: 68rpx; border-radius: 18rpx; background: var(--agent-soft); display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.answer-toggle-text { font-size: 25rpx; color: var(--agent-ink); font-weight: 600; }
.answer-detail { display: block; margin: 0 26rpx 24rpx; padding: 24rpx 0 0; border-top: 1rpx solid rgba(37,42,52,0.09); white-space: pre-wrap; font-size: 29rpx; line-height: 1.78; color: #343a46; }
.answer-next { margin-top: 2rpx; padding: 20rpx 26rpx 22rpx; display: flex; align-items: flex-start; gap: 14rpx; background: var(--agent-soft); }
.answer-next-label { flex-shrink: 0; padding: 4rpx 10rpx; border-radius: 8rpx; background: var(--agent-accent); font-size: 19rpx; color: #fff; font-weight: 700; }
.answer-next-text { font-size: 24rpx; line-height: 1.55; color: var(--agent-ink); }

/* 用户结构化资料卡 */
.birth-summary { width: 86%; overflow: hidden; border: 1rpx solid #dfe3f2; border-radius: 22rpx 22rpx 7rpx 22rpx; background: #f7f8ff; }
.birth-summary-head { height: 72rpx; padding: 0 20rpx; display: flex; align-items: center; gap: 9rpx; border-bottom: 1rpx solid #e5e8f4; }
.birth-summary-title { font-size: 27rpx; color: #252a34; font-weight: 700; }
.birth-summary-done { margin-left: auto; font-size: 20rpx; color: #5b9b70; }
.birth-summary-grid { padding: 10rpx 20rpx 18rpx; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24rpx; }
.birth-summary-item { min-width: 0; padding: 12rpx 0; display: flex; flex-direction: column; gap: 5rpx; border-bottom: 1rpx solid rgba(37,42,52,0.07); }
.birth-summary-wide { grid-column: 1 / -1; }
.birth-summary-label { font-size: 19rpx; color: #9297a2; }
.birth-summary-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 26rpx; color: #303641; font-weight: 600; }

/* 推荐卡片 */
.recommend-block { margin-top: 16rpx; display: flex; flex-direction: column; gap: 12rpx; }
.recommend-head { display: flex; align-items: center; gap: 6rpx; }
.recommend-label { font-size: 22rpx; color: #999; }
.reco-consent { background: rgba(201, 169, 110, 0.08); border: 2rpx solid rgba(201, 169, 110, 0.3); border-radius: 20rpx; padding: 24rpx; }
.reco-consent-text { font-size: 26rpx; color: #1a1a1a; line-height: 1.5; }
.reco-consent-btns { display: flex; gap: 16rpx; margin-top: 20rpx; }
.reco-btn { padding: 12rpx 32rpx; border-radius: 999rpx; }
.reco-btn-yes { background: #c9a96e; }
.reco-btn-yes-text { font-size: 26rpx; color: #fff; }
.reco-btn-no { background: rgba(0, 0, 0, 0.05); }
.reco-btn-no-text { font-size: 26rpx; color: #999; }
.rec-card { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; border-radius: 20rpx; border: 1rpx solid; }
.rec-course { background: rgba(196,30,58,0.04); border-color: rgba(196,30,58,0.1); }
.rec-circle { background: rgba(5,150,105,0.04); border-color: rgba(5,150,105,0.1); }
.rec-product { background: rgba(217,119,6,0.05); border-color: rgba(217,119,6,0.12); }
.rec-paipan { background: rgba(196,30,58,0.05); border-color: rgba(196,30,58,0.2); }
.rec-icon { width: 80rpx; height: 80rpx; border-radius: 18rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.rec-icon-course { background: rgba(196,30,58,0.12); }
.rec-icon-circle { width: 72rpx; height: 72rpx; background: rgba(5,150,105,0.15); }
.rec-icon-product { width: 72rpx; height: 72rpx; background: rgba(217,119,6,0.15); }
.rec-icon-paipan { width: 72rpx; height: 72rpx; background: var(--brand); }
.rec-info { flex: 1; min-width: 0; }
.rec-top { display: flex; align-items: center; gap: 12rpx; }
.rec-title { font-size: 26rpx; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-badge { font-size: 18rpx; color: var(--brand); background: rgba(196,30,58,0.1); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-free { font-size: 18rpx; color: #16a34a; background: rgba(34,197,94,0.12); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rec-price-row { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.rec-price { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.rec-origin { font-size: 22rpx; color: #bbb; text-decoration: line-through; }
.rec-members { font-size: 22rpx; color: #999; }
.rec-rating { display: flex; align-items: center; gap: 4rpx; margin-left: auto; }
.rating-txt { font-size: 22rpx; color: #999; }

/* AI 风险免责声明（每条 AI 回复下方小字） */
.ai-disclaimer { display: block; margin-top: 10rpx; font-size: 20rpx; line-height: 1.4; color: #bbb; }

/* 首屏任务台：让每个智能体在进入时就表现出不同工作方式 */
.experience-deck {
  margin: 18rpx 0 14rpx 62rpx;
  padding: 20rpx;
  border: 1rpx solid rgba(91,108,154,.14);
  border-radius: 22rpx;
  background: rgba(255,255,255,.88);
  box-shadow: 0 8rpx 24rpx rgba(49,58,103,.06);
}
.experience-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16rpx; }
.experience-kicker { display: block; font-size: 18rpx; letter-spacing: 2rpx; color: var(--agent-ink); }
.experience-title { display: block; margin-top: 3rpx; font-size: 27rpx; font-weight: 700; color: #293044; }
.experience-hint { max-width: 48%; font-size: 19rpx; line-height: 1.4; text-align: right; color: #8c93a2; }
.experience-tasks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10rpx; margin-top: 16rpx; }
.experience-task {
  min-width: 0;
  padding: 13rpx 12rpx 14rpx;
  border: 1rpx solid rgba(91,108,154,.1);
  border-radius: 16rpx;
  background: linear-gradient(145deg, #fff, var(--agent-wash));
}
.experience-task-no { display: block; font-size: 17rpx; font-weight: 700; color: var(--agent-ink); }
.experience-task-label { display: block; margin-top: 5rpx; font-size: 23rpx; font-weight: 700; color: #30374a; }
.experience-task-desc { display: -webkit-box; margin-top: 4rpx; font-size: 18rpx; line-height: 1.35; color: #848b9b; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }

/* 快捷提问 */
.quick-zone { padding: 0 0 16rpx 62rpx; }
.quick-head { display: flex; align-items: center; gap: 6rpx; margin-bottom: 12rpx; }
.quick-label { font-size: 22rpx; color: #999; }
.quick-list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.quick-chip { font-size: 23rpx; color: var(--agent-ink); padding: 11rpx 20rpx; border: 1rpx solid rgba(91,108,154,.1); border-radius: 999rpx; background: var(--agent-soft); }

/* 追问额度轻提示条（低调不打扰对话） */
.quota-bar { flex-shrink: 0; display: flex; align-items: center; gap: 8rpx; padding: 10rpx 24rpx; background: rgba(201,169,110,0.06); border-top: 1rpx solid #f5f5f5; }
.quota-txt { font-size: 22rpx; color: #999; }
.quota-num { color: #c9a96e; font-weight: 700; }
.quota-bar-vip { background: linear-gradient(90deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04)); }
.quota-vip-txt { font-size: 22rpx; color: #c9a96e; font-weight: 600; }
.quota-buy-btn { margin-left: auto; padding: 6rpx 24rpx; border-radius: 999rpx; background: #c9a96e; }
.quota-buy-txt { font-size: 22rpx; color: #fff; }

/* 耗尽购买弹窗 */
.pm-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
.pm-card { width: 560rpx; background: #fff; border-radius: 28rpx; padding: 48rpx 40rpx 32rpx; display: flex; flex-direction: column; align-items: center; }
.pm-title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; }
.pm-desc { margin-top: 16rpx; font-size: 26rpx; color: #666; line-height: 1.5; text-align: center; }
.pm-price-row { margin-top: 28rpx; display: flex; align-items: baseline; gap: 16rpx; }
.pm-price { font-size: 34rpx; font-weight: 700; color: #c41e3a; }
.pm-per { font-size: 22rpx; color: #999; }
.pm-btn { margin-top: 24rpx; width: 100%; height: 84rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; }
.pm-btn-buy { background: var(--brand); }
.pm-btn-buy-txt { font-size: 28rpx; color: #fff; font-weight: 600; }
.pm-btn-disabled { opacity: 0.5; }
.pm-btn-vip { margin-top: 16rpx; background: rgba(201,169,110,0.12); border: 1rpx solid rgba(201,169,110,0.4); }
.pm-btn-vip-txt { font-size: 28rpx; color: #c9a96e; font-weight: 600; }
.pm-cancel { margin-top: 20rpx; padding: 12rpx 32rpx; }
.pm-cancel-txt { font-size: 26rpx; color: #999; }

/* 输入区上方的智能体专用工具 */
.compose-tools { flex-shrink: 0; padding: 10rpx 24rpx 8rpx; display: flex; gap: 12rpx; background: #fff; border-top: 1rpx solid #f0f1f4; }
.compose-tool { min-width: 0; height: 58rpx; padding: 0 16rpx; display: flex; align-items: center; gap: 8rpx; border-radius: 16rpx; background: #eef1ff; }
.compose-tool-text { flex-shrink: 0; font-size: 24rpx; font-weight: 700; color: #5865b2; }
.compose-tool-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 20rpx; color: #858caf; }
.compose-tool-voice { margin-left: auto; background: rgba(196,30,58,0.06); }
.compose-tool-text-voice { color: #a91b32; }
.compose-tool-soon { font-size: 18rpx; color: #b58991; }

/* 八字资料采集面板 */
.birth-form { flex-shrink: 0; margin: 0 20rpx 8rpx; padding: 24rpx; border: 1rpx solid #dde1f0; border-radius: 24rpx; background: #fbfcff; box-shadow: 0 -10rpx 32rpx rgba(49,58,103,0.08); }
.birth-form-head { display: flex; align-items: flex-start; justify-content: space-between; }
.birth-form-title { display: block; font-family: "Songti SC", "STSong", serif; font-size: 32rpx; color: #252a34; font-weight: 700; }
.birth-form-sub { display: block; margin-top: 4rpx; font-size: 20rpx; color: #9297a2; }
.birth-form-close { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #f0f1f5; }
.birth-calendar-switch { display: flex; width: 210rpx; height: 58rpx; margin-top: 20rpx; padding: 5rpx; border-radius: 16rpx; background: #eceef5; }
.birth-calendar-option { flex: 1; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; font-size: 23rpx; color: #858a95; }
.birth-calendar-option.active { background: #fff; color: #5865b2; font-weight: 700; box-shadow: 0 3rpx 10rpx rgba(49,58,103,0.08); }
.birth-form-grid { margin-top: 16rpx; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }
.birth-field { min-width: 0; height: 88rpx; padding: 12rpx 16rpx; display: flex; flex-direction: column; justify-content: center; gap: 4rpx; border: 1rpx solid #e3e5eb; border-radius: 16rpx; background: #fff; }
.birth-field.disabled { opacity: 0.55; }
.birth-field-label { font-size: 19rpx; color: #979ca6; }
.birth-field-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 26rpx; color: #2f3540; font-weight: 600; }
.birth-field-value.muted { color: #a8acb5; font-weight: 400; }
.birth-gender { display: flex; align-items: center; gap: 10rpx; }
.birth-gender text { padding: 3rpx 18rpx; border-radius: 10rpx; font-size: 24rpx; color: #8b9099; background: #f2f3f6; }
.birth-gender text.active { color: #fff; background: #6977c9; }
.birth-city-input { width: 100%; height: 36rpx; padding: 0; font-size: 26rpx; color: #2f3540; }
.birth-unknown { margin-top: 16rpx; display: flex; align-items: center; gap: 10rpx; }
.birth-check { width: 30rpx; height: 30rpx; border: 2rpx solid #c7cad2; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; }
.birth-check.checked { border-color: #6977c9; background: #6977c9; }
.birth-unknown-text { font-size: 22rpx; color: #737985; }
.birth-submit { height: 72rpx; margin-top: 18rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; gap: 10rpx; background: #6977c9; box-shadow: 0 8rpx 20rpx rgba(105,119,201,0.22); }
.birth-submit-text { font-size: 26rpx; color: #fff; font-weight: 700; }

/* 输入栏 */
.input-bar { flex-shrink: 0; display: flex; align-items: flex-end; gap: 14rpx; padding: 8rpx 24rpx 8rpx; background: #fff; }
.input { flex: 1; min-height: 74rpx; max-height: 240rpx; border: 1rpx solid #e5e7ec; border-radius: 22rpx; background: #f7f8fa; padding: 18rpx 24rpx; font-size: 29rpx; line-height: 1.5; color: #252a34; }
.send-btn { width: 76rpx; height: 76rpx; border-radius: 22rpx; flex-shrink: 0; background: #c41e3a; display: flex; align-items: center; justify-content: center; }
.send-btn.disabled { opacity: 0.5; }
.disclaimer { font-size: 19rpx; color: #b0b3ba; text-align: center; padding: 5rpx 24rpx 12rpx; background: #fff; }
</style>
