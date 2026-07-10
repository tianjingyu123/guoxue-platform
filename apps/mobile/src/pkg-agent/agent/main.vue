<script setup lang="ts">
/**
 * 智玄 AI 助手 —— 平台自建主智能体（走 /ai/zhixuan 自建链路·DeepSeek，非 Coze）。
 * H5：fetch SSE 流式打字机；识别到生辰时先收到八字盘面卡（bazi-card），再流式输出分析。
 * 非 H5 端：降级调非流式 /ai/zhixuan/chat（富消息一次性返回）。
 */
import { ref, onMounted } from 'vue'
import SimpleChat, { type SimpleChatStreamHandlers } from '@/components/agent/simple-chat.vue'
import { agentApi, zhixuanAiApi, type AiHistoryMsg } from '@/lib/agent-data'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'

const loading = ref(true)
const error = ref('')
const welcome = ref('')
const quickPrompts = ref<string[]>([])

// 多轮上下文（自建链路无状态，本页维护近几轮）
const history: AiHistoryMsg[] = []

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentApi.getZhixuanWelcome()
    welcome.value = data?.welcome || ''
    quickPrompts.value = data?.quickPrompts || []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

/** 流式回复：H5 走 SSE；其他端降级非流式富消息（卡片照常渲染） */
async function resolveStream(text: string, handlers: SimpleChatStreamHandlers): Promise<void> {
  let acc = ''
  if (streamChatSupported()) {
    await streamChat(
      '/ai/zhixuan/chat/stream',
      { query: text, history: history.slice(-8) },
      {
        onChunk: (t) => { acc += t; handlers.appendText(t) },
        onCard: (c) => handlers.pushCard(c.cardType, c.payload),
        onMeta: (m) => { if (m.disclaimer) handlers.setDisclaimer(m.disclaimer) },
      },
    )
  } else {
    const res = await zhixuanAiApi.chatRich(text, history)
    for (const part of res.messages) {
      if (part.type === 'text') {
        acc += part.content || ''
        if (part.content) handlers.appendText(part.content)
      } else {
        handlers.pushCard(part.type, part.payload)
      }
    }
    if (res.disclaimer) handlers.setDisclaimer(res.disclaimer)
  }
  // 记入多轮上下文（仅文本部分）
  history.push({ role: 'user', content: text }, { role: 'assistant', content: acc.slice(0, 2000) })
}
</script>

<template>
  <view v-if="loading" class="load-state"><text class="load-state-text">加载中...</text></view>
  <view v-else-if="error" class="load-state">
    <text class="load-state-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <SimpleChat
    v-else
    title="智玄 AI 助手"
    icon-name="bot"
    icon-color="#c41e3a"
    icon-bg="rgba(196,30,58,0.1)"
    :welcome="welcome"
    :quick-prompts="quickPrompts"
    :resolve-stream="resolveStream"
  />
</template>

<style scoped lang="scss">
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
