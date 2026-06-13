<template>
  <view class="bc-page">
    <!-- 顶部导航 -->
    <view class="header-bar">
      <text class="header-back" @click="uni.navigateBack()">‹</text>
      <view class="header-bot">
        <view class="hb-avatar">{{ botDetail?.name?.slice(0, 1) || '?' }}</view>
        <view class="hb-info">
          <text class="hb-name">{{ botDetail?.name || '加载中...' }}</text>
          <text class="hb-status">{{ botDetail?.isOfficial ? '官方认证' : '在线' }}</text>
        </view>
      </view>
      <view class="header-actions">
        <text v-if="botDetail?.voiceEnabled" class="ha-btn" @click="handleVoiceCall">📞</text>
        <text class="ha-btn" @click="showMenu = !showMenu">⋯</text>
        <view v-if="showMenu" class="ha-menu">
          <view class="ham-mask" @click="showMenu = false" />
          <view class="ham-list">
            <text class="ham-item" @click="showMenu = false">📋 历史记录</text>
            <text class="ham-item" @click="showMenu = false">📤 分享</text>
            <text class="ham-item" @click="showMenu = false">⚙️ 设置</text>
            <text class="ham-item danger" @click="showMenu = false">🗑️ 清空对话</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 消息区域 -->
    <scroll-view scroll-y class="msg-area" :scroll-into-view="'msg-' + (messages.length - 1)" :scroll-with-animation="true">
      <!-- 欢迎区域 -->
      <view v-if="messages.length === 0 && botDetail" class="welcome">
        <view class="wl-bot-msg">
          <view class="wl-avatar">{{ botDetail.name.slice(0, 1) }}</view>
          <view class="wl-bubble">{{ botDetail.welcomeMessage }}</view>
        </view>

        <view v-if="botDetail.suggestions?.length" class="wl-suggestions">
          <text class="wl-stip">您可以这样问我：</text>
          <view class="wl-sgrid">
            <text v-for="(s, i) in botDetail.suggestions" :key="i" class="wl-sitem" @click="inputValue = s">{{ s }}</text>
          </view>
        </view>

        <view v-if="botDetail.capabilities" class="wl-caps">
          <text class="wl-ctip">我的能力：</text>
          <view class="wl-cgrid">
            <text v-for="(c, i) in botDetail.capabilities" :key="i" class="wl-citem">{{ c }}</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view v-for="(msg, i) in messages" :key="msg.id" :id="'msg-' + i" class="msg-row" :class="{ sent: msg.role === 'user' }">
        <view v-if="msg.role !== 'user'" class="msg-avatar bot">{{ botDetail?.name?.slice(0, 1) || '?' }}</view>
        <view class="msg-body">
          <view v-if="msg.type === 'text'" class="msg-bubble" :class="{ sent: msg.role === 'user' }">
            <text v-if="!msg.isStreaming" class="msg-text">{{ msg.content }}</text>
            <text v-else class="msg-text">{{ streamingText }}<text class="msg-cursor">|</text></text>
          </view>
          <view v-else-if="msg.type === 'image' && msg.attachment" class="msg-image">
            <text>🖼️ {{ msg.attachment.name }}</text>
          </view>
          <view v-else-if="msg.type === 'file' && msg.attachment" class="msg-file" :class="{ sent: msg.role === 'user' }">
            <text>📎 {{ msg.attachment.name }}</text>
          </view>
          <text class="msg-time">{{ formatTime(msg.createdAt) }}</text>
        </view>
        <view v-if="msg.role === 'user'" class="msg-avatar user">我</view>
      </view>
    </scroll-view>

    <!-- 使用限制 -->
    <view v-if="botDetail?.limits && !botDetail.isFree" class="limit-bar">
      <text class="limit-text">今日免费次数：{{ botDetail.limits.usedCount }}/{{ botDetail.limits.dailyFreeCount }}</text>
      <text v-if="botDetail.limits.usedCount >= botDetail.limits.dailyFreeCount" class="limit-upgrade">升级会员</text>
    </view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <view class="ib-row">
        <text v-if="botDetail?.voiceEnabled" class="ib-btn" :class="{ active: isRecording }" @click="isRecording = !isRecording">{{ isRecording ? '🔴' : '🎤' }}</text>
        <view class="ib-input-wrap">
          <input v-model="inputValue" class="ib-input" :placeholder="isRecording ? '正在录音...' : '输入您的问题...'" :disabled="isRecording || isSending" @confirm="handleSend" />
          <text v-if="botDetail?.fileEnabled" class="ib-file" @click="handleUpload">🖼️</text>
        </view>
        <view class="ib-send" :class="{ disabled: !inputValue.trim() || isSending }" @click="handleSend">
          <text>{{ isSending ? '⏳' : '➤' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const botDetail = ref<any>({
  id: 1, name: '国学AI助手', avatar: '', isOfficial: true, isFree: false,
  welcomeMessage: '你好！我是国学AI助手，可以为你解答八字命理、风水堪舆、易经八卦等国学传统文化问题。请随时向我提问！',
  voiceEnabled: true, fileEnabled: true,
  suggestions: ['如何排八字？', '什么是五行生克？', '帮我分析一下命盘', '风水布局有哪些禁忌？'],
  capabilities: ['八字排盘', '五行分析', '风水布局', '易经解读', '紫微斗数', '姓名学'],
  limits: { usedCount: 3, dailyFreeCount: 10 },
})

const messages = ref<any[]>([])
const inputValue = ref('')
const isSending = ref(false)
const isRecording = ref(false)
const streamingText = ref('')
const showMenu = ref(false)

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function handleSend() {
  if (!inputValue.value.trim() || isSending.value) return
  const content = inputValue.value.trim()
  const userMsg = { id: 'u' + Date.now(), role: 'user', type: 'text', content, createdAt: new Date().toISOString() }
  messages.value.push(userMsg)
  inputValue.value = ''
  isSending.value = true
  streamingText.value = ''

  const aiMsg = { id: 'a' + Date.now(), role: 'assistant', type: 'text', content: '', createdAt: new Date().toISOString(), isStreaming: true }
  messages.value.push(aiMsg)

  // 模拟流式回复
  const reply = '感谢您的提问！根据您的问题，我来为您详细解答...\n\n在中国传统文化中，这个问题涉及到多个方面的知识。\n\n**要点一：** 首先需要了解基本概念和理论框架。\n\n**要点二：** 其次要结合实际案例进行分析。\n\n**要点三：** 最后需要注意不同流派的观点差异。\n\n希望这个回答对您有帮助！如有更多问题，欢迎继续提问。'
  let idx = 0
  const timer = setInterval(() => {
    if (idx < reply.length) {
      streamingText.value += reply[idx]
      idx++
    } else {
      clearInterval(timer)
      const last = messages.value[messages.value.length - 1]
      if (last) { last.content = reply; last.isStreaming = false }
      streamingText.value = ''
      isSending.value = false
    }
  }, 30)
}

function handleVoiceCall() { uni.showToast({ title: '语音房间创建中...', icon: 'none' }) }
function handleUpload() { uni.showToast({ title: '文件上传功能开发中', icon: 'none' }) }
</script>

<style scoped>
.bc-page { display: flex; flex-direction: column; height: 100vh; background: #FAF8F5; }

.header-bar { height: 88rpx; background: linear-gradient(90deg, #C41E3A, #E8544E); display: flex; align-items: center; padding: 0 20rpx; flex-shrink: 0; position: relative; }
.header-back { font-size: 44rpx; color: #fff; width: 56rpx; }
.header-bot { display: flex; align-items: center; gap: 10rpx; flex: 1; }
.hb-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; border: 2rpx solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #fff; background: rgba(255,255,255,0.2); }
.hb-name { font-size: 26rpx; font-weight: 500; color: #fff; display: block; }
.hb-status { font-size: 20rpx; color: rgba(255,255,255,0.7); }
.header-actions { display: flex; gap: 4rpx; position: relative; }
.ha-btn { font-size: 32rpx; color: #fff; width: 56rpx; text-align: center; }
.ha-menu { position: absolute; right: 0; top: 60rpx; z-index: 50; }
.ham-mask { position: fixed; inset: 0; }
.ham-list { background: #fff; border-radius: 14rpx; padding: 8rpx 0; box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.12); min-width: 200rpx; }
.ham-item { display: block; padding: 16rpx 24rpx; font-size: 24rpx; color: #333; }
.ham-item.danger { color: #C41E3A; }

.msg-area { flex: 1; padding: 20rpx; }

.welcome { padding: 20rpx 0; }
.wl-bot-msg { display: flex; gap: 12rpx; align-items: flex-start; }
.wl-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #C41E3A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; flex-shrink: 0; }
.wl-bubble { background: #fff; border-radius: 16rpx 16rpx 16rpx 4rpx; padding: 16rpx 20rpx; font-size: 24rpx; color: #555; line-height: 1.6; max-width: 80%; }
.wl-suggestions { margin-top: 24rpx; padding-left: 68rpx; }
.wl-stip { font-size: 20rpx; color: #BBB; display: block; margin-bottom: 10rpx; }
.wl-sgrid { display: flex; flex-wrap: wrap; gap: 10rpx; }
.wl-sitem { padding: 10rpx 18rpx; border-radius: 20rpx; border: 1px solid rgba(196,30,58,0.2); font-size: 22rpx; color: #C41E3A; background: #fff; }
.wl-caps { margin-top: 20rpx; padding-left: 68rpx; }
.wl-ctip { font-size: 20rpx; color: #BBB; display: block; margin-bottom: 10rpx; }
.wl-cgrid { display: flex; flex-wrap: wrap; gap: 8rpx; }
.wl-citem { padding: 6rpx 14rpx; border-radius: 8rpx; background: #fff; font-size: 20rpx; color: #666; }

.msg-row { display: flex; gap: 10rpx; margin-bottom: 24rpx; align-items: flex-start; }
.msg-row.sent { flex-direction: row-reverse; }
.msg-avatar { width: 52rpx; height: 52rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20rpx; flex-shrink: 0; }
.msg-avatar.bot { background: #C41E3A; color: #fff; }
.msg-avatar.user { background: #C9A96E; color: #fff; }
.msg-body { max-width: 80%; }
.msg-bubble { padding: 14rpx 20rpx; border-radius: 16rpx; font-size: 24rpx; line-height: 1.6; }
.msg-bubble:not(.sent) { background: #fff; border-radius: 16rpx 16rpx 16rpx 4rpx; }
.msg-bubble.sent { background: #C41E3A; color: #fff; border-radius: 16rpx 16rpx 4rpx 16rpx; }
.msg-text { white-space: pre-wrap; }
.msg-cursor { animation: blink 1s infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.msg-image { background: #fff; border-radius: 14rpx; padding: 24rpx; text-align: center; }
.msg-file { background: #fff; border-radius: 14rpx; padding: 14rpx 18rpx; display: flex; align-items: center; gap: 8rpx; }
.msg-file.sent { background: #C41E3A; color: #fff; }
.msg-time { font-size: 18rpx; color: #CCC; display: block; margin-top: 4rpx; }
.msg-row.sent .msg-time { text-align: right; }

.limit-bar { padding: 14rpx 24rpx; background: rgba(201,169,110,0.08); border-top: 1px solid rgba(201,169,110,0.15); text-align: center; }
.limit-text { font-size: 22rpx; color: #C9A96E; }
.limit-upgrade { font-size: 22rpx; color: #C41E3A; text-decoration: underline; margin-left: 12rpx; }

.input-bar { padding: 14rpx 20rpx; background: #fff; border-top: 1px solid #eee; padding-bottom: calc(14rpx + env(safe-area-inset-bottom)); flex-shrink: 0; }
.ib-row { display: flex; align-items: center; gap: 10rpx; }
.ib-btn { font-size: 32rpx; width: 56rpx; text-align: center; flex-shrink: 0; }
.ib-btn.active { color: #C41E3A; }
.ib-input-wrap { flex: 1; position: relative; }
.ib-input { width: 100%; height: 64rpx; background: #F5F1EB; border-radius: 32rpx; padding: 0 64rpx 0 24rpx; font-size: 24rpx; color: #333; box-sizing: border-box; }
.ib-file { position: absolute; right: 18rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; }
.ib-send { width: 60rpx; height: 60rpx; border-radius: 50%; background: #C41E3A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ib-send text { font-size: 24rpx; color: #fff; }
.ib-send.disabled { background: #F5F1EB; }
.ib-send.disabled text { color: #BBB; }
</style>
