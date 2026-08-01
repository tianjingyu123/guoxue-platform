<script setup lang="ts">
/**
 * 智能推演入口卡。
 * 后端类型仍为 paipan，但产品表现属于智能体入口：轻色推演盘主视觉 + 独立白底信息区。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { type FeedEnvelope, payloadStr } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const hint = computed(() => payloadStr(props.item, 'hint') || props.item.subtitle || '结合传统文化知识，为你生成专属解读')
</script>

<template>
  <view class="fcard">
    <view class="visual">
      <view class="visual-grid" />
      <view class="visual-scan" />
      <view class="ai-badge">
        <view class="ai-dot" />
        <text class="ai-badge-text">AI 推演</text>
      </view>

      <view class="dial">
        <view class="dial-pulse" />
        <view class="dial-ring dial-ring--outer">
          <view class="dial-node dial-node--a" />
          <view class="dial-node dial-node--b" />
        </view>
        <view class="dial-ring dial-ring--inner" />
        <view class="dial-core">
          <app-icon name="sparkles" :size="46" color="#6671A8" />
        </view>
      </view>

      <view class="visual-label">
        <view class="visual-rule" />
        <text class="visual-label-text">智能分析已就绪</text>
      </view>
    </view>

    <view class="body">
      <view class="title-row">
        <text class="title">{{ item.title }}</text>
        <text class="type-chip">智能体</text>
      </view>
      <text class="hint">{{ hint }}</text>
      <view class="foot">
        <view class="ready">
          <view class="ready-dot" />
          <text class="ready-text">随时可用</text>
        </view>
        <view class="action">
          <text class="action-text">开始对话</text>
          <app-icon name="arrow-up-right" :size="22" color="#6671A8" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard {
  overflow: hidden;
  border: 1rpx solid rgba(96, 111, 164, 0.13);
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(54, 68, 105, 0.08);
}
.visual {
  position: relative;
  width: 100%;
  padding-top: 104%;
  overflow: hidden;
  background: linear-gradient(145deg, #f8f6ff 0%, #eaf0ff 52%, #f7fbff 100%);
}
.visual-grid {
  position: absolute;
  inset: 0;
  opacity: 0.52;
  background-image:
    linear-gradient(rgba(99, 116, 177, 0.08) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(99, 116, 177, 0.08) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 18%, rgba(255, 255, 255, 0.95), transparent 36%);
  background-size: 34rpx 34rpx, 34rpx 34rpx, 100% 100%;
}
.visual-scan {
  position: absolute;
  top: -22%;
  right: 0;
  left: 0;
  height: 22%;
  background: linear-gradient(180deg, transparent, rgba(120,140,210,.12), transparent);
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
  border: 1rpx solid rgba(103, 116, 174, 0.2);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.76);
}
.ai-dot,
.ready-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #8378cd;
  box-shadow: 0 0 0 5rpx rgba(131, 120, 205, 0.12);
  animation: agent-dot 2.6s ease-in-out infinite;
}
.ai-badge-text {
  font-size: 18rpx;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 1rpx;
  color: #596496;
}
.dial {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 190rpx;
  height: 190rpx;
  transform: translate(-50%, -50%);
}
.dial-pulse {
  position: absolute;
  inset: 24rpx;
  border: 1rpx solid rgba(108, 125, 190, .28);
  border-radius: 999rpx;
  animation: core-pulse 3.2s ease-out infinite;
}
.dial-ring {
  position: absolute;
  border: 1rpx solid rgba(102, 116, 177, 0.38);
  border-radius: 999rpx;
}
.dial-ring--outer {
  inset: 0;
  animation: dial-turn 18s linear infinite;
}
.dial-ring--inner {
  inset: 28rpx;
  border-style: dashed;
  animation: dial-turn 12s linear infinite reverse;
}
.dial-ring::before,
.dial-ring::after {
  position: absolute;
  content: '';
  background: rgba(102, 116, 177, 0.2);
}
.dial-ring::before {
  top: 50%;
  left: -14rpx;
  right: -14rpx;
  height: 1rpx;
}
.dial-ring::after {
  top: -14rpx;
  bottom: -14rpx;
  left: 50%;
  width: 1rpx;
}
.dial-node {
  position: absolute;
  z-index: 2;
  width: 10rpx;
  height: 10rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 999rpx;
  background: #8378cd;
  box-shadow: 0 2rpx 8rpx rgba(72, 85, 133, 0.18);
}
.dial-node--a { top: 13rpx; right: 34rpx; }
.dial-node--b { bottom: 18rpx; left: 22rpx; }
.dial-core {
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
  border: 1rpx solid rgba(255, 255, 255, 0.94);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.8);
  box-shadow:
    inset 0 0 0 1rpx rgba(96, 113, 163, 0.08),
    0 12rpx 32rpx rgba(70, 83, 125, 0.12);
}
.visual-label {
  position: absolute;
  right: 18rpx;
  bottom: 16rpx;
  left: 18rpx;
  display: flex;
  align-items: center;
  gap: 9rpx;
}
.visual-rule {
  flex: 1;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, rgba(102, 116, 177, 0.36));
}
.visual-label-text {
  flex-shrink: 0;
  font-size: 18rpx;
  letter-spacing: 1rpx;
  color: #6671a0;
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
  font-family: var(--font-serif, 'STSong', serif);
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
  padding: 3rpx 9rpx;
  border-radius: 6rpx;
  background: #f0f1fb;
  font-size: 18rpx;
  color: #6671a0;
}
.hint {
  display: -webkit-box;
  min-height: 58rpx;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.45;
  color: #667087;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  margin-top: 14rpx;
}
.ready,
.action {
  display: flex;
  align-items: center;
}
.ready { gap: 9rpx; }
.ready-text {
  font-size: 20rpx;
  color: #8a93a7;
}
.action {
  flex-shrink: 0;
  gap: 4rpx;
  padding: 7rpx 12rpx;
  border-radius: 999rpx;
  background: #eef1fa;
  box-shadow: 0 0 0 0 rgba(104, 120, 182, 0);
  animation: agent-cta-breathe 2.6s ease-in-out infinite;
}
.action-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #5d6899;
}
@keyframes dial-turn {
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
  .dial-ring,
  .visual-scan,
  .ai-dot,
  .ready-dot,
  .dial-pulse,
  .action { animation: none; }
}
</style>
