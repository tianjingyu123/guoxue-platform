<script setup lang="ts">
/**
 * 首页智能体卡：轻量星盘终端。
 * 上部只承担智能体识别，下部回到白底内容区，与文章、课程等卡片保持同一阅读节奏。
 * 动效仅使用 transform / opacity / background-position，兼容 H5、X5 与小程序。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { type FeedEnvelope, payloadStr, agentTheme } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const theme = computed(() => agentTheme(props.item))
const name = computed(() => props.item.title || props.item.author?.name || 'AI 学友')
const intro = computed(() => props.item.subtitle || payloadStr(props.item, 'question') || '随时为你解答国学问题')
const category = computed(() => payloadStr(props.item, 'category') || '国学智能体')
const cardStyle = computed(() => ({
  '--agent-accent': theme.value.accent,
  '--agent-ink': theme.value.iconStroke,
}))
</script>

<template>
  <view class="fcard agent" :style="cardStyle">
    <view class="cov">
      <view class="grad" :style="{ background: theme.gradient }" />
      <view class="tech-grid" />
      <view class="tech-scan" />
      <view class="ai-badge">
        <view class="ai-dot" />
        <text class="ai-badge-text">AI AGENT</text>
      </view>

      <view class="agent-core">
        <view class="core-pulse" />
        <view class="orbit orbit-outer">
          <view class="orbit-node node-a" />
          <view class="orbit-node node-b" />
        </view>
        <view class="orbit orbit-inner">
          <view class="orbit-node node-c" />
        </view>
        <view class="core-shell">
          <app-icon :name="theme.icon" :size="46" :color="theme.iconStroke" />
        </view>
      </view>

      <view class="signal">
        <view class="signal-line" />
        <text class="signal-text">智能推演</text>
      </view>
    </view>

    <view class="body">
      <view class="title-row">
        <text class="title">{{ name }}</text>
        <text class="type-chip">{{ category }}</text>
      </view>
      <text class="intro">{{ intro }}</text>
      <view class="meta">
        <view class="ready">
          <view class="ready-dot" />
          <text class="ready-text">随时可用</text>
        </view>
        <view class="hook">
          <text class="hook-text">开始对话</text>
          <app-icon name="arrow-up-right" :size="22" :color="theme.iconStroke" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard {
  overflow: hidden;
  background: #ffffff;
  border: 1rpx solid rgba(95, 111, 160, 0.12);
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(55, 68, 105, 0.08);
}
.cov {
  position: relative;
  width: 100%;
  padding-top: 104%;
  overflow: hidden;
}
.grad {
  position: absolute;
  inset: 0;
  background-size: 180% 180% !important;
  animation: grad-flow 9s ease-in-out infinite alternate;
}
.tech-grid {
  position: absolute;
  inset: 0;
  opacity: 0.42;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.1) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1rpx, transparent 1rpx),
    radial-gradient(circle at 78% 20%, rgba(255, 255, 255, 0.24) 0, transparent 34%);
  background-size: 34rpx 34rpx, 34rpx 34rpx, 100% 100%;
}
.tech-scan {
  position: absolute;
  top: -22%;
  right: 0;
  left: 0;
  z-index: 1;
  height: 22%;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,.18), transparent);
  animation: agent-scan 5.6s ease-in-out infinite;
}
.ai-badge {
  position: absolute;
  top: 18rpx;
  left: 18rpx;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 12rpx;
  border: 1rpx solid rgba(92, 110, 159, 0.2);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
}
.ai-dot,
.ready-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: var(--agent-accent);
  box-shadow: 0 0 0 5rpx rgba(112, 126, 190, 0.12);
  animation: agent-dot 2.6s ease-in-out infinite;
}
.ai-badge-text {
  font-family: Arial, sans-serif;
  font-size: 18rpx;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 1.5rpx;
  color: var(--agent-ink);
}
.agent-core {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 190rpx;
  height: 190rpx;
  transform: translate(-50%, -50%);
}
.core-pulse {
  position: absolute;
  inset: 24rpx;
  border: 1rpx solid rgba(108, 125, 190, .28);
  border-radius: 999rpx;
  animation: core-pulse 3.2s ease-out infinite;
}
.orbit {
  position: absolute;
  border: 1rpx solid rgba(105, 120, 183, 0.38);
  border-radius: 999rpx;
}
.orbit-outer {
  inset: 0;
  animation: orbit-turn 18s linear infinite;
}
.orbit-inner {
  inset: 28rpx;
  border-style: dashed;
  animation: orbit-turn 12s linear infinite reverse;
}
.orbit::before,
.orbit::after {
  position: absolute;
  content: '';
  background: rgba(105, 120, 183, 0.22);
}
.orbit::before {
  top: 50%;
  left: -14rpx;
  right: -14rpx;
  height: 1rpx;
}
.orbit::after {
  top: -14rpx;
  bottom: -14rpx;
  left: 50%;
  width: 1rpx;
}
.orbit-node {
  position: absolute;
  z-index: 2;
  width: 10rpx;
  height: 10rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.88);
  border-radius: 999rpx;
  background: var(--agent-accent);
  box-shadow: 0 2rpx 8rpx rgba(76, 91, 136, 0.2);
}
.node-a { top: 12rpx; right: 34rpx; }
.node-b { bottom: 18rpx; left: 22rpx; }
.node-c { top: 4rpx; left: 24rpx; }
.core-shell {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  width: 90rpx;
  height: 90rpx;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    inset 0 0 0 1rpx rgba(96, 113, 163, 0.08),
    0 12rpx 32rpx rgba(70, 83, 125, 0.12);
}
.signal {
  position: absolute;
  right: 18rpx;
  bottom: 16rpx;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.signal-line {
  width: 28rpx;
  height: 2rpx;
  background: rgba(255,255,255,.78);
}
.signal-text {
  font-size: 18rpx;
  letter-spacing: 1rpx;
  color: rgba(255,255,255,.88);
}
.body {
  min-height: 174rpx;
  box-sizing: border-box;
  padding: 20rpx 20rpx 22rpx;
  border-top: 1rpx solid rgba(94, 109, 153, 0.1);
  background: linear-gradient(180deg, #ffffff, #fbfcff);
}
.title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}
.title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  line-height: 1.4;
  font-weight: 700;
  color: #273047;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.type-chip {
  flex-shrink: 0;
  max-width: 112rpx;
  padding: 3rpx 9rpx;
  border-radius: 6rpx;
  background: #f0f2fb;
  font-size: 18rpx;
  color: var(--agent-ink);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.intro {
  display: -webkit-box;
  margin-top: 8rpx;
  min-height: 58rpx;
  font-size: 22rpx;
  line-height: 1.45;
  color: #667087;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 14rpx;
}
.ready,
.hook {
  display: flex;
  align-items: center;
}
.ready { gap: 9rpx; }
.ready-text {
  font-size: 20rpx;
  color: #8a93a7;
}
.hook {
  flex-shrink: 0;
  gap: 4rpx;
  padding: 7rpx 12rpx;
  border-radius: 999rpx;
  background: #eef1fa;
  box-shadow: 0 0 0 0 rgba(104, 120, 182, 0);
  animation: agent-cta-breathe 2.6s ease-in-out infinite;
}
.hook-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--agent-ink);
}
@keyframes grad-flow {
  from { background-position: 0% 0%; }
  to { background-position: 100% 100%; }
}
@keyframes orbit-turn {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes agent-scan {
  0%, 18% { transform: translateY(0); opacity: 0; }
  28% { opacity: 1; }
  72% { opacity: .55; }
  84%, 100% { transform: translateY(560%); opacity: 0; }
}
@keyframes agent-dot {
  0%, 100% { opacity: .7; transform: scale(.88); }
  50% { opacity: 1; transform: scale(1.16); }
}
@keyframes core-pulse {
  0% { opacity: .8; transform: scale(.72); }
  72%, 100% { opacity: 0; transform: scale(1.18); }
}
@keyframes agent-cta-breathe {
  0%, 100% {
    transform: translateY(0);
    background: #eef1fa;
    box-shadow: 0 0 0 0 rgba(104, 120, 182, 0);
  }
  50% {
    transform: translateY(-1rpx);
    background: #e7ebf8;
    box-shadow: 0 0 0 7rpx rgba(104, 120, 182, .09);
  }
}
@media (prefers-reduced-motion: reduce) {
  .grad,
  .orbit,
  .tech-scan,
  .ai-dot,
  .ready-dot,
  .core-pulse,
  .hook { animation: none; }
}
</style>
