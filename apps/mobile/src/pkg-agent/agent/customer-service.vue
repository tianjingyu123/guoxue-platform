<script setup lang="ts">
/**
 * 智能客服 —— 平台自建 RAG 链路（/ai/customer-service·知识库检索 + DeepSeek）。
 * H5：fetch SSE 流式打字机；非 H5 端降级非流式接口。
 */
import { ref, onMounted } from 'vue'
import SimpleChat, { type SimpleChatStreamHandlers } from '@/components/agent/simple-chat.vue'
import { agentApi, csAiApi, type AiHistoryMsg } from '@/lib/agent-data'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'

const loading = ref(true)
const error = ref('')
const welcome = ref('')
const quick = ref<string[]>([])

// 多轮上下文（自建链路无状态，本页维护近几轮）
const history: AiHistoryMsg[] = []

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentApi.getCsWelcome()
    welcome.value = data?.welcome || ''
    quick.value = data?.quick || []
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })

/** 流式回复：H5 走 SSE（/ai/customer-service/stream）；其他端降级非流式 */
async function resolveStream(text: string, handlers: SimpleChatStreamHandlers): Promise<void> {
  let acc = ''
  if (streamChatSupported()) {
    await streamChat(
      '/ai/customer-service/stream',
      { question: text, history: history.slice(-8) },
      {
        onChunk: (t) => { acc += t; handlers.appendText(t) },
        onMeta: (m) => { if (m.disclaimer) handlers.setDisclaimer(m.disclaimer) },
      },
    )
  } else {
    acc = await csAiApi.ask(text, history)
    if (acc) handlers.appendText(acc)
  }
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
    title="智能客服"
    icon-name="headphones"
    icon-color="#2563eb"
    icon-bg="rgba(37,99,235,0.12)"
    :welcome="welcome"
    :quick-prompts="quick"
    :resolve-stream="resolveStream"
    experience-key="SERVICE"
    agent-name="平台智能客服"
  />
</template>

<style scoped lang="scss">
.load-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.load-state-text { font-size: 28rpx; color: #8a8178; }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
