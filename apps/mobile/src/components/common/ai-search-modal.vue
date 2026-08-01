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
          <text class="ai-subtitle">基于国学知识库的智能问答</text>
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
        <view v-if="!response" class="ai-quick-list">
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
      <scroll-view v-if="response" scroll-y class="ai-answer-section">
        <view class="ai-answer-row">
          <view class="ai-answer-avatar">
            <app-icon name="bot" :size="32" color="#ffffff" />
          </view>
          <view class="ai-answer-body">
            <text class="ai-answer-text">{{ response }}</text>

          </view>
        </view>
      </scroll-view>

      <!-- 底部提示 -->
      <view class="ai-modal-footer">
        <text class="ai-footer-text">AI回答基于{{ BRAND.name }}知识库生成，仅供参考</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { useOverlayScrollLock } from '@/composables/use-overlay-scroll-lock'
import { aiSearchApi } from '@/lib/ai-search-data'
import { BRAND } from '@/lib/brand'

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

function onClose() {
  emit('close')
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
  isSearching.value = true
  response.value = ''
  try {
    const res = await aiSearchApi.query(q)
    response.value = res.answer || '未获取到回答，请换个问法试试'
  } catch (e) {
    response.value = (e as Error)?.message || 'AI 搜索失败，请稍后重试'
  } finally {
    isSearching.value = false
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
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-main);
}
.ai-subtitle {
  font-size: 22rpx;
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
.ai-quick-text {
  font-size: 22rpx;
  color: var(--text-soft);
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
  font-size: 28rpx;
  line-height: 1.6;
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
  font-size: 22rpx;
  color: var(--text-soft);
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
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.ai-result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.ai-result-title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-result-desc {
  font-size: 22rpx;
  color: var(--text-soft);
}
.ai-modal-footer {
  padding: 24rpx 32rpx;
  background: rgba(127, 127, 127, 0.06);
  border-top: 1rpx solid var(--line);
}
.ai-footer-text {
  font-size: 20rpx;
  color: var(--text-soft);
  text-align: center;
  display: block;
}
</style>
