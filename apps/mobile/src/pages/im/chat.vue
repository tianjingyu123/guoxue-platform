<template>
  <view class="page">
    <scroll-view scroll-y class="msg-list" :scroll-into-view="scrollId">
      <view v-for="(msg, idx) in messages" :key="msg.id || idx" :id="'msg-' + idx" class="msg-row" :class="{ mine: msg.fromMe }">
        <image v-if="!msg.fromMe" :src="msg.avatar || ''" class="msg-avatar" mode="aspectFill" />
        <view class="bubble" :class="{ mine: msg.fromMe }"><text>{{ msg.content }}</text></view>
        <image v-if="msg.fromMe" :src="myAvatar" class="msg-avatar" mode="aspectFill" />
      </view>
    </scroll-view>
    <view class="input-bar">
      <input v-model="text" placeholder="输入消息..." class="chat-input" @confirm="send" />
      <button class="btn-send" @click="send">发送</button>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { imApi } from '../../api'
const messages = ref<any[]>([]); const text = ref(''); const scrollId = ref('')
const myAvatar = ref(''); const userId = ref('')
onMounted(() => {
  const pages = getCurrentPages(); const opts = (pages[pages.length - 1] as any)?.options || {}
  userId.value = opts.userId || ''
  loadHistory()
})
async function loadHistory() {
  try { const res: any = await imApi.getChatHistory(userId.value); messages.value = Array.isArray(res) ? res : res?.data || [] } catch {}
}
function send() {
  if (!text.value.trim()) return
  messages.value.push({ id: Date.now(), content: text.value, fromMe: true })
  text.value = ''
  scrollId.value = 'msg-' + (messages.value.length - 1)
}
</script>
<style>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F0E8; }
.msg-list { flex: 1; padding: 12px; overflow-y: auto; }
.msg-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
.msg-row.mine { flex-direction: row-reverse; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
.bubble { max-width: 65%; padding: 10px 14px; border-radius: 12px; background: #fff; font-size: 14px; line-height: 1.5; }
.bubble.mine { background: #C41E3A; color: #fff; }
.input-bar { display: flex; gap: 8px; padding: 10px 12px; background: #fff; border-top: 1px solid #eee; }
.chat-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 14px; }
.btn-send { background: #C41E3A; color: #fff; border: none; border-radius: 20px; padding: 8px 16px; font-size: 14px; }
</style>
