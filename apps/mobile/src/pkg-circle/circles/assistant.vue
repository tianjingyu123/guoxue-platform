<script setup lang="ts">
/**
 * 圈主助理对话页 — 圈子专属 RAG 对话机器人
 * 复用通用对话组件 simple-chat，resolveReply 接后端 /circles/:id/assistant/ask。
 * 维护多轮 history 供后端联邦检索上下文。
 */
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SimpleChat from '@/components/agent/simple-chat.vue'
import { assistantApi, type AssistantHistory } from '@/lib/circle-assistant-data'

const circleId = ref('')
const title = ref('圈主助理')
const history = ref<AssistantHistory>([])

onLoad((q) => {
  if (q?.circleId) circleId.value = q.circleId
  if (q?.name) title.value = decodeURIComponent(q.name) + ' · 圈主助理'
})

async function resolve(text: string): Promise<string> {
  if (!circleId.value) return '未指定圈子，无法对话。'
  const r = await assistantApi.ask(circleId.value, text, history.value)
  const answer = r.answer || '抱歉，我暂时无法回答这个问题。'
  // 维护多轮上下文（最多保留最近 6 轮）
  history.value.push({ role: 'user', content: text })
  history.value.push({ role: 'assistant', content: answer })
  if (history.value.length > 12) history.value = history.value.slice(-12)
  return answer
}
</script>

<template>
  <simple-chat
    :title="title"
    icon-name="sparkles"
    icon-color="#C41E3A"
    icon-bg="rgba(196,30,58,0.1)"
    welcome="你好，我是本圈的圈主助理。圈子内容、国学知识都可以问我～"
    :quick-prompts="['这个圈子主要讲什么？', '推荐一些入门内容', '帮我解释一个概念']"
    :resolve-reply="resolve"
    :delay="0"
  />
</template>
