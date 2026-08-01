<template>
  <view class="chat-page">
    <!-- 状态态返回栏：加载/硬失败时也能退出，避免卡死 -->
    <view v-if="loading || error" class="cc-state-back" @tap="goBack">
      <app-icon name="arrow-left" :size="40" color="#2C2C2C" />
    </view>
    <!-- 加载/错误态 -->
    <view v-if="loading" class="cc-state"><text class="cc-state-t">加载中...</text></view>
    <view v-else-if="error" class="cc-state">
      <text class="cc-state-t">{{ error }}</text>
      <view class="cc-retry" @tap="loadDetail"><text class="cc-retry-t">重试</text></view>
    </view>

    <template v-else>
      <!-- 顶部导航 -->
      <view class="nav-bar">
        <view class="nav-btn" @tap="goBack">
          <app-icon name="arrow-left" :size="40" color="#fff" />
        </view>
        <view class="nav-bot">
          <image lazy-load v-if="botDetail.avatar" class="nav-avatar" :src="botDetail.avatar" mode="aspectFill" @error="botDetail.avatar = ''" />
          <view v-else class="nav-avatar nav-avatar-fb">{{ botDetail.name.slice(0, 1) }}</view>
          <view class="nav-info">
            <text class="nav-name">{{ botDetail.name }}</text>
            <text class="nav-status">在线</text>
          </view>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @tap="toggleMenu">
            <app-icon name="more-vertical" :size="38" color="#fff" />
          </view>
        </view>
      </view>

      <!-- 下拉菜单 -->
      <view v-if="menuOpen" class="menu-mask" @tap="menuOpen = false">
        <view class="menu-pop" @tap.stop>
          <view class="menu-item" @tap="onMenu('clear')">
            <app-icon name="trash-2" :size="32" color="#C41E3A" />
            <text class="menu-text menu-text-danger">清空对话</text>
          </view>
        </view>
      </view>

      <!-- 对话区域 -->
      <scroll-view
        class="chat-scroll"
        scroll-y
        :scroll-top="scrollTop"
        :scroll-with-animation="true"
        @scroll="onScroll"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
      >
        <view class="chat-content">
          <!-- 欢迎消息 -->
          <view v-if="messages.length === 0" class="welcome-block">
            <view class="msg-row">
              <image lazy-load v-if="botDetail.avatar" class="msg-avatar" :src="botDetail.avatar" mode="aspectFill" @error="botDetail.avatar = ''" />
              <view v-else class="msg-avatar msg-avatar-bot">{{ botDetail.name.slice(0, 1) }}</view>
              <view class="bubble bubble-bot">
                <text class="bubble-text">{{ botDetail.welcomeMessage }}</text>
              </view>
            </view>
          </view>

          <!-- 对话消息 -->
          <view
            v-for="msg in messages"
            :key="msg.id"
            class="msg-row"
            :class="{ 'msg-row-user': msg.role === 'user' }"
          >
            <view v-if="msg.role === 'user'" class="msg-avatar msg-avatar-user">我</view>
            <template v-else>
              <image lazy-load v-if="botDetail.avatar" class="msg-avatar" :src="botDetail.avatar" mode="aspectFill" @error="botDetail.avatar = ''" />
              <view v-else class="msg-avatar msg-avatar-bot">{{ botDetail.name.slice(0, 1) }}</view>
            </template>

            <view class="msg-body" :class="{ 'msg-body-user': msg.role === 'user' }">
              <view
                class="bubble"
                :class="msg.role === 'user' ? 'bubble-user' : 'bubble-bot'"
              >
                <rich-text class="bubble-rich" :nodes="renderMarkdown(msg.content)" />
                <text v-if="msg.isStreaming" class="cursor">▍</text>
              </view>

              <!-- AI 风险免责声明（后端下发，仅 assistant 非流式时展示） -->
              <text v-if="msg.role === 'assistant' && msg.disclaimer && !msg.isStreaming" class="ai-disclaimer">{{ msg.disclaimer }}</text>

              <!-- 向导式推荐：高相关场景直接展示，低置信商业内容先征求同意 -->
              <view v-if="msg.role === 'assistant' && msg.recommendation && !msg.isStreaming" class="recommend-block">
                <view v-if="msg.recommendation.presentation !== 'inline' && !msg.recoConsented" class="reco-consent">
                  <text class="reco-consent-text">{{ msg.recommendation.consentPrompt }}</text>
                  <view class="reco-consent-btns">
                    <view class="reco-btn reco-btn-yes" @tap="consentReco(msg)"><text class="reco-btn-yes-text">好的，看看</text></view>
                    <view class="reco-btn reco-btn-no" @tap="declineReco(msg)"><text class="reco-btn-no-text">不用了</text></view>
                  </view>
                </view>
                <template v-else>
                  <view class="recommend-head">
                    <view class="recommend-node"><app-icon name="sparkles" :size="22" color="#ffffff" /></view>
                    <view class="recommend-copy">
                      <text class="recommend-label">{{ msg.recommendation.title || '接下来可以这样做' }}</text>
                      <text v-if="msg.recommendation.lead" class="recommend-lead">{{ msg.recommendation.lead }}</text>
                    </view>
                  </view>
                  <GuidedRecommendCard
                    v-for="(rec, i) in msg.recommendation.items"
                    :key="`${rec.type}-${rec.data?.id || i}`"
                    :item="rec"
                    @tap="openRecommend"
                  />
                  <text v-if="msg.recommendation.commercialDisclosure" class="recommend-disclosure">{{ msg.recommendation.commercialDisclosure }}</text>
                </template>
              </view>

              <text class="msg-time">{{ formatTime(msg.createdAt) }}</text>
            </view>
          </view>

          <view style="height: 20rpx" />
        </view>
      </scroll-view>

      <!-- 底部输入区 -->
      <view class="input-bar">
        <view class="input-wrap">
          <input
            class="chat-input"
            v-model="inputValue"
            :placeholder="'输入您的问题...'"
            :disabled="isSending"
            confirm-type="send"
            @confirm="handleSend"
          />
        </view>
        <view
          class="send-btn"
          :class="{ 'send-btn-disabled': !inputValue.trim() || isSending }"
          @tap="handleSend"
        >
          <app-icon :name="isSending ? 'loader-2' : 'send'" :size="36" color="#fff" :class="{ spin: isSending }" />
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * Bot 对话页 —— 接真实后端 GET /bots/:id（详情）+ POST /bots/:id/chat（对话）。
 * 原型臆想字段（推荐问题/能力标签/官方认证/每日已用次数/文件上传）后端无 → 降级隐藏，不造假。
 *
 * 流式（2026-07 智能体体验批）：H5 端走 POST /bots/:id/chat/stream（fetch SSE），
 * 文本增量实时上屏（真流式打字机）；流末 meta 带 conversationId（续聊）/免责声明/软性导流。
 * 非 H5 端降级原非流式接口 + 逐字动效（展示动效，非伪造内容）。
 * 用户上滑阅读时暂停自动滚底，回到底部恢复跟随。
 */
import { ref, getCurrentInstance, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import GuidedRecommendCard from '@/components/agent/guided-recommend-card.vue'
import { navigateBack, navigateTo, toastComingSoon } from '@/utils/router'
import { apiGet, apiPost } from '@/utils/request'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'
import type { Recommendation, RecommendItem } from '@/lib/agent-data'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  isStreaming?: boolean
  /** AI 风险免责声明（后端下发，仅 assistant 消息有） */
  disclaimer?: string
  /** 软性导流推荐（征求同意后才展开卡片） */
  recommendation?: Recommendation
  /** 用户是否已同意查看推荐 */
  recoConsented?: boolean
}

const botId = ref('')
const inputValue = ref('')
const isSending = ref(false)
const messages = ref<ChatMessage[]>([])
const menuOpen = ref(false)
const scrollTop = ref(0)
const loading = ref(true)
const error = ref('')
const conversationId = ref('')

const botDetail = ref({
  name: '智能体',
  avatar: '',
  welcomeMessage: '',
})

onLoad((opts) => {
  if (opts?.id) botId.value = String(opts.id)
  loadDetail()
})

async function loadDetail() {
  if (!botId.value) {
    error.value = '缺少智能体 ID'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    // 后端 bot 详情返回结构字段较多且不固定，泛型保留 any 安全（仅取已知字段映射）
    const b = await apiGet<any>(`/bots/${botId.value}`)
    botDetail.value = {
      name: b.name || '智能体',
      avatar: b.avatar || '',
      welcomeMessage: b.intro || `您好！我是${b.name || '智能助手'}，有什么可以帮您的吗？`,
    }
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

// ── 自动滚底 + 用户上滑暂停 ──
const autoFollow = ref(true)
let viewportH = 600
const pageInstance = getCurrentInstance()

onMounted(() => {
  uni.createSelectorQuery().in(pageInstance).select('.chat-scroll').boundingClientRect((rect) => {
    const r = rect as UniApp.NodeInfo | null
    if (r?.height) viewportH = r.height
  }).exec()
})

// 只有「用户触摸中的上滑」才暂停跟随——编程滚底也触发 @scroll，单看距底会误锁死
let touching = false
let lastScrollTop = 0
function onTouchStart() { touching = true }
function onTouchEnd() { touching = false }
function onScroll(e: { detail: { scrollTop: number; scrollHeight: number } }) {
  const { scrollTop: st, scrollHeight } = e.detail || { scrollTop: 0, scrollHeight: 0 }
  if (touching && st < lastScrollTop - 2) {
    autoFollow.value = false // 用户主动上滑阅读 → 暂停自动滚底
  } else if (st + viewportH >= scrollHeight - 60) {
    autoFollow.value = true // 回到底部 → 恢复跟随
  }
  lastScrollTop = st
}

function scrollToBottom(force = false) {
  if (!force && !autoFollow.value) return
  // #ifdef H5
  // H5 直接滚内部滚动容器（scrollTop 0→大数 hack 会先跳顶再滚底，流式期间会闪）。
  // uni-scroll-view 内部有两层 .uni-scroll-view div（滚动发生在内层），全部设一遍。
  const els = document.querySelectorAll('.chat-scroll .uni-scroll-view')
  if (els.length) {
    els.forEach((el) => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight })
    return
  }
  // #endif
  scrollTop.value = 0
  setTimeout(() => { scrollTop.value = 999999 }, 50)
}

// 流式期间节流滚底（每块都滚会抖）
let scrollTimer: ReturnType<typeof setTimeout> | null = null
function scrollThrottled() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    scrollToBottom()
  }, 200)
}

async function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isSending.value) return

  messages.value.push({
    id: 'user_' + Date.now(),
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  })
  inputValue.value = ''
  isSending.value = true
  autoFollow.value = true
  scrollToBottom(true)

  const aiId = 'ai_' + Date.now()
  messages.value.push({
    id: aiId,
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString(),
    isStreaming: true,
  })

  try {
    if (streamChatSupported()) {
      // H5：真流式（SSE），文本增量实时上屏
      await sendViaStream(text, aiId)
    } else {
      // 非 H5 端：降级非流式接口 + 逐字动效
      // 后端对话返回结构（content/conversationId/disclaimer/recommendation）动态，泛型保留 any 安全
      const res = await apiPost<any>(`/bots/${botId.value}/chat`, {
        query: text,
        conversationId: conversationId.value || undefined,
      })
      if (res?.conversationId) conversationId.value = res.conversationId
      await typewriter(res?.content || '（未返回内容）', aiId)
      // 打字结束后挂载免责声明 + 软性导流推荐（后端 bot.chat 下发，剥离协议后的净文本）
      const done = messages.value.find((m) => m.id === aiId)
      if (done) {
        done.disclaimer = res?.disclaimer
        done.recommendation = res?.recommendation || undefined
      }
    }
  } catch (e) {
    const target = messages.value.find((m) => m.id === aiId)
    if (target) {
      target.content = target.content
        ? target.content + '\n\n（连接中断：' + ((e as Error)?.message || '请稍后再试') + '）'
        : '抱歉，回复失败：' + ((e as Error)?.message || '请稍后再试')
      target.isStreaming = false
    }
  } finally {
    const target = messages.value.find((m) => m.id === aiId)
    if (target) {
      target.isStreaming = false
      if (!target.content.trim()) target.content = '（未返回内容）'
    }
    isSending.value = false
    scrollToBottom()
  }
}

/** H5 真流式：POST /bots/:id/chat/stream（chunk 增量 + meta 会话信息/免责/导流） */
async function sendViaStream(text: string, aiId: string): Promise<void> {
  const live = () => messages.value.find((m) => m.id === aiId)
  await streamChat(
    `/bots/${botId.value}/chat/stream`,
    { query: text, conversationId: conversationId.value || undefined },
    {
      onChunk: (t) => {
        const m = live()
        if (m) m.content += t
        scrollThrottled()
      },
      onMeta: (meta) => {
        if (meta.conversationId) conversationId.value = meta.conversationId
        const m = live()
        if (m) {
          m.disclaimer = meta.disclaimer
          m.recommendation = (meta.recommendation as Recommendation | undefined) || undefined
        }
      },
    },
  )
}

/** 逐字展示真实返回文本（非 H5 降级动效） */
function typewriter(fullText: string, aiId: string): Promise<void> {
  return new Promise((resolve) => {
    let i = 0
    const timer = setInterval(() => {
      const target = messages.value.find((m) => m.id === aiId)
      if (!target) {
        clearInterval(timer)
        resolve()
        return
      }
      if (i < fullText.length) {
        target.content += fullText[i]
        i++
        scrollThrottled()
      } else {
        clearInterval(timer)
        target.isStreaming = false
        resolve()
      }
    }, 30)
  })
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function onMenu(action: string) {
  menuOpen.value = false
  if (action === 'clear') {
    uni.showModal({
      title: '清空对话',
      content: '确定要清空当前对话记录吗？',
      confirmColor: '#C41E3A',
      success: (r) => {
        if (r.confirm) {
          messages.value = []
          conversationId.value = ''
        }
      },
    })
  }
}

// 简化 Markdown → rich-text nodes（粗体/标题/列表）
function renderMarkdown(content: string): string {
  if (!content) return ''
  return content
    .split('\n')
    .map((line) => {
      const l = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      if (l.startsWith('# ')) return `<div style="font-size:30rpx;font-weight:bold;margin:8rpx 0;">${l.slice(2)}</div>`
      if (l.startsWith('## ')) return `<div style="font-size:28rpx;font-weight:bold;margin:8rpx 0;">${l.slice(3)}</div>`
      if (/^\d+\.\s/.test(l)) return `<div style="margin-left:24rpx;">${l}</div>`
      if (l.startsWith('- ')) return `<div style="margin-left:24rpx;">• ${l.slice(2)}</div>`
      if (!l.trim()) return '<div style="height:16rpx;"></div>'
      return `<div>${l}</div>`
    })
    .join('')
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function goBack() {
  navigateBack()
}

// 低置信商业推荐：同意/拒绝查看
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
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
}

/* 加载/错误态 */
.cc-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}
.cc-state-t {
  font-size: 28rpx;
  color: #8a8178;
}
.cc-retry {
  padding: 16rpx 48rpx;
  background: var(--brand);
  border-radius: 999rpx;
}
.cc-retry-t {
  font-size: 28rpx;
  color: #fff;
}
.cc-state-back {
  position: fixed;
  left: 24rpx;
  top: calc(var(--status-bar-height, 0px) + 20rpx);
  z-index: 10;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 顶栏 */
.nav-bar {
  height: 96rpx;
  background: linear-gradient(90deg, var(--brand), #e8544e);
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  flex-shrink: 0;
}
.nav-btn {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-bar > .nav-btn:first-child { margin-left: -12rpx; }
.nav-bar > .nav-btn:last-child { margin-right: -12rpx; }
.nav-bot {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  margin-left: 8rpx;
}
.nav-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
}
.nav-avatar-fb {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 26rpx;
}
.nav-info {
  margin-left: 16rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.nav-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-status {
  color: rgba(255, 255, 255, 0.7);
  font-size: 22rpx;
}
.nav-actions {
  display: flex;
  align-items: center;
}

/* 菜单 */
.menu-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.menu-pop {
  position: absolute;
  top: 96rpx;
  right: 16rpx;
  width: 280rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  padding: 8rpx 0;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  gap: 16rpx;
}
.menu-text {
  font-size: 28rpx;
  color: #444;
}
.menu-text-danger {
  color: var(--brand);
}

/* 对话区 */
.chat-scroll {
  flex: 1;
  overflow: hidden;
}
.chat-content {
  padding: 24rpx;
}
.welcome-block {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.msg-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.msg-row-user {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.msg-avatar-bot {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand);
  color: #fff;
  font-size: 26rpx;
}
.msg-avatar-user {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #c9a96e;
  color: #fff;
  font-size: 26rpx;
}
.msg-body {
  max-width: 80%;
}
.msg-body-user {
  text-align: right;
}
.bubble {
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  display: inline-block;
  text-align: left;
}
.bubble-bot {
  background: #fff;
  color: #444;
  border-radius: 24rpx;
  border-top-left-radius: 4rpx;
}
.bubble-user {
  background: var(--brand);
  color: #fff;
  border-radius: 24rpx;
  border-top-right-radius: 4rpx;
}
.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
}
.bubble-rich {
  font-size: 28rpx;
  line-height: 1.6;
}
.cursor {
  display: inline-block;
  font-size: 28rpx;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.msg-time {
  display: block;
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}

/* 输入栏 */
.input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}
.input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.chat-input {
  flex: 1;
  height: 72rpx;
  background: #f7f7f7;
  border: 1rpx solid #e5e5e5;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}
.send-btn {
  width: 72rpx;
  height: 72rpx;
  background: var(--brand);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.send-btn-disabled {
  opacity: 0.4;
}
/* AI 风险免责声明（每条 AI 回复下方小字） */
.ai-disclaimer { display: block; margin-top: 10rpx; font-size: 20rpx; line-height: 1.4; color: #bbb; }

/* 软性导流推荐卡片 */
.recommend-block { position: relative; margin-top: 18rpx; padding-left: 18rpx; display: flex; flex-direction: column; gap: 12rpx; }
.recommend-block::before { content: ''; position: absolute; left: 5rpx; top: 16rpx; bottom: 20rpx; width: 2rpx; border-radius: 2rpx; background: linear-gradient(180deg, #c9a96e, rgba(201,169,110,0.12)); }
.recommend-head { display: flex; align-items: flex-start; gap: 12rpx; }
.recommend-node { position: relative; z-index: 1; width: 38rpx; height: 38rpx; margin-left: -32rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #c9a96e; box-shadow: 0 0 0 7rpx #fff; }
.recommend-copy { min-width: 0; display: flex; flex-direction: column; gap: 3rpx; }
.recommend-label { font-size: 25rpx; line-height: 1.35; color: #303641; font-weight: 700; }
.recommend-lead { font-size: 21rpx; line-height: 1.5; color: #8a8178; }
.recommend-disclosure { padding-left: 4rpx; font-size: 19rpx; color: #aaa19a; }
.reco-consent { background: rgba(201, 169, 110, 0.08); border: 2rpx solid rgba(201, 169, 110, 0.3); border-radius: 20rpx; padding: 24rpx; }
.reco-consent-text { font-size: 26rpx; color: #1a1a1a; line-height: 1.5; }
.reco-consent-btns { display: flex; gap: 16rpx; margin-top: 20rpx; }
.reco-btn { padding: 12rpx 32rpx; border-radius: 999rpx; }
.reco-btn-yes { background: #c9a96e; }
.reco-btn-yes-text { font-size: 26rpx; color: #fff; }
.reco-btn-no { background: rgba(0, 0, 0, 0.05); }
.reco-btn-no-text { font-size: 26rpx; color: #999; }
.rec-card { display: flex; align-items: center; gap: 20rpx; padding: 20rpx; border-radius: 20rpx; border: 1rpx solid; }
.rec-course { background: rgba(196, 30, 58, 0.04); border-color: rgba(196, 30, 58, 0.1); }
.rec-circle { background: rgba(5, 150, 105, 0.04); border-color: rgba(5, 150, 105, 0.1); }
.rec-icon { width: 80rpx; height: 80rpx; border-radius: 18rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.rec-icon-course { background: rgba(196, 30, 58, 0.12); }
.rec-icon-circle { width: 72rpx; height: 72rpx; background: rgba(5, 150, 105, 0.15); }
.rec-info { flex: 1; min-width: 0; }
.rec-top { display: flex; align-items: center; gap: 12rpx; }
.rec-title { font-size: 26rpx; font-weight: 500; color: #1a1a1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-badge { font-size: 18rpx; color: var(--brand); background: rgba(196, 30, 58, 0.1); padding: 2rpx 10rpx; border-radius: 8rpx; flex-shrink: 0; }
.rec-sub { display: block; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rec-price-row { display: flex; align-items: center; gap: 12rpx; margin-top: 8rpx; }
.rec-price { font-size: 28rpx; font-weight: 700; color: var(--brand); }
.rec-members { font-size: 22rpx; color: #999; }

.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
