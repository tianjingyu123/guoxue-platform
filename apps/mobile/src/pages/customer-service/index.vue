<template>
  <view class="page">
    <scroll-view scroll-y class="chat-area">
      <view v-for="(msg, idx) in messages" :key="idx" class="msg-row" :class="{ mine: msg.fromMe }">
        <image v-if="!msg.fromMe" src="/static/kefu.png" class="msg-avatar" mode="aspectFill" />
        <view class="bubble" :class="{ mine: msg.fromMe }"><text>{{ msg.content }}</text></view>
      </view>
    </scroll-view>
    <view class="quick-replies">
      <text v-for="q in quickReplies" :key="q" class="quick-tag" @click="sendQuick(q)">{{ q }}</text>
    </view>
    <view class="input-bar">
      <input v-model="text" placeholder="输入问题..." class="chat-input" @confirm="send" />
      <button class="btn-send" @click="send">发送</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const messages = ref([{ content: '您好，我是国学平台客服，有什么可以帮您？', fromMe: false, time: '09:00' }])
const text = ref('')
const quickReplies = ['如何购买课程？', '订单退款问题', '账号相关', '其他问题']
function send() {
  if (!text.value.trim()) return
  messages.value.push({ content: text.value, fromMe: true })
  text.value = ''
  setTimeout(() => { messages.value.push({ content: '收到您的问题，客服会尽快回复您。', fromMe: false }) }, 1000)
}
function sendQuick(q: string) { text.value = q; send() }
</script>
<style>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F0E8; }
.chat-area { flex: 1; padding: 12px; }
.msg-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
.msg-row.mine { justify-content: flex-end; }
.msg-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; background: #fff; font-size: 14px; line-height: 1.5; }
.bubble.mine { background: #C41E3A; color: #fff; }
.quick-replies { display: flex; gap: 8px; padding: 8px 12px; background: #fff; flex-wrap: wrap; }
.quick-tag { padding: 6px 12px; background: #FFF0F0; color: #C41E3A; border-radius: 16px; font-size: 12px; }
.input-bar { display: flex; gap: 8px; padding: 10px 12px; background: #fff; border-top: 1px solid #eee; }
.chat-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; }
.btn-send { background: #C41E3A; color: #fff; border: none; border-radius: 20px; padding: 8px 16px; font-size: 14px; }
</style>
