<template>
  <view class="page">
    <view class="chat-area" v-for="(m, i) in messages" :key="i" :class="{ user: m.role === 'user', bot: m.role === 'assistant' }">
      <text class="msg-text">{{ m.content }}</text>
    </view>
    <view class="input-area">
      <input v-model="input" placeholder="向AI助手提问古文..." class="msg-input" @confirm="send" />
      <button class="btn-send" @click="send">发送</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { classicApi, aiApi } from '../../api'

const input = ref('')
const messages = ref<{ role: string; content: string }[]>([])

async function send() {
  if (!input.value.trim()) return
  const q = input.value.trim()
  messages.value.push({ role: 'user', content: q })
  input.value = ''
  try {
    const res: any = await aiApi.chat({ scene: 'classics', messages: [{ role: 'user', content: q }] })
    const reply = res?.reply || res?.content || res?.message || '暂无回复'
    messages.value.push({ role: 'assistant', content: reply })
  } catch { messages.value.push({ role: 'assistant', content: '服务暂时不可用' }) }
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 60px; }
.chat-area { padding: 8px 12px; max-width: 80%; }
.chat-area.user { align-self: flex-end; }
.chat-area.bot { align-self: flex-start; }
.msg-text { padding: 10px 14px; border-radius: 12px; font-size: 14px; display: inline-block; }
.user .msg-text { background: #C41E3A; color: #fff; border-bottom-right-radius: 4px; }
.bot .msg-text { background: #fff; color: #2C2C2C; border-bottom-left-radius: 4px; }
.input-area { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 8px; padding: 8px 12px 20px; background: #fff; border-top: 1px solid #eee; }
.msg-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; background: #F5F0E8; }
.btn-send { width: 60px; height: 36px; background: #C41E3A; color: #fff; border-radius: 18px; border: none; font-size: 13px; text-align: center; line-height: 36px; }
</style>
