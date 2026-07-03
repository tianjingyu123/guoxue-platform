<template>
  <view class="cp-page">
    <!-- 顶部导航 -->
    <view class="cp-header">
      <view class="cp-hd-btn" @tap="goBack">
        <app-icon name="arrow-left" :size="40" color="#1a1a1a" />
      </view>
      <view class="cp-hd-center">
        <text class="cp-hd-title">识典伴读</text>
        <text class="cp-hd-sub">{{ headerSub }}</text>
      </view>
      <view class="cp-hd-btn" @tap="clearChat">
        <app-icon name="trash-2" :size="36" color="#1a1a1a" />
      </view>
    </view>

    <!-- AI 额度提示（会员不限量；免费用户每日限次·真源 GET /member/ai-quota） -->
    <view v-if="quota" class="cp-quota">
      <app-icon name="sparkles" :size="24" :color="quota.isMember ? '#C9A96E' : '#8a7a99'" />
      <text class="cp-quota-txt">
        {{ quota.isMember ? '书院会员 · AI 伴读不限量' : `今日免费伴读剩余 ${quota.remaining} 次` }}
      </text>
      <text v-if="!quota.isMember" class="cp-quota-link" @tap="goVip">会员不限量</text>
    </view>

    <!-- 消息区域 -->
    <scroll-view class="cp-body" scroll-y :scroll-into-view="scrollAnchor">
      <!-- 开场：介绍 + 引导问题 -->
      <view v-if="messages.length === 0" class="cp-empty">
        <view class="cp-intro">
          <view class="cp-intro-head">
            <view class="cp-avatar cp-avatar--lg">
              <app-icon name="sparkles" :size="40" color="#ffffff" />
            </view>
            <view>
              <text class="cp-intro-title">我是你的识典伴读</text>
              <text class="cp-intro-desc">正陪你研读{{ bookTitle ? `《${bookTitle}》` : '本篇' }}</text>
            </view>
          </view>
          <text class="cp-intro-tip">我会紧扣本章原文为你解读，并不时抛出问题引你深入思考。试试这些开始：</text>
        </view>

        <!-- 引导问题 -->
        <view v-if="promptsLoading" class="cp-prompts-loading">
          <text class="cp-prompts-loading-text">正在准备引导问题…</text>
        </view>
        <view v-else class="cp-qlist">
          <view
            v-for="(q, i) in guidingPrompts"
            :key="'g' + i"
            class="cp-guide-q"
            @tap="sendQuestion(q)"
          >
            <app-icon name="message-circle-question" :size="30" color="#8a7a99" />
            <text class="cp-guide-q-text">{{ q }}</text>
          </view>
        </view>
      </view>

      <!-- 对话消息列表 -->
      <view v-else class="cp-msgs">
        <view
          v-for="m in messages"
          :key="m.id"
          class="cp-msg-row"
          :class="m.role === 'user' ? 'cp-msg-row--user' : ''"
        >
          <view v-if="m.role === 'assistant'" class="cp-avatar">
            <app-icon name="sparkles" :size="32" color="#ffffff" />
          </view>

          <view v-if="m.role === 'user'" class="cp-bubble-user">
            <text class="cp-bubble-user-text">{{ m.content }}</text>
          </view>
          <view v-else class="cp-assist-wrap">
            <view class="cp-card">
              <text class="cp-card-text">{{ m.content }}</text>
              <text v-if="m.disclaimer" class="cp-disclaimer">{{ m.disclaimer }}</text>
            </view>
            <view class="cp-card-ops">
              <view class="cp-op" @tap="copyMsg(m.content)"><app-icon name="copy" :size="28" color="#999999" /></view>
            </view>
          </view>
        </view>

        <!-- 加载状态 -->
        <view v-if="isLoading" class="cp-msg-row">
          <view class="cp-avatar">
            <app-icon name="sparkles" :size="32" color="#ffffff" />
          </view>
          <view class="cp-card">
            <view class="cp-loading">
              <view class="cp-dots"><view class="cp-dot" /><view class="cp-dot" /><view class="cp-dot" /></view>
              <text class="cp-loading-text">正在研读本章…</text>
            </view>
          </view>
        </view>

        <!-- 额度用尽 → 会员引导（价值时刻的自然引子，非打断式弹窗） -->
        <view v-if="quotaExhausted" class="cp-upsell">
          <app-icon name="crown" :size="40" color="#C9A96E" />
          <view class="cp-upsell-body">
            <text class="cp-upsell-title">今日免费伴读次数已用完</text>
            <text class="cp-upsell-desc">开通书院会员，AI 伴读与白话对照不限量，明日免费次数也会照常刷新。</text>
          </view>
          <view class="cp-upsell-btn" @tap="goVip">
            <text class="cp-upsell-btn-txt">了解会员</text>
          </view>
        </view>

        <view id="cp-bottom" class="cp-bottom-anchor" />
      </view>
    </scroll-view>

    <!-- 底部输入框 -->
    <view class="cp-input-bar">
      <view class="cp-input-wrap">
        <textarea
          v-model="inputValue"
          class="cp-textarea"
          placeholder="就本章向伴读提问…"
          placeholder-class="cp-textarea-ph"
          :disabled="isLoading"
          :auto-height="true"
          :show-confirm-bar="false"
        />
      </view>
      <view
        class="cp-send"
        :class="(!inputValue.trim() || isLoading) ? 'cp-send--disabled' : ''"
        @tap="handleSend"
      >
        <app-icon name="send" :size="32" color="#ffffff" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { classicsApi } from '@/lib/classics-data'
import { vipApi } from '@/lib/vip-data'
import { navigateTo } from '@/utils/router'
import { getToken } from '@/utils/storage'

interface CompanionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  disclaimer?: string
}

const chapterId = ref('')
const bookTitle = ref('')
const chapterTitle = ref('')
const guidingPrompts = ref<string[]>([])
const promptsLoading = ref(true)

const messages = ref<CompanionMessage[]>([])
const inputValue = ref('')
const isLoading = ref(false)
const scrollAnchor = ref('')

// —— AI 额度（书院会员权益①：会员不限量，免费用户每日限次）——
const quota = ref<{ isMember: boolean; dailyLimit: number; remaining: number } | null>(null)
const quotaExhausted = ref(false)

async function loadQuota() {
  if (!getToken()) return // 未登录不打扰，发送时才引导登录
  try {
    const q = await vipApi.getAiQuota()
    quota.value = { isMember: q.isMember, dailyLimit: q.dailyLimit, remaining: q.remaining }
    quotaExhausted.value = !q.isMember && q.remaining <= 0
  } catch {
    quota.value = null // 额度查询失败不影响对话主流程
  }
}

function goVip() { navigateTo('/vip') }

const headerSub = computed(() => {
  if (bookTitle.value && chapterTitle.value) return `《${bookTitle.value}》· ${chapterTitle.value}`
  if (bookTitle.value) return `《${bookTitle.value}》`
  return '内容由 AI 生成'
})

onLoad((q: Record<string, string> = {}) => {
  chapterId.value = q.chapterId ? String(q.chapterId) : ''
  if (q.bookTitle) bookTitle.value = decodeURIComponent(q.bookTitle)
  if (q.chapterTitle) chapterTitle.value = decodeURIComponent(q.chapterTitle)
  loadPrompts()
  loadQuota()
})

async function loadPrompts() {
  if (!chapterId.value) { promptsLoading.value = false; return }
  promptsLoading.value = true
  try {
    const r = await classicsApi.companionPrompts(chapterId.value)
    bookTitle.value = r.bookTitle || bookTitle.value
    chapterTitle.value = r.chapterTitle || chapterTitle.value
    guidingPrompts.value = Array.isArray(r.prompts) ? r.prompts : []
  } catch {
    guidingPrompts.value = []
  } finally {
    promptsLoading.value = false
  }
}

function goBack() {
  uni.navigateBack({ fail: () => uni.navigateTo({ url: '/pkg-classics/home/index' }) })
}

function clearChat() {
  if (!messages.value.length) return
  uni.showModal({
    title: '清空对话', content: '确定清空当前伴读对话吗？', confirmColor: '#C41E3A', success: (r) => { if (r.confirm) messages.value = [] },
  })
}

function scrollToBottom() {
  nextTick(() => { scrollAnchor.value = ''; nextTick(() => { scrollAnchor.value = 'cp-bottom' }) })
}

function ensureLogin(): boolean {
  if (getToken()) return true
  uni.showModal({
    title: '需要登录', content: '登录后即可与识典伴读对话', confirmText: '去登录',
    success: (r) => { if (r.confirm) uni.navigateTo({ url: '/pkg-auth/login/index' }) },
  })
  return false
}

function sendQuestion(q: string) {
  inputValue.value = q
  handleSend()
}

async function handleSend() {
  const text = inputValue.value.trim()
  if (!text || isLoading.value) return
  if (!chapterId.value) { uni.showToast({ title: '缺少章节信息', icon: 'none' }); return }
  if (!ensureLogin()) return

  // 发送前的对话作为多轮历史
  const history = messages.value.map((m) => ({ role: m.role, content: m.content }))

  messages.value.push({ id: Date.now().toString(), role: 'user', content: text })
  inputValue.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const r = await classicsApi.companionChat(chapterId.value, text, history)
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: r?.answer || '抱歉，我暂时无法回答，请换个角度再问问。',
      disclaimer: r?.disclaimer,
    })
    // 免费用户成功一次消耗一次额度，本地同步减
    if (quota.value && !quota.value.isMember) {
      quota.value = { ...quota.value, remaining: Math.max(0, quota.value.remaining - 1) }
      quotaExhausted.value = quota.value.remaining <= 0
    }
  } catch (e) {
    const msg = (e as Error)?.message || 'AI 暂时无法回答，请稍后重试。'
    // 后端限次错误（引导语含“书院会员”）→ 展示会员引导卡而非裸错误
    if (msg.includes('已用完') || msg.includes('书院会员')) {
      quotaExhausted.value = true
      if (quota.value) quota.value = { ...quota.value, remaining: 0 }
    }
    messages.value.push({ id: (Date.now() + 1).toString(), role: 'assistant', content: msg })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function copyMsg(content: string) {
  uni.setClipboardData({ data: content, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
}
</script>

<style scoped lang="scss">
.cp-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #faf8f5;
}

/* 顶部导航 */
.cp-header {
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
.cp-hd-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 9999rpx;
  background: rgba(240, 236, 229, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cp-hd-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  flex: 1;
}
.cp-hd-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #1a1a1a;
}
.cp-hd-sub {
  font-size: 20rpx;
  color: #999999;
  margin-top: 2rpx;
  max-width: 420rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* AI 额度提示条 */
.cp-quota {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 32rpx;
  background: rgba(201, 169, 110, 0.08);
  border-bottom: 2rpx solid rgba(201, 169, 110, 0.15);
}
.cp-quota-txt {
  flex: 1;
  font-size: 22rpx;
  color: #8a7a99;
}
.cp-quota-link {
  font-size: 22rpx;
  color: #C9A96E;
  font-weight: 500;
}

/* 额度用尽会员引导卡 */
.cp-upsell {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: rgba(201, 169, 110, 0.08);
  border: 2rpx solid rgba(201, 169, 110, 0.3);
}
.cp-upsell-body { flex: 1; min-width: 0; }
.cp-upsell-title { font-size: 28rpx; font-weight: 500; color: #1a1a1a; display: block; }
.cp-upsell-desc { font-size: 22rpx; color: #8A8478; line-height: 1.6; margin-top: 8rpx; display: block; }
.cp-upsell-btn { padding: 14rpx 28rpx; border-radius: 999rpx; background: #C9A96E; flex-shrink: 0; }
.cp-upsell-btn-txt { font-size: 24rpx; color: #FFFFFF; }

/* 消息区域 */
.cp-body {
  flex: 1;
  overflow: hidden;
}
.cp-empty,
.cp-msgs {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

/* 介绍卡 */
.cp-intro {
  background: rgba(107, 91, 122, 0.05);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(107, 91, 122, 0.2);
}
.cp-intro-head {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}
.cp-intro-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  display: block;
}
.cp-intro-desc {
  font-size: 22rpx;
  color: #999999;
  margin-top: 4rpx;
  display: block;
}
.cp-intro-tip {
  font-size: 28rpx;
  color: #999999;
  line-height: 1.6;
}

/* 引导问题 */
.cp-prompts-loading {
  padding: 24rpx;
  text-align: center;
}
.cp-prompts-loading-text {
  font-size: 26rpx;
  color: #999999;
}
.cp-qlist {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.cp-guide-q {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 2rpx solid rgba(107, 91, 122, 0.18);
}
.cp-guide-q-text {
  flex: 1;
  font-size: 28rpx;
  line-height: 1.5;
  color: #1a1a1a;
}

/* AI头像（紫檀渐变） */
.cp-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6b5b7a 0%, #8a7a99 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cp-avatar--lg {
  width: 80rpx;
  height: 80rpx;
}

/* 对话气泡 */
.cp-msg-row {
  display: flex;
  gap: 24rpx;
}
.cp-msg-row--user {
  justify-content: flex-end;
}
.cp-bubble-user {
  max-width: 85%;
  background: var(--brand);
  border-radius: 32rpx;
  border-top-right-radius: 8rpx;
  padding: 24rpx 32rpx;
}
.cp-bubble-user-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #ffffff;
}
.cp-assist-wrap {
  flex: 1;
  min-width: 0;
}
.cp-card {
  background: #ffffff;
  border-radius: 32rpx;
  border-top-left-radius: 8rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(235, 230, 223, 0.6);
}
.cp-card-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #1a1a1a;
  white-space: pre-wrap;
}
.cp-disclaimer {
  display: block;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid rgba(235, 230, 223, 0.6);
  font-size: 20rpx;
  line-height: 1.5;
  color: #b0a89c;
  white-space: pre-wrap;
}
.cp-card-ops {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  margin-left: 8rpx;
}
.cp-op {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 加载动画 */
.cp-loading {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.cp-dots {
  display: flex;
  gap: 8rpx;
}
.cp-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 9999rpx;
  background: #8a7a99;
  animation: cp-bounce 1.2s infinite ease-in-out;
}
.cp-dot:nth-child(2) { animation-delay: 0.15s; }
.cp-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes cp-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-12rpx); }
}
.cp-loading-text {
  font-size: 28rpx;
  color: #999999;
}
.cp-bottom-anchor {
  height: 2rpx;
}

/* 底部输入栏 */
.cp-input-bar {
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
.cp-input-wrap {
  flex: 1;
  position: relative;
}
.cp-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 84rpx;
  max-height: 256rpx;
  border-radius: 32rpx;
  background: rgba(240, 236, 229, 0.5);
  border: 2rpx solid rgba(235, 230, 223, 0.6);
  padding: 20rpx 32rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.cp-textarea-ph {
  color: #999999;
}
.cp-send {
  width: 80rpx;
  height: 80rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6b5b7a 0%, #8a7a99 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cp-send--disabled {
  opacity: 0.5;
}
</style>
