<script setup lang="ts">
import SimpleChat from '@/components/agent/simple-chat.vue'
import { zhixuanWelcome, zhixuanQuickPrompts } from '@/lib/agent-data'

function resolveReply() {
  return '感谢您的提问，我将为您详细分析。'
}
</script>

<template>
  <SimpleChat
    title="智玄 AI 助手"
    icon-name="bot"
    icon-color="#c41e3a"
    icon-bg="rgba(196,30,58,0.1)"
    :welcome="zhixuanWelcome"
    :quick-prompts="zhixuanQuickPrompts"
    :resolve-reply="resolveReply"
    bot-id="zhixuan"
  />
</template>
