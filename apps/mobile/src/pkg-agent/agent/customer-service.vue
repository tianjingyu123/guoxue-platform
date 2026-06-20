<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SimpleChat from '@/components/agent/simple-chat.vue'
import { agentApi } from '@/lib/agent-data'

const welcome = ref('')
const quickPrompts = ref<string[]>([])
const replies = ref<Record<string, string>>({})
const defaultReply = ref('')

onMounted(async () => {
  const data = await agentApi.customerServiceConfig()
  welcome.value = data.welcome
  quickPrompts.value = data.quick
  replies.value = data.replies
  defaultReply.value = data.defaultReply
})

function resolveReply(text: string) {
  return replies.value[text] ?? defaultReply.value
}
</script>

<template>
  <SimpleChat
    title="智能客服"
    icon-name="headphones"
    icon-color="#2563eb"
    icon-bg="rgba(37,99,235,0.12)"
    :welcome="welcome"
    :quick-prompts="quickPrompts"
    :resolve-reply="resolveReply"
    :delay="800"
  />
</template>
