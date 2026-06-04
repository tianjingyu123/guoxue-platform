<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-inner">
        <view class="hi-left">
          <text
            class="back-btn"
            @click="goBack"
          >
            ‹
          </text>
          <view class="hi-avatar">
            <text>💬</text>
          </view>
          <view>
            <view class="hi-name-row">
              <text class="hi-name">
                智能客服
              </text>
              <text
                v-if="sessionStatus === 'waiting'"
                class="hi-badge"
              >
                排队中
              </text>
              <text
                v-if="sessionStatus === 'human'"
                class="hi-badge green"
              >
                人工服务
              </text>
            </view>
            <text class="hi-working">
              在线服务 09:00-22:00
            </text>
          </view>
        </view>
        <view
          v-if="sessionStatus === 'ai'"
          class="hi-transfer"
          @click="showTransferDialog = true"
        >
          📞 转人工
        </view>
        <view
          v-if="sessionStatus === 'waiting'"
          class="hi-transfer"
          @click="cancelTransfer"
        >
          取消排队
        </view>
      </view>
    </view>

    <!-- 对话区域 -->
    <scroll-view
      ref="chatScroll"
      scroll-y
      class="chat-area"
      :scroll-into-view="scrollToId"
    >
      <view
        v-for="msg in messages"
        :id="'msg-' + msg.id"
        :key="msg.id"
      >
        <!-- 系统消息 -->
        <view
          v-if="msg.role === 'system'"
          class="sys-msg"
        >
          <view class="sys-bubble">
            <text v-if="msg.type === 'transfer' && msg.transfer">
              ⏳ 排队中 第{{ msg.transfer.queuePosition }}位 预计{{ msg.transfer.estimatedWait }}
            </text>
            <text v-else>
              {{ msg.content }}
            </text>
          </view>
        </view>

        <!-- 用户消息 -->
        <view
          v-if="msg.role === 'user'"
          class="msg-row mine"
        >
          <view class="bubble mine">
            <text>{{ msg.content }}</text>
          </view>
        </view>

        <!-- AI/人工消息 -->
        <view
          v-if="msg.role === 'assistant' || msg.role === 'human'"
          class="msg-row"
        >
          <view class="cs-avatar">
            {{ msg.role === 'human' ? '👤' : '🤖' }}
          </view>
          <view class="bubble-wrap">
            <view class="bubble">
              <text>{{ msg.content }}</text>
              <text
                v-if="msg.isStreaming"
                class="stream-cursor"
              >
                |
              </text>
            </view>
            <!-- 推荐问题 -->
            <view
              v-if="msg.suggestions && msg.suggestions.length"
              class="suggestions"
            >
              <text
                v-for="(s, idx) in msg.suggestions"
                :key="idx"
                class="suggest-tag"
                @click="sendQuick(s)"
              >
                {{ s }}
              </text>
            </view>
            <!-- 满意度 -->
            <view
              v-if="!msg.isStreaming && !msg.rating && msg.type === 'text'"
              class="rating-row"
            >
              <text class="rating-label">
                这条回复有帮助吗？
              </text>
              <text
                class="rating-btn"
                @click="rateMsg(msg.id, 'positive')"
              >
                👍
              </text>
              <text
                class="rating-btn"
                @click="rateMsg(msg.id, 'negative')"
              >
                👎
              </text>
            </view>
            <view
              v-if="msg.rating"
              class="rated-row"
            >
              <text>{{ msg.rating.value === 'positive' ? '👍 已反馈有帮助' : '👎 已反馈' }}</text>
            </view>
          </view>
        </view>
      </view>
      <view id="scroll-bottom" />
    </scroll-view>

    <!-- 快捷回复 -->
    <view
      v-if="quickReplies.length"
      class="quick-replies"
    >
      <text
        v-for="q in quickReplies"
        :key="q"
        class="quick-tag"
        @click="sendQuick(q)"
      >
        {{ q }}
      </text>
    </view>

    <!-- 底部输入 -->
    <view class="input-bar">
      <view class="input-inner">
        <text
          class="upload-btn"
          @click="chooseImage"
        >
          📷
        </text>
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="请输入您的问题..."
          :disabled="isSending"
          @confirm="send"
        >
        <text
          class="send-btn"
          :class="{ disabled: !inputText.trim() || isSending }"
          @click="send"
        >
          {{ isSending ? '⏳' : '📤' }}
        </text>
      </view>
    </view>

    <!-- 转人工对话框 -->
    <view
      v-if="showTransferDialog"
      class="dialog-overlay"
      @click="showTransferDialog = false"
    >
      <view
        class="dialog-box"
        @click.stop
      >
        <text class="dialog-title">
          转接人工客服
        </text>
        <text class="dialog-desc">
          当前非服务时间（09:00-22:00），暂无人工客服在线。您可以留言，我们会尽快回复。
        </text>
        <view class="dialog-actions">
          <text
            class="dialog-btn"
            @click="showTransferDialog = false"
          >
            取消
          </text>
          <text
            class="dialog-btn primary"
            @click="handleTransfer"
          >
            确认转接
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface CSMessage { id: string; role: string; type: string; content: string; isStreaming?: boolean; suggestions?: string[]; transfer?: { queuePosition: number; estimatedWait: string }; rating?: { value: string; comment?: string }; createdAt?: string }

const messages = ref<CSMessage[]>([]); const inputText = ref(''); const isSending = ref(false); const sessionStatus = ref<'ai' | 'waiting' | 'human'>('ai'); const showTransferDialog = ref(false); const isTransferring = ref(false)
const scrollToId = ref(''); const quickReplies = ref<string[]>(['如何购买课程？', '课程退款流程', '账号相关问题', '学习币怎么用'])

onMounted(() => {
  messages.value.push({
    id: 'welcome', role: 'assistant', type: 'text',
    content: '您好！我是国学平台智能客服，很高兴为您服务。您可以咨询课程学习、订单问题、账户相关等任何疑问。',
    suggestions: quickReplies.value,
    createdAt: new Date().toISOString(),
  })
})

function scrollToBottom() {
  nextTick(() => { scrollToId.value = 'scroll-bottom' })
}

async function send(content?: string) {
  const text = content || inputText.value.trim()
  if (!text || isSending.value) return
  inputText.value = ''; isSending.value = true

  const userMsg: CSMessage = { id: 'u_' + Date.now(), role: 'user', type: 'text', content: text, createdAt: new Date().toISOString() }
  messages.value.push(userMsg)
  quickReplies.value = []
  scrollToBottom()

  const aiId = 'ai_' + Date.now()
  const aiMsg: CSMessage = { id: aiId, role: 'assistant', type: 'text', content: '', isStreaming: true, createdAt: new Date().toISOString() }
  messages.value.push(aiMsg)
  scrollToBottom()

  // 模拟AI回复
  setTimeout(() => {
    const idx = messages.value.findIndex(m => m.id === aiId)
    if (idx >= 0) {
      messages.value[idx] = { ...messages.value[idx], content: '感谢您的咨询！我们已经记录您的问题，客服会尽快为您处理。如需加急，请拨打客服热线 400-xxx-xxxx。', isStreaming: false }
    }
    isSending.value = false
    scrollToBottom()
  }, 1500)
}

function sendQuick(q: string) { send(q) }

function chooseImage() {
  uni.chooseImage({ count: 1, success: (res) => { messages.value.push({ id: 'img_' + Date.now(), role: 'user', type: 'image', content: '[图片]' }); scrollToBottom() } })
}

function rateMsg(msgId: string, value: string) {
  const idx = messages.value.findIndex(m => m.id === msgId)
  if (idx >= 0) messages.value[idx] = { ...messages.value[idx], rating: { value } }
  uni.showToast({ title: value === 'positive' ? '感谢反馈' : '已记录您的反馈' })
}

async function handleTransfer() {
  isTransferring.value = true; showTransferDialog.value = false
  sessionStatus.value = 'waiting'
  messages.value.push({ id: 'transfer_' + Date.now(), role: 'system', type: 'transfer', content: '', transfer: { queuePosition: 3, estimatedWait: '5分钟' } })
  isTransferring.value = false; scrollToBottom()
}

function cancelTransfer() { sessionStatus.value = 'ai' }

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #F5F0E8; }
.header { background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.header-inner { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; }
.hi-left { display: flex; align-items: center; gap: 12rpx; flex: 1; }
.back-btn { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.hi-avatar { width: 64rpx; height: 64rpx; background: rgba(196,30,58,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.hi-name-row { display: flex; align-items: center; gap: 8rpx; }
.hi-name { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }
.hi-badge { font-size: 18rpx; padding: 2rpx 10rpx; background: #fff3e0; color: #e65100; border-radius: 8rpx; }
.hi-badge.green { background: #e8f5e9; color: #2e7d32; }
.hi-working { font-size: 22rpx; color: #999; }
.hi-transfer { font-size: 22rpx; color: #C41E3A; padding: 8rpx 16rpx; border: 1rpx solid #C41E3A; border-radius: 12rpx; }
.chat-area { flex: 1; padding: 16rpx 20rpx; overflow-y: auto; }
.sys-msg { display: flex; justify-content: center; margin-bottom: 16rpx; }
.sys-bubble { background: rgba(0,0,0,0.05); padding: 8rpx 20rpx; border-radius: 16rpx; font-size: 22rpx; color: #999; max-width: 70%; text-align: center; }
.msg-row { display: flex; align-items: flex-start; gap: 12rpx; margin-bottom: 20rpx; }
.msg-row.mine { justify-content: flex-end; }
.cs-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
.bubble-wrap { max-width: 70%; }
.bubble { padding: 14rpx 20rpx; border-radius: 16rpx; background: #fff; font-size: 26rpx; line-height: 1.6; color: #2C2C2C; }
.bubble.mine { background: #C41E3A; color: #fff; border-radius: 16rpx 4rpx 16rpx 16rpx; }
.stream-cursor { animation: blink 0.8s infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
.suggestions { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }
.suggest-tag { padding: 6rpx 16rpx; background: #fef0f0; color: #C41E3A; border-radius: 16rpx; font-size: 22rpx; }
.rating-row { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }
.rating-label { font-size: 20rpx; color: #999; }
.rating-btn { font-size: 28rpx; cursor: pointer; }
.rated-row { margin-top: 6rpx; font-size: 22rpx; color: #999; }
.quick-replies { display: flex; gap: 8rpx; padding: 12rpx 20rpx; background: #fff; border-top: 1rpx solid #E5E1DB; flex-wrap: wrap; }
.quick-tag { padding: 8rpx 20rpx; background: #fef0f0; color: #C41E3A; border-radius: 20rpx; font-size: 22rpx; }
.input-bar { background: #fff; border-top: 1rpx solid #E5E1DB; padding: 12rpx 20rpx; padding-bottom: calc(12rpx + env(safe-area-inset-bottom)); }
.input-inner { display: flex; align-items: center; gap: 12rpx; }
.upload-btn { font-size: 32rpx; }
.chat-input { flex: 1; padding: 14rpx 20rpx; background: #F5F0E8; border-radius: 28rpx; font-size: 26rpx; }
.send-btn { font-size: 32rpx; padding: 8rpx; }
.send-btn.disabled { opacity: 0.4; }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
.dialog-box { width: 600rpx; background: #fff; border-radius: 20rpx; padding: 32rpx; }
.dialog-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 16rpx; }
.dialog-desc { font-size: 26rpx; color: #666; line-height: 1.6; display: block; margin-bottom: 24rpx; }
.dialog-actions { display: flex; gap: 16rpx; }
.dialog-btn { flex: 1; text-align: center; padding: 16rpx; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #666; }
.dialog-btn.primary { background: #C41E3A; color: #fff; border-color: #C41E3A; }
</style>
