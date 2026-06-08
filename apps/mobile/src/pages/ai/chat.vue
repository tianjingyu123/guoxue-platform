<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="header">
      <view class="back-btn" @click="goBack"><text class="back-arrow">←</text></view>
      <text class="header-title">AI 智能解盘</text>
      <view class="header-spacer" />
    </view>

    <!-- 聊天消息列表 -->
    <scroll-view scroll-y class="chat-body" :scroll-into-view="scrollToId" :scroll-with-animation="true">
      <view v-for="msg in messages" :key="msg.id" :id="'msg-' + msg.id" class="msg-wrap" :class="msg.role">
        <!-- AI 消息 -->
        <view v-if="msg.role === 'assistant'" class="msg-ai">
          <view class="ai-avatar">🤖</view>
          <view class="ai-bubble">
            <text class="bubble-text">{{ msg.content }}</text>
            <text v-if="msg.loading" class="typing-dot">...</text>
          </view>
        </view>
        <!-- 用户消息 -->
        <view v-else class="msg-user">
          <view class="user-bubble">
            <text class="bubble-text">{{ msg.content }}</text>
          </view>
        </view>
      </view>
      <view v-if="!messages.length && !loading" class="empty-chat">
        <text class="empty-icon">✨</text>
        <text class="empty-title">AI 智能解盘</text>
        <text class="empty-desc">输入您的命盘信息或问题，AI 为您深度解析</text>
      </view>
    </scroll-view>

    <!-- 快捷问题 -->
    <view v-if="!messages.length" class="quick-questions">
      <view v-for="q in quickQuestions" :key="q" class="quick-q" @click="sendMessage(q)">
        <text>{{ q }}</text>
      </view>
    </view>

    <!-- 输入区 -->
    <view class="input-bar">
      <input v-model="inputText" class="chat-input" placeholder="输入您的问题..." confirm-type="send" @confirm="sendCurrent" />
      <view class="send-btn" @click="sendCurrent">
        <text class="send-icon">➤</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { aiApi } from '@/api'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const loading = ref(true)
const scrollToId = ref('')
const currentScene = ref('bazi-reading')
const agentId = ref('')
let msgId = 0

const quickQuestions = [
  '我的八字格局如何？',
  '今年运势怎么样？',
  '这个命盘的喜用神是什么？',
  '帮我看看事业运',
  '婚姻感情方面如何？',
]

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const scene = page?.options?.scene
  const toolId = page?.options?.toolId
  const agId = page?.options?.agentId

  if (agId) {
    agentId.value = agId
    currentScene.value = agId
  }

  loading.value = false

  if (scene === 'paipan' && toolId) {
    msgId++
    messages.value.push({
      id: msgId,
      role: 'assistant',
      content: `您好！我是AI解盘助手。请告诉我您的出生信息（性别、出生年月日时），我将为您进行${toolId === 'bazi' ? '八字' : '命盘'}分析。`,
    })
  } else if (scene === 'paipan-interpret') {
    msgId++
    messages.value.push({
      id: msgId,
      role: 'assistant',
      content: '您好！我是AI智能解盘助手。您可以直接把排盘结果发给我，或者告诉我您的出生信息，我帮您解读命盘。',
    })
  }
})

function sendCurrent() {
  const text = inputText.value.trim()
  if (!text) return
  sendMessage(text)
}

async function sendMessage(text: string) {
  inputText.value = ''

  // 添加用户消息
  msgId++
  messages.value.push({ id: msgId, role: 'user', content: text })

  // 添加AI占位
  msgId++
  const aiMsg: ChatMessage = { id: msgId, role: 'assistant', content: '', loading: true }
  messages.value.push(aiMsg)

  scrollToBottom()

  // 构建对话历史（最近10轮，避免token超限）
  const history = messages.value
    .filter(m => !m.loading && m.content)
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content }))

  // 尝试 SSE 流式，失败则降级为非流式
  const token = uni.getStorageSync('token')
  if (token) {
    try {
      await tryStreamChat(aiMsg, history)
    } catch {
      await tryNormalChat(aiMsg, history)
    }
  } else {
    // 未登录，使用模拟回复提示登录
    aiMsg.loading = false
    aiMsg.content = '请先登录后再使用AI解盘功能。登录后可获得基于您命盘的专业AI解读。\n\n（提示：前往"我的"页面登录）'
  }
  scrollToBottom()
}

/** SSE 流式对话（H5环境可用） */
async function tryStreamChat(aiMsg: ChatMessage, history: Array<{ role: string; content: string }>) {
  // #ifdef H5
  const BASE = '/api/v1'
  const token = uni.getStorageSync('token')
  const response = await fetch(BASE + '/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      scene: currentScene.value,
      messages: history,
      temperature: 0.7,
      maxTokens: 2048,
    }),
  })

  if (!response.ok) throw new Error('SSE request failed')

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No reader')

  const decoder = new TextDecoder()
  let buffer = ''
  aiMsg.loading = false
  aiMsg.content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'chunk' && data.content) {
            aiMsg.content += data.content
            scrollToBottom()
          }
        } catch { /* skip malformed SSE data */ }
      }
    }
  }
  // #endif

  // #ifndef H5
  throw new Error('SSE not supported')
  // #endif
}

/** 非流式对话降级 */
async function tryNormalChat(aiMsg: ChatMessage, history: Array<{ role: string; content: string }>) {
  try {
    const res = await aiApi.chat({
      scene: currentScene.value,
      messages: history,
      temperature: 0.7,
      maxTokens: 2048,
    })
    aiMsg.loading = false
    aiMsg.content = res?.content || res?.data?.content || '抱歉，AI服务暂时不可用，请稍后重试。'
  } catch {
    aiMsg.loading = false
    aiMsg.content = 'AI服务连接失败，请检查网络后重试。'
  }
}

function scrollToBottom() {
  nextTick(() => {
    scrollToId.value = 'msg-' + msgId
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F0E8; }

.header { display: flex; align-items: center; padding: 24rpx 32rpx; background: #fff; border-bottom: 1rpx solid #E8E0D5; flex-shrink: 0; }
.back-btn { padding: 8rpx 16rpx 8rpx 0; }
.back-arrow { font-size: 40rpx; color: #3C2415; }
.header-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #3C2415; text-align: center; }
.header-spacer { width: 60rpx; }

.chat-body { flex: 1; padding: 24rpx; overflow-y: auto; }
.msg-wrap { margin-bottom: 24rpx; }

.msg-ai { display: flex; gap: 16rpx; }
.ai-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: linear-gradient(135deg, #8B5CF6, #7C3AED); display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.ai-bubble { flex: 1; background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.bubble-text { font-size: 28rpx; color: #3C2415; line-height: 1.7; white-space: pre-wrap; }
.typing-dot { font-size: 28rpx; color: #C9A96E; animation: blink 1s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

.msg-user { display: flex; justify-content: flex-end; }
.user-bubble { background: linear-gradient(135deg, #5a3a1a, #8b6914); border-radius: 16rpx; padding: 20rpx; max-width: 80%; }
.user-bubble .bubble-text { color: #fff; }

.empty-chat { display: flex; flex-direction: column; align-items: center; padding: 120rpx 32rpx; }
.empty-icon { font-size: 80rpx; }
.empty-title { font-size: 32rpx; font-weight: 600; color: #3C2415; margin-top: 24rpx; }
.empty-desc { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; max-width: 500rpx; }

.quick-questions { padding: 0 32rpx 16rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.quick-q { padding: 14rpx 24rpx; background: #fff; border: 1rpx solid #E8E0D5; border-radius: 24rpx; }
.quick-q:active { background: #FEF3C7; border-color: #C9A96E; }
.quick-q text { font-size: 24rpx; color: #8b6914; }

.input-bar { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-top: 1rpx solid #E8E0D5; flex-shrink: 0; }
.chat-input { flex: 1; height: 72rpx; background: #F5F0E8; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.send-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: linear-gradient(135deg, #5a3a1a, #8b6914); display: flex; align-items: center; justify-content: center; }
.send-btn:active { opacity: 0.8; }
.send-icon { font-size: 28rpx; color: #fff; }
</style>
