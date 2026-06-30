<template>
  <view class="ai-page">
    <!-- 顶部导航 -->
    <view class="ai-header">
      <view class="ai-hd-btn" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
      </view>
      <view class="ai-hd-center">
        <text class="ai-hd-title">古籍AI助手</text>
        <text class="ai-hd-sub">内容由AI生成</text>
      </view>
      <view class="ai-hd-btn" @tap="clearChat">
        <app-icon name="trash-2" :size="36" color="#1a1a1a" />
      </view>
    </view>

    <!-- 消息区域 -->
    <scroll-view class="ai-body" scroll-y :scroll-into-view="scrollAnchor">
      <!-- 空状态 -->
      <view v-if="messages.length === 0" class="ai-empty">
        <!-- AI介绍卡片 -->
        <view class="ai-intro">
          <view class="ai-intro-head">
            <view class="ai-avatar ai-avatar--lg">
              <app-icon name="sparkles" :size="40" color="#ffffff" />
            </view>
            <view>
              <text class="ai-intro-title">Hi~我是古籍AI助手</text>
              <text class="ai-intro-desc">贯通经史子集，为你白话解读古籍疑难</text>
            </view>
          </view>
          <text class="ai-intro-tip">有什么关于古籍和传统文化的问题，都可以问我哦！</text>
        </view>

        <!-- 快捷问题 -->
        <view class="ai-qlist">
          <view
            v-for="(q, i) in suggestedQuestions"
            :key="'s' + i"
            class="ai-suggested-q"
            @tap="pickQuestion(q)"
          >
            <text class="ai-suggested-q-text">{{ q }}</text>
          </view>
        </view>
      </view>

      <!-- 对话消息列表 -->
      <view v-else class="ai-msgs">
        <view
          v-for="m in messages"
          :key="m.id"
          class="ai-msg-row"
          :class="m.role === 'user' ? 'ai-msg-row--user' : ''"
        >
          <view v-if="m.role === 'assistant'" class="ai-avatar">
            <app-icon name="sparkles" :size="32" color="#ffffff" />
          </view>

          <view v-if="m.role === 'user'" class="ai-bubble-user">
            <text class="ai-bubble-user-text">{{ m.content }}</text>
          </view>
          <view v-else class="ai-assist-wrap">
            <view class="ai-card ai-card--assist">
              <text class="ai-card-text">{{ m.content }}</text>
            </view>
            <view class="ai-card-ops ai-card-ops--bare">
              <view class="ai-op" @tap="regenerate"><app-icon name="rotate-ccw" :size="28" color="#999999" /></view>
              <view class="ai-op" @tap="rate(m.id, true)"><app-icon name="thumbs-up" :size="28" :color="liked[m.id] === true ? '#22c55e' : '#999999'" /></view>
              <view class="ai-op" @tap="rate(m.id, false)"><app-icon name="thumbs-down" :size="28" :color="liked[m.id] === false ? '#ef4444' : '#999999'" /></view>
              <view class="ai-op" @tap="copyMsg(m.content)"><app-icon name="copy" :size="28" color="#999999" /></view>
            </view>
          </view>
        </view>

        <!-- 加载状态 -->
        <view v-if="isLoading" class="ai-msg-row">
          <view class="ai-avatar">
            <app-icon name="sparkles" :size="32" color="#ffffff" />
          </view>
          <view class="ai-card ai-card--assist">
            <view class="ai-loading">
              <view class="ai-dots">
                <view class="ai-dot" />
                <view class="ai-dot" />
                <view class="ai-dot" />
              </view>
              <text class="ai-loading-text">正在思考...</text>
            </view>
          </view>
        </view>

        <view id="ai-bottom" class="ai-bottom-anchor" />
      </view>
    </scroll-view>

    <!-- 底部输入框 -->
    <view class="ai-input-bar">
      <view class="ai-input-wrap">
        <textarea
          v-model="inputValue"
          class="ai-textarea"
          placeholder="输入和古籍相关的问题"
          placeholder-class="ai-textarea-ph"
          :disabled="isLoading"
          :auto-height="true"
          :show-confirm-bar="false"
        />
      </view>
      <view
        class="ai-send"
        :class="(!inputValue.trim() || isLoading) ? 'ai-send--disabled' : ''"
        @tap="handleSend"
      >
        <app-icon name="send" :size="32" color="#ffffff" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { classicsApi } from '@/lib/classics-data'
import { getToken } from '@/utils/storage'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const suggestedQuestions = [
  '《论语》中“仁”到底是什么意思？',
  '儒家、道家、佛家的核心区别是什么？',
  '《周易》的六十四卦是怎么来的？',
  '想入门国学，应从哪几部经典读起？',
]

const messages = ref<ChatMessage[]>([])
const inputValue = ref('')
const isLoading = ref(false)
const liked = ref<Record<string, boolean | null>>({})
const scrollAnchor = ref('')

function goBack() {
  uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pkg-classics/home/index' }) })
}

function pickQuestion(q: string) {
  inputValue.value = q
}

function clearChat() {
  if (!messages.value.length) return
  uni.showModal({
    title: '清空对话', content: '确定清空当前对话记录吗？', confirmColor: '#C41E3A', success: (r) => { if (r.confirm) messages.value = [] },
  })
}

function scrollToBottom() {
  nextTick(() => {
    scrollAnchor.value = ''
    nextTick(() => {
      scrollAnchor.value = 'ai-bottom'
    })
  })
}

function ensureLogin(): boolean {
  if (getToken()) return true
  uni.showModal({
    title: '需要登录', content: '登录后即可与古籍AI助手对话', confirmText: '去登录',
    success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
  })
  return false
}

async function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isLoading.value) return
  if (!ensureLogin()) return

  messages.value.push({ id: Date.now().toString(), role: 'user', content: text })
  inputValue.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const r = await classicsApi.askAI(text)
    messages.value.push({ id: (Date.now() + 1).toString(), role: 'assistant', content: r?.answer || '抱歉，我暂时无法回答这个问题。' })
  } catch (e: any) {
    messages.value.push({ id: (Date.now() + 1).toString(), role: 'assistant', content: e?.message || 'AI 暂时无法回答，请稍后重试。' })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function copyMsg(content: string) {
  uni.setClipboardData({ data: content, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
function rate(id: string, val: boolean) {
  liked.value[id] = liked.value[id] === val ? null : val
}
function regenerate() {
  if (isLoading.value) return
  const lastUser = [...messages.value].reverse().find((m) => m.role === 'user')
  if (lastUser) { inputValue.value = lastUser.content; handleSend() }
}
</script>

<style scoped lang="scss">
.ai-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.ai-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 112rpx;
  padding: 0 32rpx;
  background: #ffffff;
  border-bottom: 2rpx solid #ebe6df;
}
.ai-hd-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: rgba(240, 236, 229, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-hd-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ai-hd-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.ai-hd-sub {
  font-size: 20rpx;
  color: #999999;
  margin-top: 2rpx;
}

/* 消息区域 */
.ai-body {
  flex: 1;
  overflow: hidden;
}
.ai-empty,
.ai-msgs {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* AI回复卡 */
.ai-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(235, 230, 223, 0.6);
}
.ai-card--assist {
  border-top-left-radius: 8rpx;
}
.ai-card-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1a1a1a;
  white-space: pre-wrap;
}
.ai-card-ops {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid rgba(235, 230, 223, 0.5);
}
.ai-card-ops--bare {
  margin-top: 16rpx;
  margin-left: 8rpx;
  padding-top: 0;
  border-top: none;
}
.ai-op {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 相关问题 */
.ai-qlist {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ai-related-q {
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 2rpx solid rgba(235, 230, 223, 0.6);
}
.ai-related-q-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1a1a1a;
}

/* 分隔线 */
.ai-divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 16rpx 0;
}
.ai-divider-line {
  flex: 1;
  height: 2rpx;
  background: rgba(235, 230, 223, 0.5);
}
.ai-divider-text {
  font-size: 24rpx;
  color: #999999;
}

/* AI介绍卡 */
.ai-intro {
  background: rgba(107, 91, 122, 0.05);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(107, 91, 122, 0.2);
}
.ai-intro-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.ai-intro-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.ai-intro-desc {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}
.ai-intro-tip {
  font-size: 28rpx;
  color: #999999;
}

/* 快捷问题 */
.ai-suggested-q {
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  background: rgba(240, 236, 229, 0.5);
}
.ai-suggested-q-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #999999;
}

/* AI头像（紫檀渐变） */
.ai-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6b5b7a 0%, #8a7a99 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-avatar--lg {
  width: 80rpx;
  height: 80rpx;
}

/* 对话气泡 */
.ai-msg-row {
  display: flex;
  gap: 24rpx;
}
.ai-msg-row--user {
  justify-content: flex-end;
}
.ai-bubble-user {
  max-width: 85%;
  background: var(--brand);
  border-radius: 32rpx;
  border-top-right-radius: 8rpx;
  padding: 24rpx 32rpx;
}
.ai-bubble-user-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #ffffff;
}
.ai-assist-wrap {
  flex: 1;
  min-width: 0;
}

/* 加载动画 */
.ai-loading {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ai-dots {
  display: flex;
  gap: 8rpx;
}
.ai-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 9999rpx;
  background: #8a7a99;
  animation: ai-bounce 1.2s infinite ease-in-out;
}
.ai-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.ai-dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes ai-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-12rpx); }
}
.ai-loading-text {
  font-size: 28rpx;
  color: #999999;
}
.ai-bottom-anchor {
  height: 2rpx;
}

/* 底部输入栏 */
.ai-input-bar {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: 24rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 2rpx solid #ebe6df;
}
.ai-input-wrap {
  flex: 1;
  position: relative;
}
.ai-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 84rpx;
  max-height: 256rpx;
  border-radius: 32rpx;
  background: rgba(240, 236, 229, 0.5);
  border: 2rpx solid rgba(235, 230, 223, 0.6);
  padding: 20rpx 72rpx 20rpx 32rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.ai-textarea-ph {
  color: #999999;
}
.ai-mic {
  position: absolute;
  right: 24rpx;
  bottom: 20rpx;
  padding: 8rpx;
}
.ai-send {
  width: 80rpx;
  height: 80rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6b5b7a 0%, #8a7a99 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-send--disabled {
  opacity: 0.5;
}
</style>
