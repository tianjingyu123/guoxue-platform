<template>
  <view v-if="isOpen" class="ai-modal-mask" role="dialog" aria-modal="true" aria-label="AI 智能搜索" @click.self="onClose" @touchmove.self.prevent>
    <view class="ai-modal-card" tabindex="-1" @touchmove.stop>
      <!-- 头部 -->
      <view class="ai-modal-header">
        <view class="ai-avatar">
          <app-icon name="sparkles" :size="40" color="#ffffff" />
        </view>
        <view class="ai-header-text">
          <text class="ai-title">AI智能搜索</text>
          <text class="ai-subtitle">问清楚，再找到值得看的内容</text>
        </view>
        <view
          class="ai-close-btn"
          role="button"
          aria-label="关闭 AI 智能搜索"
          tabindex="0"
          @click="onClose"
          @keydown="activateOnKeyboard($event, onClose)"
        >
          <app-icon name="x" :size="40" color="var(--text-soft)" />
        </view>
      </view>

      <!-- 搜索输入区 -->
      <view class="ai-input-section">
        <view class="ai-input-wrap">
          <app-icon name="search" :size="32" color="var(--text-soft)" />
          <input
            class="ai-input"
            v-model="query"
            :placeholder="placeholder"
            placeholder-class="ai-input-ph"
            confirm-type="search"
            :maxlength="200"
            @confirm="handleSearch"
          />
          <view
            class="ai-send-btn"
            :class="{ 'ai-send-btn--active': query.trim() }"
            role="button"
            aria-label="发送搜索问题"
            :aria-disabled="!query.trim() || isSearching"
            :tabindex="query.trim() && !isSearching ? 0 : -1"
            @click="handleSearch"
            @keydown="activateOnKeyboard($event, handleSearch)"
          >
            <app-icon :name="isSearching ? 'loader-2' : 'send'" :size="28" :color="query.trim() ? '#ffffff' : 'var(--text-soft)'" :class="{ 'ai-spin': isSearching }" />
          </view>
        </view>

        <!-- 快捷提问 -->
        <view v-if="!response && !isSearching" class="ai-quick-list">
          <view
            v-for="q in quickQuestions"
            :key="q"
            class="ai-quick-item"
            role="button"
            :aria-label="`快捷提问：${q}`"
            tabindex="0"
            @click="askQuick(q)"
            @keydown="activateOnKeyboard($event, () => askQuick(q))"
          >
            <text class="ai-quick-text">{{ q }}</text>
          </view>
        </view>
      </view>

      <!-- AI回答区 -->
      <scroll-view v-if="response || cards.length || isSearching" scroll-y class="ai-answer-section">
        <view class="ai-answer-row">
          <view class="ai-answer-avatar">
            <app-icon name="bot" :size="32" color="#ffffff" />
          </view>
          <view class="ai-answer-body">
            <text v-if="isSearching" class="ai-answer-text">正在整理回答与相关内容…</text>
            <text v-else class="ai-answer-text">{{ response }}</text>
          </view>
        </view>
        <view v-if="cards.length" class="ai-results">
          <text class="ai-results-label">在热卜继续了解</text>
          <view
            v-for="card in cards"
            :key="`${card.type}:${card.id}`"
            class="ai-result-item"
            role="button"
            tabindex="0"
            :aria-label="`打开${card.title}`"
            @click="openCard(card)"
            @keydown="activateOnKeyboard($event, () => openCard(card))"
          >
            <image v-if="card.cover" class="ai-result-cover" :src="card.cover" mode="aspectFill" lazy-load />
            <view v-else class="ai-result-badge" :class="`ai-result-badge--${card.type}`">{{ cardLabel(card.type) }}</view>
            <view class="ai-result-info">
              <text class="ai-result-type">{{ cardLabel(card.type) }}</text>
              <text class="ai-result-title">{{ card.title }}</text>
              <text v-if="card.subtitle" class="ai-result-desc">{{ card.subtitle }}</text>
              <text v-if="card.price && card.price > 0" class="ai-result-price">¥{{ card.price }} · 以详情页为准</text>
            </view>
            <text class="ai-result-arrow">›</text>
          </view>
        </view>
        <view
          v-if="loginRequired && !isSearching"
          class="ai-login-action"
          role="button"
          tabindex="0"
          @click="openLogin"
          @keydown="activateOnKeyboard($event, openLogin)"
        >登录后问小卜</view>
      </scroll-view>

      <!-- 底部提示 -->
      <view class="ai-modal-footer">
        <text class="ai-footer-text">AI 生成回答；内容卡片来自{{ BRAND.name }}已发布内容</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import { aiSearchApi, type AiGuideCard, type AiGuideCardType } from '@/lib/ai-search-data'
import { BRAND } from '@/lib/brand'
import { navigateTo } from '@/utils/router'
import { track } from '@/composables/useTrack'

const props = defineProps<{
  isOpen: boolean
  placeholder?: string
  context?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

useOverlayScrollLock(
  () => props.isOpen,
  {
    onEscape: onClose,
    focusContainerSelector: '.ai-modal-card',
    initialFocusSelector: '.ai-modal-card .ai-input',
  },
)

const placeholder = props.placeholder || '问我任何问题...'
const quickQuestions = ['八字如何入门', '紫微斗数准吗', '如何看风水']

const query = ref('')
const isSearching = ref(false)
const response = ref('')
const cards = ref<AiGuideCard[]>([])
const loginRequired = ref(false)
let requestVersion = 0

const CARD_LABELS: Record<AiGuideCardType, string> = {
  classic: '古籍', article: '文章', course: '课程', circle: '圈子', content: '内容',
}
function cardLabel(type: AiGuideCardType) { return CARD_LABELS[type] }

watch(() => props.isOpen, (open) => {
  if (!open) {
    requestVersion++
    isSearching.value = false
    response.value = ''
    cards.value = []
    loginRequired.value = false
  }
})

function onClose() {
  requestVersion++
  isSearching.value = false
  response.value = ''
  cards.value = []
  loginRequired.value = false
  emit('close')
}

function openLogin() {
  onClose()
  navigateTo('/login')
}

function openCard(card: AiGuideCard) {
  if (!/^\/(pkg-classics\/detail\/index|pkg-circle\/(articles|circles)\/detail|pkg-course\/detail\/index)\?id=[^&#]+$/.test(card.target)) return
  track.custom('ai_search_content_open', { type: card.type, id: card.id })
  onClose()
  navigateTo(card.target)
}

function askQuick(q: string) {
  query.value = q
  handleSearch()
}

function activateOnKeyboard(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  void action()
}

async function handleSearch() {
  const q = query.value.trim()
  if (!q || isSearching.value) return
  const version = ++requestVersion
  isSearching.value = true
  response.value = ''
  cards.value = []
  loginRequired.value = false
  try {
    const res = await aiSearchApi.query(q)
    if (version !== requestVersion) return
    response.value = res.answer || '未获取到回答，请换个问法试试'
    cards.value = res.cards || []
    track.custom('ai_search_completed', { hasAnswer: Boolean(res.answer), cardCount: cards.value.length })
  } catch (error) {
    if (version !== requestVersion) return
    loginRequired.value = /未登录|登录已过期/.test((error as Error)?.message || '')
    response.value = loginRequired.value ? '登录后可以获得 AI 解答，先看看相关内容。' : '暂时没连上小卜，请稍后再试。'
    try {
      const guided = await aiSearchApi.guide(q)
      if (version !== requestVersion) return
      cards.value = guided.cards || []
      if (cards.value.length && !loginRequired.value) response.value = '回答暂时不可用，先看看找到的相关内容。'
      track.custom('ai_search_fallback', { cardCount: cards.value.length })
    } catch {
      track.custom('ai_search_failed', {})
    }
  } finally {
    if (version === requestVersion) isSearching.value = false
  }
}
</script>

<style scoped>
.ai-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 160rpx;
  background: rgba(0, 0, 0, 0.6);
}
.ai-modal-card {
  width: 90%;
  max-width: 680rpx;
  max-height: 70vh;
  overflow: hidden;
  background: var(--card);
  border-radius: 24rpx;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}
.ai-modal-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.ai-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--gold));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.ai-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}
.ai-subtitle {
  font-size: 25rpx;
  color: var(--text-soft);
}
.ai-close-btn {
  padding: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.ai-input-section {
  padding: 32rpx;
  border-bottom: 1rpx solid var(--line);
}
.ai-input-wrap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 32rpx;
  border-radius: 999rpx;
  background: var(--secondary);
}
.ai-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-main);
  background: transparent;
}
.ai-input-ph {
  color: var(--text-soft);
}
.ai-send-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--muted);
  flex-shrink: 0;
}
.ai-send-btn--active {
  background: var(--primary);
}
.ai-spin {
  animation: ai-rotate 1s linear infinite;
}
@keyframes ai-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.ai-quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}
.ai-quick-item {
  padding: 12rpx 24rpx;
  background: rgba(127, 127, 127, 0.12);
  border-radius: 999rpx;
}
.ai-quick-item:focus-visible, .ai-result-item:focus-visible {
  outline: 3rpx solid var(--primary);
  outline-offset: 3rpx;
}
.ai-quick-text {
  font-size: 26rpx;
  color: var(--text-main);
}
.ai-answer-section {
  padding: 32rpx;
  max-height: 640rpx;
}
.ai-answer-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}
.ai-answer-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--gold));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-answer-body {
  flex: 1;
  min-width: 0;
}
.ai-answer-text {
  font-size: 31rpx;
  line-height: 1.75;
  color: var(--text-main);
  white-space: pre-wrap;
}
.ai-results {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ai-results-label {
  font-size: 29rpx;
  font-weight: 700;
  color: var(--text-main);
}
.ai-result-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: var(--secondary);
}
.ai-result-badge {
  font-size: 25rpx;
  padding: 10rpx 14rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.ai-result-badge--classic { color: #775634; background: #f1e8d8; }
.ai-result-badge--article, .ai-result-badge--content { color: #35536f; background: #e6edf3; }
.ai-result-badge--course { color: #845331; background: #f3e7dc; }
.ai-result-badge--circle { color: #39755f; background: #e4f0e9; }
.ai-result-cover { width: 72rpx; height: 72rpx; border-radius: 10rpx; flex-shrink: 0; }
.ai-result-arrow { color: var(--text-soft); font-size: 36rpx; }
.ai-login-action { margin-top: 24rpx; padding: 20rpx 28rpx; border-radius: 12rpx; background: var(--primary); color: #fff; text-align: center; font-size: 28rpx; }
.ai-result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.ai-result-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.4;
  white-space: normal;
  overflow-wrap: anywhere;
}
.ai-result-type { font-size: 24rpx; color: var(--text-soft); }
.ai-result-price { font-size: 24rpx; color: #845331; }
.ai-result-desc {
  font-size: 26rpx;
  line-height: 1.5;
  color: var(--text-soft);
}
.ai-modal-footer {
  padding: 24rpx 32rpx;
  background: rgba(127, 127, 127, 0.06);
  border-top: 1rpx solid var(--line);
}
.ai-footer-text {
  font-size: 23rpx;
  color: var(--text-soft);
  text-align: center;
  display: block;
}
</style>
