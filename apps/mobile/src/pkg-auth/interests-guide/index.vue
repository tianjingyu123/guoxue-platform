<template>
  <view class="ig-page">
    <!-- 顶部装饰背景 -->
    <view class="ig-deco">
      <view class="ig-deco-gradient" />
      <text
        v-for="(sym, i) in DECO_SYMBOLS"
        :key="i"
        class="ig-deco-sym"
        :style="{
          fontSize: (20 + i * 8) + 'rpx',
          left: (10 + i * 20) + '%',
          top: (10 + (i % 2) * 20) + 'rpx',
          transform: 'rotate(' + (i * 15) + 'deg)',
        }"
      >
        {{ sym }}
      </text>
    </view>

    <!-- 头部 -->
    <view class="ig-header">
      <!-- 步骤指示器 -->
      <view class="ig-steps">
        <view
          v-for="i in 2"
          :key="i"
          class="ig-step-dot"
          :class="{ 'is-current': i === 1, 'is-done': i < 1 }"
        />
        <text class="ig-step-text">
          1/2
        </text>
      </view>

      <!-- AI推荐角标 -->
      <view class="ig-ai-badge">
        <AppIcon
          name="sparkles"
          :size="28"
          color="#C41E3A"
        />
        <text class="ig-ai-text">
          AI 个性化推荐
        </text>
      </view>

      <view class="ig-title">
        <text>选择你感兴趣的</text>
        <text class="ig-title-accent">
          领域
        </text>
      </view>
      <view class="ig-sub">
        <text>已选 </text>
        <text class="ig-sub-num">
          {{ selected.length }}
        </text>
        <text>/{{ MAX_SELECT }} 个</text>
        <text
          v-if="remaining > 0"
          class="ig-sub-remain"
        >
          · 还需选择 {{ remaining }} 个
        </text>
      </view>
    </view>

    <!-- 标签网格 -->
    <scroll-view
      scroll-y
      class="ig-grid-wrap"
    >
      <view
        v-if="loading"
        class="ig-grid"
      >
        <view
          v-for="i in 16"
          :key="i"
          class="ig-skeleton"
          :style="{ width: (60 + (i % 4) * 16) + 'rpx' }"
        />
      </view>
      <view
        v-else
        class="ig-grid"
      >
        <view
          v-for="tag in tags"
          :key="tag.id"
          class="ig-chip"
          :class="{
            'is-selected': isSelected(tag.id),
            'is-disabled': !isSelected(tag.id) && selected.length >= MAX_SELECT,
          }"
          @tap="toggleTag(tag.id)"
        >
          <text class="ig-chip-icon">
            {{ tag.icon }}
          </text>
          <text
            class="ig-chip-name"
            :class="{ 'is-selected': isSelected(tag.id) }"
          >
            {{ tag.name }}
          </text>
          <view
            v-if="isSelected(tag.id)"
            class="ig-chip-check"
          >
            <AppIcon
              name="check"
              :size="20"
              color="#FFFFFF"
            />
          </view>
        </view>
      </view>

      <text
        v-if="selected.length >= MAX_SELECT"
        class="ig-max-tip"
      >
        已达最多选择数量（{{ MAX_SELECT }}个），可取消已选标签来更换
      </text>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="ig-footer">
      <!-- 已选标签预览 -->
      <view
        v-if="selected.length > 0"
        class="ig-preview"
      >
        <text
          v-for="id in selected"
          :key="id"
          class="ig-preview-chip"
        >
          {{ tagById(id) ? (tagById(id)?.icon + ' ' + tagById(id)?.name) : '' }}
        </text>
      </view>

      <!-- 开始探索按钮 -->
      <view
        class="ig-submit"
        :class="{ 'is-active': selected.length >= MIN_SELECT, 'is-shake': shakeBtn }"
        @tap="handleSubmit"
      >
        <view
          v-if="submitting"
          class="ig-spinner"
        />
        <template v-else>
          <text class="ig-submit-text">
            开始探索
          </text>
          <AppIcon
            name="arrow-right"
            :size="36"
            :color="selected.length >= MIN_SELECT ? '#FFFFFF' : '#B0AAA0'"
          />
        </template>
      </view>

      <text
        v-if="selected.length < MIN_SELECT"
        class="ig-submit-tip"
      >
        至少选择 {{ MIN_SELECT }} 个领域才能继续
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { reLaunch } from '@/utils/router'

interface InterestTag {
  id: string
  name: string
  category: string
  icon: string
}

const DECO_SYMBOLS = ['☯', '☷', '☵', '☳', '☴']
const MIN_SELECT = 3
const MAX_SELECT = 8

const FALLBACK_TAGS: InterestTag[] = [
  { id: '1', name: '八字命理', category: '命理', icon: '🔮' },
  { id: '2', name: '紫微斗数', category: '命理', icon: '⭐' },
  { id: '3', name: '六爻占卜', category: '命理', icon: '☯' },
  { id: '4', name: '风水堪舆', category: '风水', icon: '🏠' },
  { id: '5', name: '奇门遁甲', category: '命理', icon: '🧭' },
  { id: '6', name: '周易易经', category: '经典', icon: '📖' },
  { id: '7', name: '诗词歌赋', category: '诗词', icon: '🖋' },
  { id: '8', name: '唐诗宋词', category: '诗词', icon: '📜' },
  { id: '9', name: '中医养生', category: '养生', icon: '🌿' },
  { id: '10', name: '太极武术', category: '武术', icon: '🥋' },
  { id: '11', name: '茶道文化', category: '茶道', icon: '🍵' },
  { id: '12', name: '书法艺术', category: '书法', icon: '✍️' },
  { id: '13', name: '国画丹青', category: '国画', icon: '🎨' },
  { id: '14', name: '古典音乐', category: '音乐', icon: '🎵' },
  { id: '15', name: '中华历史', category: '历史', icon: '🏛' },
  { id: '16', name: '道家文化', category: '经典', icon: '☯' },
  { id: '17', name: '儒家经典', category: '经典', icon: '📚' },
  { id: '18', name: '佛学禅意', category: '经典', icon: '🪷' },
  { id: '19', name: '节气民俗', category: '民俗', icon: '🎑' },
  { id: '20', name: '琴棋书画', category: '艺术', icon: '♟' },
  { id: '21', name: '花鸟虫鱼', category: '自然', icon: '🌸' },
  { id: '22', name: '篆刻印章', category: '书法', icon: '🔖' },
  { id: '23', name: '器物收藏', category: '收藏', icon: '🏺' },
  { id: '24', name: '占星星座', category: '命理', icon: '🌙' },
]

const tags = ref<InterestTag[]>([])
const selected = ref<string[]>([])
const loading = ref(true)
const submitting = ref(false)
const shakeBtn = ref(false)

const remaining = computed(() => MIN_SELECT - selected.value.length)

function isSelected(id: string) {
  return selected.value.includes(id)
}
function tagById(id: string) {
  return tags.value.find((t) => t.id === id)
}

function toggleTag(id: string) {
  if (isSelected(id)) {
    selected.value = selected.value.filter((x) => x !== id)
  } else {
    if (selected.value.length >= MAX_SELECT) return
    selected.value = [...selected.value, id]
  }
}

function handleSubmit() {
  if (submitting.value) return
  if (selected.value.length < MIN_SELECT) {
    shakeBtn.value = true
    setTimeout(() => { shakeBtn.value = false }, 600)
    return
  }
  submitting.value = true
  // 原型 recommendApi.setInterests 走 mock，失败不阻断
  setTimeout(() => {
    submitting.value = false
    reLaunch('/pages/index/index')
  }, 800)
}

onMounted(() => {
  // 原型 recommendApi.defaultInterests 走 mock 兜底
  setTimeout(() => {
    tags.value = FALLBACK_TAGS
    loading.value = false
  }, 300)
})
</script>

<style scoped>
.ig-page {
  min-height: 100vh;
  background: #faf8f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* 顶部装饰 */
.ig-deco {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 512rpx;
  overflow: hidden;
  pointer-events: none;
}
.ig-deco-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.08), rgba(201, 169, 110, 0.05), transparent);
}
.ig-deco-sym {
  position: absolute;
  color: rgba(196, 30, 58, 0.1);
  font-family: serif;
}

/* 头部 */
.ig-header {
  position: relative;
  z-index: 10;
  padding: 112rpx 48rpx 32rpx;
}
.ig-steps {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
  margin-bottom: 48rpx;
}
.ig-step-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: #e8e0d5;
  transition: all 0.3s;
}
.ig-step-dot.is-current {
  width: 40rpx;
  height: 16rpx;
  background: #c41e3a;
}
.ig-step-dot.is-done {
  background: rgba(196, 30, 58, 0.6);
}
.ig-step-text {
  font-size: 24rpx;
  color: #999999;
  margin-left: 8rpx;
}
.ig-ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
  margin-bottom: 24rpx;
}
.ig-ai-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #c41e3a;
}
.ig-title {
  font-family: serif;
  font-size: 52rpx;
  font-weight: bold;
  color: #2c2c2c;
  line-height: 1.2;
  margin-bottom: 16rpx;
  display: flex;
  flex-direction: column;
}
.ig-title-accent {
  color: #c41e3a;
}
.ig-sub {
  font-size: 26rpx;
  color: #999999;
}
.ig-sub-num {
  color: #c41e3a;
  font-weight: bold;
}
.ig-sub-remain {
  margin-left: 8rpx;
  color: #c9a96e;
}

/* 标签网格 */
.ig-grid-wrap {
  flex: 1;
  padding: 0 40rpx 32rpx;
  box-sizing: border-box;
}
.ig-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.ig-skeleton {
  height: 72rpx;
  border-radius: 999rpx;
  background: #f2efea;
}
.ig-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  border: 2rpx solid #e8e0d5;
  background: #ffffff;
  transition: all 0.2s;
}
.ig-chip.is-selected {
  background: #c41e3a;
  border-color: #c41e3a;
  box-shadow: 0 4rpx 24rpx rgba(196, 30, 58, 0.3);
}
.ig-chip.is-disabled {
  background: rgba(255, 255, 255, 0.5);
  opacity: 0.5;
}
.ig-chip-icon {
  font-size: 32rpx;
  line-height: 1;
}
.ig-chip-name {
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1;
  color: #2c2c2c;
}
.ig-chip-name.is-selected {
  color: #ffffff;
}
.ig-chip-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.25);
}
.ig-max-tip {
  display: block;
  margin-top: 32rpx;
  text-align: center;
  font-size: 24rpx;
  color: #c9a96e;
}

/* 底部 */
.ig-footer {
  padding: 24rpx 40rpx 80rpx;
  background: linear-gradient(to top, #faf8f5, transparent);
}
.ig-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 32rpx;
  min-height: 56rpx;
}
.ig-preview-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(196, 30, 58, 0.1);
  font-size: 22rpx;
  color: #c41e3a;
  font-weight: 500;
}
.ig-submit {
  width: 100%;
  height: 104rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  background: #e8e3db;
  transition: all 0.2s;
}
.ig-submit.is-active {
  background: linear-gradient(to right, #c41e3a, #e8314e);
  box-shadow: 0 8rpx 40rpx rgba(196, 30, 58, 0.35);
}
.ig-submit.is-shake {
  animation: ig-shake 0.5s ease-in-out;
}
.ig-submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: v-bind('selected.length >= MIN_SELECT ? "#FFFFFF" : "#B0AAA0"');
}
.ig-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 999rpx;
  animation: ig-spin 0.8s linear infinite;
}
.ig-submit-tip {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #bbbbbb;
  margin-top: 20rpx;
}

@keyframes ig-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-12rpx); }
  40% { transform: translateX(12rpx); }
  60% { transform: translateX(-8rpx); }
  80% { transform: translateX(8rpx); }
}
@keyframes ig-spin {
  to { transform: rotate(360deg); }
}
</style>
