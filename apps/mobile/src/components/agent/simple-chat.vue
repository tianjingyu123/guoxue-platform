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
import { ref, nextTick, onMounted, getCurrentInstance } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import RichMessage from '@/components/agent/rich-message.vue'
import { goBack } from '@/utils/router'
import { nowTime } from '@/lib/agent-data'

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
}

/** 流式回调（页面 resolveStream 通过它操纵消息列表） */
export interface SimpleChatStreamHandlers {
  /** 追加文本增量到当前 AI 消息 */
  appendText: (t: string) => void
  /** 插入结构化卡片消息（出现在分析文本之前） */
  pushCard: (type: string, payload: unknown) => void
  /** 设置当前 AI 消息的免责声明（流末 meta） */
  setDisclaimer: (d: string) => void
}

const props = defineProps<{
  title: string
  iconName: string
  iconColor: string
  iconBg: string
  welcome: string
  quickPrompts: string[]
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
const input = ref('')
const loading = ref(false)
const scrollId = ref('')

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

async function send(text: string) {
  const t = text.trim()
  if (!t || loading.value) return
  messages.value.push({ id: nextId(), role: 'user', content: t, time: nowTime() })
  input.value = ''
  loading.value = true
  autoFollow.value = true // 新发送强制回底部跟随
  scrollToBottom(true)

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
  }

  try {
    await props.resolveStream!(t, handlers)
    const m = live()
    if (m && !m.content.trim()) m.content = '抱歉，本次没有生成内容，请换个问法试试。'
  } catch (e) {
    const m = live()
    const errText = (e as Error)?.message || '请稍后再试'
    if (m) m.content = m.content ? m.content + `\n\n（连接中断：${errText}）` : `抱歉，回复生成失败：${errText}`
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
    messages.value.push({ id: nextId(), role: 'assistant', content: reply, time: nowTime() })
  } catch (_e) {
    messages.value.push({ id: nextId(), role: 'assistant', content: '抱歉，回复生成失败，请稍后再试。', time: nowTime() })
  }
}

function reset() {
  messages.value = [{ id: 0, role: 'assistant', content: props.welcome, time: nowTime() }]
}
</script>

<template>
  <view class="page">
    <!-- 头部 -->
    <view class="header safe-pt">
      <view class="back" @tap="goBack()"><AppIcon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <view class="head-info">
        <view class="head-avatar" :style="{ background: iconBg }"><AppIcon :name="iconName" :size="28" :color="iconColor" /></view>
        <text class="head-title">{{ title }}</text>
        <text class="head-online">在线</text>
      </view>
      <view class="refresh" @tap="reset"><AppIcon name="refresh-cw" :size="32" color="#999" /></view>
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
    </scroll-view>

    <!-- 快捷词 -->
    <scroll-view class="quick-bar" scroll-x>
      <view class="quick-row">
        <view v-for="q in quickPrompts" :key="q" class="quick-chip" @tap="send(q)">{{ q }}</view>
      </view>
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar safe-pb">
      <textarea
        class="input"
        v-model="input"
        :placeholder="'输入您的问题…'"
        :maxlength="-1"
        auto-height
        :show-confirm-bar="false"
      />
      <view class="send-btn" :class="{ disabled: !input.trim() || loading }" @tap="send(input)">
        <AppIcon name="send" :size="32" color="#ffffff" />
      </view>
    </view>
    <view class="tip safe-pb">内容由 AI 生成，仅供参考，不构成专业建议，请理性看待。</view>
  </view>
</template>

<style scoped lang="scss">
.page { display: flex; flex-direction: column; height: 100vh; background: #f7f5f0; }
.safe-pt { padding-top: var(--status-bar-height, 0); }
.safe-pb { padding-bottom: constant(safe-area-inset-bottom); padding-bottom: env(safe-area-inset-bottom); }

.header {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 16rpx;
  padding: 0 24rpx; height: 88rpx;
  background: #fff;
  border-bottom: 1rpx solid #ececec;
}
.head-info { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.head-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.head-title { font-size: 32rpx; font-weight: 600; color: #1a1a1a; }
.head-online { font-size: 20rpx; color: #16a34a; background: #f0fdf4; padding: 2rpx 12rpx; border-radius: 999rpx; }

.msg-area { flex: 1; overflow: hidden; }
.msg-list { padding: 32rpx 24rpx; display: flex; flex-direction: column; gap: 32rpx; }
.msg-row { display: flex; gap: 20rpx; }
.msg-row-user { flex-direction: row-reverse; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 6rpx; }
.card-wrap { flex: 1; min-width: 0; max-width: 86%; }
.bubble { max-width: 80%; border-radius: 24rpx; padding: 20rpx 28rpx; }
.bubble-ai { background: #fff; border: 1rpx solid #ececec; border-top-left-radius: 6rpx; }
.bubble-user { background: var(--brand); border-top-right-radius: 6rpx; }
.bubble-text { font-size: 28rpx; line-height: 1.6; white-space: pre-wrap; color: inherit; }
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
/* AI 免责声明（流末下发的小字） */
.msg-disclaimer { display: block; font-size: 20rpx; line-height: 1.4; color: #bbb; margin-top: 10rpx; }

.quick-bar { flex-shrink: 0; white-space: nowrap; padding: 12rpx 0; }
.quick-row { display: inline-flex; gap: 16rpx; padding: 0 24rpx; }
.quick-chip {
  flex-shrink: 0; font-size: 24rpx; color: #1a1a1a;
  padding: 12rpx 24rpx; border-radius: 999rpx;
  border: 1rpx solid #ececec; background: rgba(0, 0, 0, 0.02);
}

.input-bar {
  flex-shrink: 0;
  display: flex; align-items: flex-end; gap: 16rpx;
  padding: 16rpx 24rpx 8rpx;
  border-top: 1rpx solid #ececec;
  background: #fff;
}
.input {
  flex: 1; min-height: 72rpx; max-height: 240rpx;
  border-radius: 24rpx; background: rgba(0, 0, 0, 0.03);
  padding: 18rpx 28rpx; font-size: 28rpx; color: #1a1a1a;
}
.send-btn {
  width: 80rpx; height: 80rpx; border-radius: 50%; flex-shrink: 0;
  background: var(--brand); display: flex; align-items: center; justify-content: center;
}
.send-btn.disabled { opacity: 0.5; }
.tip { font-size: 22rpx; color: #aaa; text-align: center; padding: 8rpx 24rpx 16rpx; background: #fff; }
</style>
