<script setup lang="ts">
/**
 * 通用简易聊天界面（智玄助手 main / 智能客服 customer-service 复用）
 * 头部图标/主题色 + 欢迎语 + 快捷词 + 文字气泡 + 打字指示 + 输入栏
 *
 * 富消息（2026-07 智能体体验批）：消息模型从纯文本扩展为
 * { role, type: 'text' | 'bazi-card' | ..., content, payload? }，
 * 卡片消息由 rich-message.vue 按 type 分发渲染（新增卡片=新增组件+注册，不动本页）。
 *
 * 流式输出：传入 resolveStream 时走流式路径（页面内部决定 H5 fetch SSE 或降级非流式），
 * 文本逐块追加 + 光标闪烁 + 自动滚底（用户上滑阅读时暂停跟随，回到底部恢复）。
 * 未传 resolveStream 时保持旧 resolveReply 行为完全兼容。
 */
import { ref, computed, nextTick, onMounted, getCurrentInstance } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import RichMessage from '@/components/agent/rich-message.vue'
import AgentAnswerCard from '@/components/agent/cards/agent-answer-card.vue'
import GuidedRecommendCard from '@/components/agent/guided-recommend-card.vue'
import { goBack, navigateTo, reLaunch } from '@/utils/router'
import { nowTime, type RecommendItem, type Recommendation } from '@/lib/agent-data'
import { agentThemeStyle, resolveAgentExperience } from '@/lib/agent-experience'
import { resolveAgentReferral } from '@/lib/agent-routing'
import { track } from '@/composables/useTrack'
import { aiSearchApi, type AiGuideCard } from '@/lib/ai-search-data'

/** 富消息模型（本组件内部渲染用） */
interface RichChatMessage {
  id: number
  role: 'user' | 'assistant'
  /** 消息类型：text（默认）| bazi-card | ...；未知类型由 rich-message 降级为文本 */
  type?: string
  content: string
  /** 卡片结构化载荷（type 非 text 时有） */
  payload?: unknown
  time: string
  /** 流式生成中（显示闪烁光标） */
  streaming?: boolean
  /** AI 免责声明（流末 meta 下发） */
  disclaimer?: string
  /** 与本轮问题相关的真实平台内容 */
  recommendation?: Recommendation
  /** 仅记录同一次检索的命中数量，不等同于模型已逐条引用。 */
  knowledgeMatches?: { circle: number; global: number }
  /** 低置信商业推荐经用户同意后再展开 */
  recoConsented?: boolean
}

/** 流式回调（页面 resolveStream 通过它操纵消息列表） */
export interface SimpleChatStreamHandlers {
  /** 追加文本增量到当前 AI 消息 */
  appendText: (t: string) => void
  /** 插入结构化卡片消息（出现在分析文本之前） */
  pushCard: (type: string, payload: unknown) => void
  /** 设置当前 AI 消息的免责声明（流末 meta） */
  setDisclaimer: (d: string) => void
  /** 设置本轮结构化推荐（流末 meta） */
  setRecommendation: (recommendation: Recommendation) => void
  setKnowledgeMatches: (matches: { circle: number; global: number }) => void
}

const props = defineProps<{
  title: string
  iconName: string
  iconColor: string
  iconBg: string
  welcome: string
  quickPrompts: string[]
  /** 当前智能体在本场景能完成的事情，作为进入对话后的方向提示。 */
  sceneHint?: string
  /** 独立打开对话页时的场景返回目标；正常页面栈仍返回上一页。 */
  backTarget?: string
  /** 当前场景确有用户可购买的 AI 额度时才展示恢复权益入口。 */
  quotaRecoveryEnabled?: boolean
  /** 智能体专业模板键；GUIDE / SERVICE / 各领域 type */
  experienceKey?: string
  /** 用于生成专属题签与跨专业路由 */
  agentName?: string
  /** 自定义回复解析；返回字符串（兼容旧用法·非流式） */
  resolveReply?: (text: string) => string | Promise<string>
  /**
   * 流式回复：页面内部调 utils/stream-chat.ts（H5 SSE）或降级非流式接口，
   * 通过 handlers 逐块喂内容。传了它优先于 resolveReply。
   */
  resolveStream?: (text: string, handlers: SimpleChatStreamHandlers) => Promise<void>
  /** 回复延迟毫秒（仅 resolveReply 路径） */
  delay?: number
}>()

const messages = ref<RichChatMessage[]>([{ id: 0, role: 'assistant', content: props.welcome, time: nowTime() }])
const experience = computed(() => resolveAgentExperience({
  type: props.experienceKey || '',
  name: props.agentName || props.title,
}))
const experienceStyle = computed(() => agentThemeStyle(experience.value.theme.key))
const input = ref('')
const loading = ref(false)
const quotaExhausted = ref(false)
const scrollId = ref('')
const safeTop = ref(0)
const safeBottom = ref(0)

try {
  const systemInfo = uni.getSystemInfoSync()
  safeTop.value = Math.max(
    0,
    systemInfo.statusBarHeight || 0,
    systemInfo.safeAreaInsets?.top || 0,
    systemInfo.safeArea?.top || 0,
  )
  safeBottom.value = Math.max(0, systemInfo.safeAreaInsets?.bottom || 0)
} catch {
  safeTop.value = 0
  safeBottom.value = 0
}
const chatPageStyle = computed(() => ({
  ...experienceStyle.value,
  '--chat-safe-top': `${safeTop.value}px`,
  '--chat-safe-bottom': `${safeBottom.value}px`,
}))

// ── 自动滚底 + 用户上滑暂停 ──
const autoFollow = ref(true)
let viewportH = 600 // 消息区视口高度（onMounted 实测）
const instance = getCurrentInstance()

onMounted(() => {
  // #ifndef MP-WEIXIN
  uni.createSelectorQuery().in(instance).select('.msg-area').boundingClientRect((rect) => {
    const r = rect as UniApp.NodeInfo | null
    if (r?.height) viewportH = r.height
  }).exec()
  // #endif
  // #ifdef MP-WEIXIN
  uni.createSelectorQuery().in(instance).select('.msg-area').boundingClientRect().exec((res) => {
    const r = (res?.[0] || null) as UniApp.NodeInfo | null
    if (r?.height) viewportH = r.height
  })
  // #endif
})

// 只有「用户触摸中的上滑」才暂停跟随——编程滚底动画也会触发 @scroll，
// 若单看距底距离会把跟随误锁死（滚动动画中途必然"不在底部"）
let touching = false
let lastScrollTop = 0
function onTouchStart() { touching = true }
function onTouchEnd() { touching = false }
function onScroll(e: { detail: { scrollTop: number; scrollHeight: number } }) {
  const { scrollTop, scrollHeight } = e.detail || { scrollTop: 0, scrollHeight: 0 }
  if (touching && scrollTop < lastScrollTop - 2) {
    autoFollow.value = false // 用户主动上滑阅读 → 暂停自动滚底
  } else if (scrollTop + viewportH >= scrollHeight - 60) {
    autoFollow.value = true // 回到底部（无论谁滚的）→ 恢复跟随
  }
  lastScrollTop = scrollTop
}

function scrollToBottom(force = false) {
  if (!force && !autoFollow.value) return
  nextTick(() => {
    // #ifdef H5
    // H5 直接滚内部滚动容器：scroll-into-view 与锚点 id 同帧变更时序不可靠（滚不动）。
    // uni-scroll-view 内部有两层 .uni-scroll-view div（滚动发生在内层），全部设一遍。
    const els = document.querySelectorAll('.msg-area .uni-scroll-view')
    if (els.length) {
      els.forEach((el) => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight })
      return
    }
    // #endif
    scrollId.value = 'msg-bottom-' + Date.now()
  })
}

// 流式期间节流滚底（每块都滚会抖）
let scrollTimer: ReturnType<typeof setTimeout> | null = null
function scrollThrottled() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    scrollToBottom()
  }, 160)
}

let seq = 1
function nextId(): number { return Date.now() + seq++ }

const GUIDE_INTENT_RE = /找|推荐|哪里|入门|学习|课程|原文|古籍|阅读|圈子|社群|学伴|怎么学|如何学/
const GUIDE_BLOCK_RE = /退款|退费|投诉|举报|故障|崩溃|打不开|无法使用/
const GUIDE_TARGET_RE = /^\/(pkg-classics\/detail\/index|pkg-circle\/(articles|circles)\/detail|pkg-course\/detail\/index)\?id=[^&#]+$/

/** 智玄在完成回答后补上真实内容入口，不改模型正文与付费会话。 */
async function attachContentGuide(question: string, messageId: number) {
  if (props.experienceKey !== 'GUIDE' || !GUIDE_INTENT_RE.test(question) || GUIDE_BLOCK_RE.test(question)) return
  try {
    const result = await aiSearchApi.guide(question)
    const items: RecommendItem[] = (result.cards || [])
      .filter((card: AiGuideCard) => GUIDE_TARGET_RE.test(card.target)
        && (!['course', 'circle'].includes(card.type) || typeof card.price === 'number'))
      .slice(0, 2)
      .map((card: AiGuideCard) => ({
        type: card.type === 'content' ? 'article' : card.type,
        data: {
          id: card.id, title: card.title, cover: card.cover, intro: card.subtitle,
          href: card.target, price: card.price, reason: '与你刚才的学习方向相关',
        },
      }))
    if (!items.length) return
    const message = messages.value.find((item) => item.id === messageId)
    if (!message || message.recommendation) return
    const hasCommerce = items.some((item) => ['course', 'circle'].includes(item.type))
    message.recommendation = {
      presentation: 'inline',
      title: '接着可以看',
      lead: '从平台已发布的内容里找到这些入口。',
      consentPrompt: '',
      commercialDisclosure: hasCommerce ? '含课程或圈子，价格与权益以详情页为准' : undefined,
      items,
    }
    track.custom('guide_content_offered', { itemTypes: items.map((item) => item.type) })
    scrollToBottom()
  } catch {
    // 导览是增强能力，不影响已经完成的回答。
  }
}

async function send(text: string) {
  const t = text.trim()
  if (!t || loading.value) return
  messages.value.push({ id: nextId(), role: 'user', content: t, time: nowTime() })
  if (props.experienceKey === 'SERVICE') {
    track.custom('cs_question_submitted', { scene: 'customer_service' })
  }
  input.value = ''
  quotaExhausted.value = false
  loading.value = true
  autoFollow.value = true // 新发送强制回底部跟随
  scrollToBottom(true)

  const referral = resolveAgentReferral(t, experience.value.theme.key, props.agentName || props.title)
  if (referral) {
    messages.value.push({
      id: nextId(),
      role: 'assistant',
      type: 'agent-route-card',
      content: '',
      payload: referral,
      time: nowTime(),
    })
    loading.value = false
    scrollToBottom(true)
    return
  }

  if (props.resolveStream) {
    await sendStreaming(t)
  } else {
    await sendLegacy(t)
  }
  loading.value = false
  scrollToBottom()
}

/** 流式路径：先建空 AI 消息，随 chunk 追加（打字机由真实流驱动） */
async function sendStreaming(t: string) {
  const aiMsg: RichChatMessage = { id: nextId(), role: 'assistant', content: '', time: nowTime(), streaming: true }
  messages.value.push(aiMsg)
  const live = () => messages.value.find((m) => m.id === aiMsg.id)

  const handlers: SimpleChatStreamHandlers = {
    appendText: (chunk: string) => {
      const m = live()
      if (m) m.content += chunk
      scrollThrottled()
    },
    pushCard: (type: string, payload: unknown) => {
      // 卡片插在当前 AI 文本消息之前（先盘面卡、后流式分析）
      const idx = messages.value.findIndex((m) => m.id === aiMsg.id)
      const card: RichChatMessage = { id: nextId(), role: 'assistant', type, content: '', payload, time: nowTime() }
      if (idx >= 0) messages.value.splice(idx, 0, card)
      else messages.value.push(card)
      scrollToBottom()
    },
    setDisclaimer: (d: string) => {
      const m = live()
      if (m) m.disclaimer = d
    },
    setRecommendation: (recommendation: Recommendation) => {
      const m = live()
      if (!m) return
      m.recommendation = recommendation
      if (props.experienceKey === 'SERVICE') {
        track.custom('cs_recommend_offered', {
          scene: 'customer_service',
          presentation: recommendation.presentation || 'inline',
          itemTypes: recommendation.items.map((item) => item.type),
          hasCommerce: recommendation.items.some((item) => ['course', 'circle', 'product', 'agent'].includes(item.type)),
        })
      }
      scrollToBottom()
    },
    setKnowledgeMatches: (matches) => {
      const m = live()
      if (m) m.knowledgeMatches = {
        circle: Math.max(0, Math.min(5, Math.floor(Number(matches.circle) || 0))),
        global: Math.max(0, Math.min(5, Math.floor(Number(matches.global) || 0))),
      }
    },
  }

  try {
    await props.resolveStream!(t, handlers)
    const m = live()
    const hasAnswer = Boolean(m?.content.trim())
    if (m && !hasAnswer) {
      m.content = '抱歉，本次没有生成内容，请换个问法试试。'
      m.knowledgeMatches = undefined
    }
    if (hasAnswer && m) void attachContentGuide(t, m.id)
    if (props.experienceKey === 'SERVICE') {
      track.custom('cs_reply_completed', { scene: 'customer_service', hasRecommendation: Boolean(m?.recommendation) })
    }
  } catch (e) {
    const m = live()
    if (m) m.knowledgeMatches = undefined
    const errText = (e as Error)?.message || '请稍后再试'
    if (props.quotaRecoveryEnabled !== false && /额度|次数|用完|余额不足/u.test(errText)) {
      quotaExhausted.value = true
      if (m) m.content = '本次服务额度已用完。你可以恢复权益后继续当前对话，已有内容不会丢失。'
    } else if (m) m.content = m.content ? m.content + `\n\n（连接中断：${errText}）` : `抱歉，回复生成失败：${errText}`
    if (props.experienceKey === 'SERVICE') {
      track.custom('cs_reply_failed', { scene: 'customer_service' })
    }
  } finally {
    const m = live()
    if (m) m.streaming = false
  }
}

/** 旧路径：一次性拿全文（保持既有行为） */
async function sendLegacy(t: string) {
  await new Promise((r) => setTimeout(r, props.delay ?? 1000))
  try {
    const reply = await props.resolveReply!(t)
    const message = { id: nextId(), role: 'assistant' as const, content: reply, time: nowTime() }
    messages.value.push(message)
    if (reply.trim()) void attachContentGuide(t, message.id)
    if (props.experienceKey === 'SERVICE') {
      track.custom('cs_reply_completed', { scene: 'customer_service', hasRecommendation: false })
    }
  } catch (_e) {
    messages.value.push({ id: nextId(), role: 'assistant', content: '抱歉，回复生成失败，请稍后再试。', time: nowTime() })
    if (props.experienceKey === 'SERVICE') {
      track.custom('cs_reply_failed', { scene: 'customer_service' })
    }
  }
}

function consentRecommendation(msg: RichChatMessage) {
  msg.recoConsented = true
  if (props.experienceKey === 'SERVICE') {
    track.custom('cs_recommend_consent', { scene: 'customer_service' })
  }
  scrollToBottom()
}

function declineRecommendation(msg: RichChatMessage) {
  msg.recommendation = undefined
  if (props.experienceKey === 'SERVICE') {
    track.custom('cs_recommend_declined', { scene: 'customer_service' })
  }
}

function openRecommendation(item: RecommendItem) {
  if (props.experienceKey === 'SERVICE') {
    track.custom('cs_recommend_click', {
      scene: 'customer_service',
      itemType: item.type,
      itemId: String(item.data?.id || item.data?.href || ''),
      hasPrice: Number(item.data?.price || 0) > 0,
    })
  }
  if (props.experienceKey === 'GUIDE') {
    track.custom('guide_content_open', { type: item.type, id: String(item.data?.id || '') })
  }
  if (item.data?.href) navigateTo(item.data.href)
  else if (item.type === 'agent') navigateTo('/agents')
  else if (item.type === 'course') navigateTo('/courses-list')
  else if (item.type === 'circle') navigateTo('/circles')
  else if (item.type === 'product') navigateTo('/mall')
  else navigateTo('/search')
}

function reset() {
  messages.value = [{ id: 0, role: 'assistant', content: props.welcome, time: nowTime() }]
  quotaExhausted.value = false
}

function openQuotaCenter() {
  navigateTo('/vip')
}

function backToScene() {
  if (props.backTarget && getCurrentPages().length <= 1) {
    reLaunch(props.backTarget)
    return
  }
  goBack()
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}
</script>

<template>
  <view class="page" :style="chatPageStyle">
    <!-- 头部 -->
    <view class="header">
      <view class="back" role="button" tabindex="0" aria-label="返回上一页" @tap="backToScene" @keydown="activateOnKeyboard($event, backToScene)"><AppIcon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <view class="head-info">
        <view class="head-avatar" :style="{ background: iconBg }"><AppIcon :name="iconName" :size="28" :color="iconColor" /></view>
        <text class="head-title">{{ title }}</text>
        <text class="head-online">AI 对话</text>
      </view>
      <view class="refresh" role="button" tabindex="0" aria-label="重新开始对话" @tap="reset" @keydown="activateOnKeyboard($event, reset)"><AppIcon name="refresh-cw" :size="32" color="#999" /></view>
    </view>

    <!-- 场景能力提示：让用户知道当前助手能做什么，也为后续内容分发留出稳定入口。 -->
    <view v-if="sceneHint" class="scene-hint" role="status">
      <view class="scene-hint__pulse" />
      <text class="scene-hint__text">{{ sceneHint }}</text>
    </view>

    <!-- 消息区 -->
    <scroll-view class="msg-area" scroll-y :scroll-into-view="scrollId" :scroll-with-animation="true" @scroll="onScroll" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view class="msg-list">
        <view v-for="msg in messages" :key="msg.id" class="msg-row" :class="{ 'msg-row-user': msg.role === 'user' }">
          <view v-if="msg.role === 'assistant'" class="msg-avatar" :style="{ background: iconBg }">
            <AppIcon :name="iconName" :size="24" :color="iconColor" />
          </view>

          <!-- 卡片消息：独立渲染（不套气泡），rich-message 按 type 分发 -->
          <view v-if="msg.type && msg.type !== 'text'" class="card-wrap">
            <RichMessage :type="msg.type" :content="msg.content" :payload="msg.payload" />
          </view>

          <!-- 文本气泡 -->
          <view v-else-if="msg.role === 'assistant' && !msg.streaming && msg.content" class="answer-wrap">
            <view v-if="msg.id === 0 || (msg.content.length < 180 && !msg.content.includes('\n'))" class="bubble bubble-ai compact-answer">
              <text class="bubble-text">{{ msg.content }}</text>
              <text class="bubble-time">{{ msg.time }}</text>
            </view>
            <AgentAnswerCard
              v-else
              :content="msg.content"
              :experience="experience"
              :agent-name="agentName || title"
            />
            <view v-if="msg.knowledgeMatches" class="knowledge-note" role="note">
              <text class="knowledge-note__label">知识检索</text>
              <text v-if="msg.knowledgeMatches.circle + msg.knowledgeMatches.global" class="knowledge-note__text">
                本次检索到本圈 {{ msg.knowledgeMatches.circle }} 条、通用 {{ msg.knowledgeMatches.global }} 条；检索命中不代表回答已逐条引用。
              </text>
              <text v-else class="knowledge-note__text">未检索到直接相关的资料；请结合原文核实回答。</text>
            </view>
            <view v-if="msg.recommendation" class="service-recommend">
              <view v-if="msg.recommendation.presentation !== 'inline' && !msg.recoConsented" class="service-consent">
                <text class="service-consent__text">{{ msg.recommendation.consentPrompt }}</text>
                <view class="service-consent__actions">
                  <view class="service-consent__yes" @tap="consentRecommendation(msg)">看看推荐</view>
                  <view class="service-consent__no" @tap="declineRecommendation(msg)">暂时不用</view>
                </view>
              </view>
              <template v-else>
                <view class="service-recommend__head">
                  <view class="service-recommend__icon"><AppIcon name="compass" :size="24" color="#315f7a" /></view>
                  <view class="service-recommend__copy">
                    <text class="service-recommend__eyebrow">本次已处理 · 下一步可选</text>
                    <text class="service-recommend__title">{{ msg.recommendation.title || '顺着这个问题继续' }}</text>
                    <text v-if="msg.recommendation.lead" class="service-recommend__lead">{{ msg.recommendation.lead }}</text>
                  </view>
                </view>
                <GuidedRecommendCard
                  v-for="(item, index) in msg.recommendation.items"
                  :key="`${item.type}-${item.data?.id || index}`"
                  :item="item"
                  @tap="openRecommendation"
                />
                <text v-if="msg.recommendation.commercialDisclosure" class="service-recommend__disclosure">{{ msg.recommendation.commercialDisclosure }}</text>
              </template>
            </view>
          </view>
          <view v-else class="bubble" :class="msg.role === 'assistant' ? 'bubble-ai' : 'bubble-user'">
            <text class="bubble-text">{{ msg.content }}<text v-if="msg.streaming && msg.content" class="stream-cursor">▍</text></text>
            <!-- 流式起步（尚无内容）：气泡内三点 -->
            <view v-if="msg.streaming && !msg.content" class="dots">
              <view class="dot typing-dot" style="animation-delay:0s" />
              <view class="dot typing-dot" style="animation-delay:0.15s" />
              <view class="dot typing-dot" style="animation-delay:0.3s" />
            </view>
            <text v-if="msg.disclaimer && !msg.streaming" class="msg-disclaimer">{{ msg.disclaimer.replace(/[-*#\n]/g, ' ').trim() }}</text>
            <text class="bubble-time" :class="{ 'time-user': msg.role === 'user' }">{{ msg.time }}</text>
          </view>
        </view>
        <!-- 等待中（旧非流式路径） -->
        <view v-if="loading && !resolveStream" class="msg-row">
          <view class="msg-avatar" :style="{ background: iconBg }"><AppIcon :name="iconName" :size="24" :color="iconColor" /></view>
          <view class="bubble bubble-ai typing">
            <view class="dots">
              <view class="dot typing-dot" style="animation-delay:0s" />
              <view class="dot typing-dot" style="animation-delay:0.15s" />
              <view class="dot typing-dot" style="animation-delay:0.3s" />
            </view>
          </view>
        </view>
        <view :id="scrollId" class="anchor" />
      </view>
      <view v-if="quotaExhausted" class="quota-recovery" role="status">
        <view class="quota-recovery__copy">
          <text class="quota-recovery__title">继续当前对话</text>
          <text class="quota-recovery__desc">恢复 AI 使用权益后，直接回到这里继续提问。</text>
        </view>
        <view class="quota-recovery__action" role="button" tabindex="0" aria-label="恢复 AI 使用权益" @tap="openQuotaCenter" @keydown="activateOnKeyboard($event, openQuotaCenter)"><text>恢复权益</text></view>
      </view>
    </scroll-view>

    <!-- 快捷词 -->
    <scroll-view class="quick-bar" scroll-x>
      <view class="quick-row">
        <view v-for="q in quickPrompts" :key="q" class="quick-chip" @tap="send(q)">{{ q }}</view>
      </view>
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <textarea
        class="input"
        v-model="input"
        :placeholder="'输入您的问题…'"
        :maxlength="-1"
        auto-height
        :show-confirm-bar="false"
      />
      <view class="send-btn" :class="{ disabled: !input.trim() || loading }" role="button" tabindex="0" aria-label="发送消息" @tap="send(input)" @keydown="activateOnKeyboard($event, () => send(input))">
        <AppIcon name="send" :size="32" color="#ffffff" />
      </view>
    </view>
    <view class="tip">内容由 AI 生成，仅供参考，不构成专业建议，请理性看待。</view>
  </view>
</template>

<style scoped lang="scss">
.page { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; background: var(--agent-canvas, #f5f5f7); }

.header {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 16rpx;
  min-height: 88rpx;
  height: auto;
  padding: calc(var(--chat-safe-top, 0px) + 12rpx) 24rpx 12rpx;
  box-sizing: border-box;
  background: rgba(245,245,247,.92);
  border-bottom: 1rpx solid var(--agent-border-soft, rgba(60,60,67,.10));
  backdrop-filter: blur(24rpx);
}
.back, .refresh {
  width: 80rpx; height: 80rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  margin: -8rpx;
  border-radius: 50%;
}
.back:active, .refresh:active { background: rgba(0, 0, 0, 0.05); }
.head-info { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.head-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.head-title { font-size: 32rpx; font-weight: 700; color: var(--agent-ink, #1d1d1f); }
.head-online { font-size: 20rpx; color: #16a34a; background: #f0fdf4; padding: 2rpx 12rpx; border-radius: 999rpx; }

.scene-hint {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-height: 54rpx;
  padding: 0 28rpx;
  background: var(--agent-surface, #fff);
  border-bottom: 1rpx solid var(--agent-border-soft, rgba(60,60,67,.10));
}
.scene-hint__pulse {
  width: 12rpx;
  height: 12rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #3f8197;
  box-shadow: 0 0 0 6rpx rgba(63, 129, 151, 0.12);
}
.scene-hint__text { font-size: 21rpx; line-height: 1.4; color: #536b74; }
.quota-recovery { display: flex; align-items: center; gap: 18rpx; margin: 0 24rpx 18rpx; padding: 18rpx 20rpx; border-radius: var(--agent-radius-md, 18rpx); background: var(--agent-surface, #fff); border: 1rpx solid rgba(201,169,110,.24); box-shadow: var(--agent-shadow, 0 8rpx 28rpx rgba(31,35,41,.06)); }
.quota-recovery__copy { flex: 1; min-width: 0; }
.quota-recovery__title { display: block; font-size: 24rpx; font-weight: 700; color: #4b4038; }
.quota-recovery__desc { display: block; margin-top: 4rpx; font-size: 20rpx; line-height: 1.4; color: #81756d; }
.quota-recovery__action { flex-shrink: 0; min-height: 52rpx; display: flex; align-items: center; padding: 12rpx 18rpx; border-radius: 999rpx; background: var(--agent-accent, #2b8a82); color: #fff; font-size: 21rpx; }

.msg-area { flex: 1; overflow: hidden; }
.msg-list { padding: 32rpx 24rpx; display: flex; flex-direction: column; gap: 32rpx; }
.msg-row { display: flex; gap: 20rpx; }
.msg-row-user { flex-direction: row-reverse; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 6rpx; }
.card-wrap { flex: 1; min-width: 0; max-width: 86%; }
.answer-wrap { flex: 1; min-width: 0; max-width: 92%; display: flex; flex-direction: column; gap: 14rpx; }
.compact-answer { align-self: flex-start; box-sizing: border-box; max-width: 100%; }
.knowledge-note { display: flex; align-items: flex-start; gap: 12rpx; padding: 14rpx 18rpx; border-radius: 16rpx; background: #edf4f2; color: #315f58; }
.knowledge-note__label { flex-shrink: 0; font-size: 20rpx; font-weight: 700; }
.knowledge-note__text { font-size: 20rpx; line-height: 1.5; }
.service-recommend {
  display: flex; flex-direction: column; gap: 12rpx;
  padding: 18rpx;
  border: 1rpx solid var(--agent-border-soft, rgba(60,60,67,.10));
  border-radius: var(--agent-radius-lg, 24rpx);
  background: var(--agent-surface, #fff);
  box-shadow: var(--agent-shadow, 0 8rpx 28rpx rgba(31,35,41,.06));
}
.service-recommend__head { display: flex; align-items: flex-start; gap: 14rpx; }
.service-recommend__icon {
  width: 52rpx; height: 52rpx; flex-shrink: 0; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(49, 95, 122, 0.09);
}
.service-recommend__copy { flex: 1; min-width: 0; }
.service-recommend__eyebrow { display: block; font-size: 19rpx; letter-spacing: 1rpx; color: #6f858f; }
.service-recommend__title { display: block; margin-top: 3rpx; font-size: 27rpx; font-weight: 700; color: #27343b; }
.service-recommend__lead { display: block; margin-top: 5rpx; font-size: 22rpx; line-height: 1.45; color: #77838a; }
.service-recommend__disclosure { font-size: 19rpx; color: #9a8879; }
.service-consent { padding: 4rpx; }
.service-consent__text { display: block; font-size: 24rpx; line-height: 1.55; color: #46545b; }
.service-consent__actions { display: flex; gap: 12rpx; margin-top: 14rpx; }
.service-consent__yes, .service-consent__no {
  padding: 11rpx 22rpx; border-radius: 999rpx; font-size: 22rpx;
}
.service-consent__yes { color: #fff; background: #315f7a; }
.service-consent__no { color: #7d8589; background: rgba(49, 95, 122, 0.07); }
.bubble { max-width: 80%; border-radius: var(--agent-radius-lg, 24rpx); padding: 20rpx 28rpx; }
.bubble-ai { background: var(--agent-surface, #fff); border: 1rpx solid var(--agent-border-soft, rgba(60,60,67,.10)); box-shadow: var(--agent-shadow, 0 8rpx 28rpx rgba(31,35,41,.06)); border-top-left-radius: 6rpx; }
.bubble-user { background: var(--brand); border-top-right-radius: 6rpx; }
.bubble-text { font-size: 30rpx; line-height: 1.72; white-space: pre-wrap; color: inherit; }
.bubble-ai .bubble-text { color: #1a1a1a; }
.bubble-user .bubble-text { color: #fff; }
.bubble-time { display: block; font-size: 20rpx; margin-top: 8rpx; color: #999; }
.time-user { color: rgba(255, 255, 255, 0.7); }
.typing { padding: 24rpx 28rpx; }
.dots { display: flex; gap: 10rpx; padding: 8rpx 0; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(196, 30, 58, 0.6); }
.anchor { height: 1rpx; }

/* 流式打字光标 */
.stream-cursor {
  color: var(--brand, #c41e3a);
  animation: cursor-blink 0.9s step-end infinite;
}
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .stream-cursor,
  .typing-dot {
    animation: none !important;
  }
}
/* AI 免责声明（流末下发的小字） */
.msg-disclaimer { display: block; font-size: 20rpx; line-height: 1.4; color: #bbb; margin-top: 10rpx; }

.quick-bar { flex-shrink: 0; white-space: nowrap; padding: 12rpx 0; }
.quick-row { display: inline-flex; gap: 16rpx; padding: 0 24rpx; }
.quick-chip {
  flex-shrink: 0; font-size: 24rpx; color: #1a1a1a;
  padding: 12rpx 24rpx; border-radius: 999rpx;
  border: 1rpx solid var(--agent-border-soft, rgba(60,60,67,.10)); background: var(--agent-surface, #fff);
}

.input-bar {
  flex-shrink: 0;
  display: flex; align-items: flex-end; gap: 16rpx;
  padding: 10rpx 24rpx calc(10rpx + var(--chat-safe-bottom, 0px));
  border-top: 1rpx solid var(--agent-border-soft, rgba(60,60,67,.10));
  background: rgba(245,245,247,.96);
}
.input {
  flex: 1; min-height: 72rpx; max-height: 240rpx;
  border-radius: var(--agent-radius-lg, 24rpx); background: var(--agent-surface, #fff);
  border: 1rpx solid var(--agent-border, rgba(60,60,67,.18));
  padding: 18rpx 28rpx; font-size: 28rpx; color: var(--agent-ink, #1d1d1f);
}
.send-btn {
  width: 80rpx; height: 80rpx; border-radius: var(--agent-radius-lg, 24rpx); flex-shrink: 0;
  background: var(--brand); display: flex; align-items: center; justify-content: center;
}
.send-btn.disabled { opacity: 0.5; }
.tip {
  flex-shrink: 0;
  font-size: 22rpx; color: #aaa; text-align: center;
  padding: 8rpx 24rpx 16rpx;
  background: rgba(245,245,247,.96);
  box-sizing: border-box;
}
</style>
