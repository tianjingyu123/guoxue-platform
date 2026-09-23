<script setup lang="ts">
/**
 * 圈主助理对话页 — 圈子专属 RAG 对话机器人
 * 复用通用对话组件 simple-chat。
 * H5 走流式 POST /circles/:id/assistant/stream（fetch SSE·打字机）；
 * 非 H5 端降级非流式 /circles/:id/assistant/ask。
 * 维护多轮 history 供后端联邦检索上下文。
 */
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SimpleChat, { type SimpleChatStreamHandlers } from '@/components/agent/simple-chat.vue'
import { assistantApi, type AssistantHistory } from '@/lib/circle-assistant-data'
import type { Recommendation } from '@/lib/agent-data'
import { streamChat, streamChatSupported } from '@/utils/stream-chat'

const circleId = ref('')
const title = ref('圈主助理')
const history = ref<AssistantHistory>([])
const backTarget = computed(() => circleId.value ? `/pkg-circle/circles/detail?id=${encodeURIComponent(circleId.value)}` : '/circles')

onLoad((q) => {
  if (q?.circleId) circleId.value = q.circleId
  if (q?.name) {
    try { title.value = decodeURIComponent(q.name) + ' · 圈主助理' }
    catch { title.value = '圈主助理' }
  }
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
        onMeta: (m) => {
          if (m.knowledgeMatches) handlers.setKnowledgeMatches(m.knowledgeMatches)
          if (m.disclaimer) handlers.setDisclaimer(m.disclaimer)
          if (m.recommendation) handlers.setRecommendation(m.recommendation as Recommendation)
        },
      },
    )
  } else {
    const r = await assistantApi.ask(circleId.value, text, history.value) as Awaited<ReturnType<typeof assistantApi.ask>> & { recommendation?: Recommendation }
    acc = r.answer || '抱歉，我暂时无法回答这个问题。'
    handlers.appendText(acc)
    handlers.setKnowledgeMatches({
      circle: r.sources?.filter((source) => source.sourceType !== 'global').length ?? 0,
      global: r.sources?.filter((source) => source.sourceType === 'global').length ?? 0,
    })
    if (r.recommendation) handlers.setRecommendation(r.recommendation as Recommendation)
  }
  if (acc) pushHistory(text, acc.slice(0, 2000))
}
</script>

<template>
  <simple-chat
    :title="title"
    :back-target="backTarget"
    icon-name="sparkles"
    icon-color="#C41E3A"
    icon-bg="rgba(196,30,58,0.1)"
    welcome="你好，我是本圈的圈主助理。圈子内容、国学知识都可以问我～"
    scene-hint="优先参考已入库的本圈知识；未命中时补充通用知识"
    :quick-prompts="['这个圈子主要讲什么？', '推荐一些入门内容', '帮我解释一个概念']"
    :resolve-stream="resolveStream"
  />
</template>
