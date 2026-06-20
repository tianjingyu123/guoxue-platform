<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleChat from '@/components/agent/simple-chat.vue'
import { agentApi } from '@/lib/agent-data'

const welcome = ref('')
const quickPrompts = ref<string[]>([])
const replyText = ref('')

onMounted(async () => {
  const data = await agentApi.main()
  welcome.value = data.welcome
  quickPrompts.value = data.quickPrompts
  replyText.value = data.reply
})

function resolveReply() {
  return replyText.value
}
</script>

<template>
  <SimpleChat
    title="智玄 AI 助手"
    icon-name="bot"
    icon-color="#c41e3a"
    icon-bg="rgba(196,30,58,0.1)"
    :welcome="welcome"
    :quick-prompts="quickPrompts"
    :resolve-reply="resolveReply"
    :delay="1200"
  />
</template>
