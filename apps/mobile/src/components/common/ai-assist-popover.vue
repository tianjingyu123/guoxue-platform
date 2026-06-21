<template>
  <view class="aip-wrap">
    <!-- 触发按钮：鎏金星芒 -->
    <view class="aip-trigger" @tap="toggle">
      <app-icon name="sparkles" :size="28" color="#8a6d2f" />
      <text class="aip-trigger-text">AI 辅助</text>
    </view>

    <view v-if="open">
      <!-- 轻量蒙层 -->
      <view class="aip-mask" @tap="open = false" />
      <!-- 面板（向上弹出） -->
      <view class="aip-panel">
        <!-- 头部 -->
        <view class="aip-head">
          <view class="aip-head-left">
            <view class="aip-logo">
              <app-icon name="sparkles" :size="28" color="#ffffff" />
            </view>
            <text class="aip-title">国学小助</text>
          </view>
          <view class="aip-close" @tap="open = false">
            <app-icon name="x" :size="32" color="#999999" />
          </view>
        </view>

        <!-- 无文字提示 -->
        <view v-if="!hasText" class="aip-empty">
          <text>先写几个字，我来帮你润色、提炼或雅化～</text>
        </view>

        <!-- 能力选择 -->
        <view v-if="hasText && candidates.length === 0 && !loading" class="aip-caps">
          <view
            v-for="cap in capabilities"
            :key="cap.action"
            class="aip-cap"
            @tap="run(cap.action)"
          >
            <view class="aip-cap-label">
              <app-icon :name="actionIcon(cap.action)" :size="28" color="#8a6d2f" />
              <text class="aip-cap-label-text">{{ cap.label }}</text>
            </view>
            <text class="aip-cap-hint">{{ cap.hint }}</text>
          </view>
        </view>

        <!-- 加载中 -->
        <view v-if="loading" class="aip-loading">
          <app-icon name="loader-2" :size="32" color="#c9a96e" class="aip-spin" />
          <text>正在为你{{ loadingLabel }}…</text>
        </view>

        <!-- 结果候选 -->
        <view v-if="candidates.length > 0 && !loading" class="aip-results">
          <view v-for="(c, i) in candidates" :key="i" class="aip-result">
            <text class="aip-result-text">{{ c }}</text>
            <view class="aip-adopt" @tap="apply(c)">
              <app-icon name="check" :size="24" color="#ffffff" />
              <text class="aip-adopt-text">采用</text>
            </view>
          </view>
          <view class="aip-again" @tap="activeAction && run(activeAction)">
            <app-icon name="rotate-ccw" :size="24" color="#999999" />
            <text class="aip-again-text">换一个</text>
          </view>
        </view>

        <text class="aip-disclaimer">内容由 AI 生成，仅供参考</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  SCENE_CAPABILITIES,
  runAIAssist,
  type AIAssistAction,
  type AIAssistScene,
} from '@/lib/ai-assist'

const props = defineProps<{
  scene: AIAssistScene
  text: string
}>()

const emit = defineEmits<{
  (e: 'apply', result: string): void
}>()

const open = ref(false)
const loading = ref<AIAssistAction | null>(null)
const candidates = ref<string[]>([])
const activeAction = ref<AIAssistAction | null>(null)

const capabilities = computed(() => SCENE_CAPABILITIES[props.scene])
const hasText = computed(() => props.text.trim().length > 0)
const loadingLabel = computed(
  () => capabilities.value.find((c) => c.action === loading.value)?.label || '',
)

const ACTION_ICON: Record<AIAssistAction, string> = {
  polish: 'wand-2',
  summarize: 'scroll-text',
  continue: 'pen-line',
  title: 'heading',
  expand: 'text-quote',
  classical: 'feather',
}
function actionIcon(a: AIAssistAction) {
  return ACTION_ICON[a]
}

function toggle() {
  open.value = !open.value
}

async function run(action: AIAssistAction) {
  if (!hasText.value) return
  loading.value = action
  activeAction.value = action
  candidates.value = []
  const res = await runAIAssist({ action, input: props.text, scene: props.scene })
  candidates.value = res.candidates
  loading.value = null
}

function apply(c: string) {
  emit('apply', c)
  open.value = false
  candidates.value = []
  activeAction.value = null
}
</script>

<style scoped>
.aip-wrap {
  position: relative;
}
.aip-trigger {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(201, 169, 110, 0.12);
}
.aip-trigger-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #8a6d2f;
}
.aip-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.aip-panel {
  position: absolute;
  bottom: 100%;
  right: 0;
  z-index: 50;
  margin-bottom: 16rpx;
  width: 560rpx;
  border-radius: 32rpx;
  border: 2rpx solid var(--border);
  background: var(--card);
  padding: 24rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.18);
}
.aip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.aip-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.aip-logo {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #c9a96e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.aip-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--foreground);
}
.aip-close {
  padding: 4rpx;
}
.aip-empty {
  border-radius: 16rpx;
  background: var(--muted);
  padding: 16rpx 24rpx;
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.aip-caps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.aip-cap {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  border-radius: 20rpx;
  border: 2rpx solid var(--border);
  background: var(--background);
  padding: 20rpx 24rpx;
}
.aip-cap-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.aip-cap-label-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--foreground);
}
.aip-cap-hint {
  font-size: 22rpx;
  color: var(--muted-foreground);
}
.aip-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 48rpx 0;
  font-size: 26rpx;
  color: var(--muted-foreground);
}
.aip-spin {
  animation: aip-rotate 1s linear infinite;
}
@keyframes aip-rotate {
  to {
    transform: rotate(360deg);
  }
}
.aip-results {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.aip-result {
  border-radius: 20rpx;
  border: 2rpx solid var(--border);
  background: var(--background);
  padding: 20rpx;
}
.aip-result-text {
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--foreground);
}
.aip-adopt {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #c9a96e;
}
.aip-adopt-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #ffffff;
}
.aip-again {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 12rpx 0;
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.aip-again-text {
  font-size: 24rpx;
  color: var(--muted-foreground);
}
.aip-disclaimer {
  display: block;
  margin-top: 20rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--muted-foreground);
}
</style>
