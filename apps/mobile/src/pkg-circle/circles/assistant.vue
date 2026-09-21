<script setup lang="ts">
/**
 * 圈主助理对话页 — 圈子专属 RAG 对话机器人
 * 复用通用对话组件 simple-chat。
 * H5 走流式 POST /circles/:id/assistant/stream（fetch SSE·打字机）；
 * 非 H5 端降级非流式 /circles/:id/assistant/ask。
 * 维护多轮 history 供后端联邦检索上下文。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SimpleChat, { type SimpleChatStreamHandlers } from '@/components/agent/simple-chat.vue'
import { assistantApi, type AssistantHistory } from '@/lib/circle-assistant-data'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'

const circleId = ref('')
const title = ref('圈主助理')
const history = ref<AssistantHistory>([])

onLoad((q) => {
  if (q?.circleId) circleId.value = q.circleId
  if (q?.name) title.value = decodeURIComponent(q.name) + ' · 圈主助理'
})

function pushHistory(text: string, answer: string) {
  history.value.push({ role: 'user', content: text })
  history.value.push({ role: 'assistant', content: answer })
  // 维护多轮上下文（最多保留最近 6 轮）
  if (history.value.length > 12) history.value = history.value.slice(-12)
}

/** 流式回复：H5 走 SSE 打字机；其他端降级非流式 */
async function resolveStream(text: string, handlers: SimpleChatStreamHandlers): Promise<void> {
  if (!circleId.value) {
    handlers.appendText('未指定圈子，无法对话。')
    return
  }
  let acc = ''
  if (streamChatSupported()) {
    await streamChat(
      `/circles/${circleId.value}/assistant/stream`,
      { question: text, history: history.value },
      {
        onChunk: (t) => { acc += t; handlers.appendText(t) },
        onMeta: (m) => { if (m.disclaimer) handlers.setDisclaimer(m.disclaimer) },
      },
    )
  } else {
    const r = await assistantApi.ask(circleId.value, text, history.value)
    acc = r.answer || '抱歉，我暂时无法回答这个问题。'
    handlers.appendText(acc)
  }
  if (acc) pushHistory(text, acc.slice(0, 2000))
}

function openVoice() {
  uni.navigateTo({ url: `/pkg-agent/agent/xiaobu-voice?scene=circle_assistant&contextId=${encodeURIComponent(circleId.value)}` })
}
</script>

<template>
  <view class="assistant-page">
    <simple-chat
      :title="title"
      icon-name="sparkles"
      icon-color="#C41E3A"
      icon-bg="rgba(196,30,58,0.1)"
      welcome="你好，我是本圈的圈主助理。圈子内容、国学知识都可以问我～"
      :quick-prompts="['这个圈子主要讲什么？', '推荐一些入门内容', '帮我解释一个概念']"
      :resolve-stream="resolveStream"
    />
    <!-- 语音入口与文字分开（S02）：进入统一语音页，由服务端校验成员身份与圈主是否开通 -->
    <view v-if="circleId" class="voice-chip" data-testid="circle-voice" @tap="openVoice">
      <text class="voice-chip-text">语音</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.assistant-page { position: relative; }
.voice-chip { position: fixed; right: 24rpx; top: calc(var(--status-bar-height, 0px) + 120rpx); z-index: 30; padding: 10rpx 24rpx; border-radius: 999rpx; background: rgba(196,30,58,0.92); }
.voice-chip-text { font-size: 24rpx; color: #fff; }
</style>
