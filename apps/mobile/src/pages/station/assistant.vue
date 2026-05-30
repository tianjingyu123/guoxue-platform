<template>
  <view class="page">
    <scroll-view scroll-y class="chat-area">
      <view v-for="(msg, idx) in messages" :key="idx" class="msg-row" :class="{ mine: msg.fromMe }">
        <view class="bubble" :class="{ mine: msg.fromMe }"><text>{{ msg.content }}</text></view>
      </view>
    </scroll-view>
    <view class="input-bar">
      <input v-model="text" placeholder="向分站助手提问..." class="chat-input" @confirm="send" />
      <button class="btn-send" @click="send">发送</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { botApi } from '../../api'
const messages = ref<any[]>([{ content: '您好，我是分站智能助手，有什么可以帮您？', fromMe: false }])
const text = ref('')
async function send() {
  if (!text.value.trim()) return
  const q = text.value; text.value = ''
  messages.value.push({ content: q, fromMe: true })
  try { const res: any = await botApi.chat({ message: q }); messages.value.push({ content: res?.reply || res?.content || '收到', fromMe: false }) } catch { messages.value.push({ content: '抱歉，暂时无法回复', fromMe: false }) }
}
</script>
<style>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F0E8; }
.chat-area { flex: 1; padding: 12px; }
.msg-row { display: flex; margin-bottom: 12px; }
.msg-row.mine { justify-content: flex-end; }
.bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; background: #fff; font-size: 14px; line-height: 1.5; }
.bubble.mine { background: #C41E3A; color: #fff; }
.input-bar { display: flex; gap: 8px; padding: 10px 12px; background: #fff; border-top: 1px solid #eee; }
.chat-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; }
.btn-send { background: #C41E3A; color: #fff; border: none; border-radius: 20px; padding: 8px 16px; font-size: 14px; }
</style>
