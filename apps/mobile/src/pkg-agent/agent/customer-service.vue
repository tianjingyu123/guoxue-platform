<script setup lang="ts">
import SimpleChat from '@/components/agent/simple-chat.vue'
import { csWelcome, csQuick } from '@/lib/agent-data'

function resolveReply() {
  return '感谢您的反馈，客服人员将尽快处理。'
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
    bot-id="customer-service"
  />
</template>
