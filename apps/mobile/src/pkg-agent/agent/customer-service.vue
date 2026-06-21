<script setup lang="ts">
import SimpleChat from '@/components/agent/simple-chat.vue'
import { csWelcome, csQuick, csReplies, csDefaultReply } from '@/lib/agent-data'

function resolveReply(text: string) {
  return csReplies[text] ?? csDefaultReply
}
</script>

<template>
  <SimpleChat
    title="智能客服"
    icon-name="headphones"
    icon-color="#2563eb"
    icon-bg="rgba(37,99,235,0.12)"
    :welcome="csWelcome"
    :quick-prompts="csQuick"
    :resolve-reply="resolveReply"
    :delay="800"
  />
</template>
