<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import SmartAvatar from '@/components/common/smart-avatar.vue'
import { formatCount, type SquareBot } from '@/lib/agents-square-data'
import { agentThemeStyle, resolveAgentTheme } from '@/lib/agent-experience'

const props = defineProps<{ bot: SquareBot }>()
const emit = defineEmits<{ select: [id: string] }>()

const theme = computed(() => resolveAgentTheme(props.bot.category))
const cardStyle = computed(() => agentThemeStyle(props.bot.category))
const usageText = computed(() => {
  if (props.bot.useCount) return `${formatCount(props.bot.useCount)}次对话`
  return props.bot.isFree ? '随时可用' : '按次计费'
})

function selectByKeyboard(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  emit('select', props.bot.id)
}
</script>

<template>
  <view
    class="agent-square-card"
    :style="cardStyle"
    role="link"
    tabindex="0"
    :aria-label="`${bot.name}，${bot.description || '智能学习助手'}，${usageText}，开始学习`"
    @tap="emit('select', bot.id)"
    @keydown="selectByKeyboard"
  >
    <view class="visual">
      <view class="visual-grid" />
      <view class="visual-scan" />
      <view class="ai-mark">
        <view class="ai-dot" />
        <text class="ai-text">AI 学伴</text>
      </view>
      <text v-if="bot.isNew" class="new-mark">NEW</text>

      <view class="agent-orbit">
        <view class="orbit-pulse" />
        <view class="orbit-ring orbit-ring--outer">
          <view class="orbit-node orbit-node--a" />
          <view class="orbit-node orbit-node--b" />
        </view>
        <view class="orbit-ring orbit-ring--inner" />
        <view class="avatar-shell">
          <smart-avatar
            v-if="bot.avatar"
            class="avatar"
            :src="bot.avatar"
            :name="bot.name"
          />
          <text v-else class="avatar-glyph">{{ (bot.name || '智')[0] }}</text>
        </view>
      </view>

      <view class="category-line">
        <view class="category-rule" />
        <text class="category">{{ bot.categoryName || '国学智能体' }}</text>
      </view>
    </view>

    <view class="content">
      <text class="name">{{ bot.name }}</text>
      <text class="desc">{{ bot.description || '点击进入，开始智能对话' }}</text>
      <view class="foot">
        <text class="usage">{{ usageText }}</text>
        <view class="action">
          <text class="action-text">开始学习</text>
          <app-icon name="arrow-up-right" :size="22" :color="theme.ink" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.agent-square-card {
  width: calc(50% - 10rpx);
  box-sizing: border-box;
  overflow: hidden;
  border: 1rpx solid rgba(93, 111, 159, 0.13);
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(54, 68, 105, 0.08);
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.agent-square-card:active {
  opacity: 0.9;
  transform: scale(0.98);
}
.visual {
  position: relative;
  height: 218rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 16%, var(--agent-glow), transparent 42%),
    linear-gradient(145deg, var(--agent-deep), var(--agent-accent));
}
.visual-grid {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.09) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.09) 1rpx, transparent 1rpx),
    radial-gradient(circle at 80% 18%, rgba(255, 255, 255, 0.16), transparent 38%);
  background-size: 30rpx 30rpx, 30rpx 30rpx, 100% 100%;
}
.visual-scan {
  position: absolute;
  top: -22%;
  right: 0;
  left: 0;
  z-index: 1;
  height: 22%;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,.2), transparent);
  animation: agent-scan 5.8s ease-in-out infinite;
}
.ai-mark {
  position: absolute;
  top: 14rpx;
  left: 14rpx;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 7rpx;
  padding: 5rpx 11rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.28);
  border-radius: 999rpx;
  background: rgba(10, 20, 52, 0.26);
}
.ai-dot {
  width: 7rpx;
  height: 7rpx;
  border-radius: 999rpx;
  background: #ffffff;
  box-shadow: 0 0 0 4rpx rgba(255, 255, 255, 0.14), 0 0 18rpx var(--agent-glow);
  animation: agent-dot 2.6s ease-in-out infinite;
}
.ai-text {
  font-family: Arial, sans-serif;
  font-size: 18rpx;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 1rpx;
  color: #ffffff;
}
.new-mark {
  position: absolute;
  top: 15rpx;
  right: 15rpx;
  z-index: 3;
  padding: 4rpx 9rpx;
  border-radius: 6rpx;
  background: #c41e3a;
  font-size: 16rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  color: #ffffff;
}
.agent-orbit {
  position: absolute;
  top: 18rpx;
  left: 50%;
  width: 170rpx;
  height: 170rpx;
  transform: translateX(-50%);
}
.orbit-pulse {
  position: absolute;
  inset: 22rpx;
  border: 1rpx solid rgba(255,255,255,.35);
  border-radius: 999rpx;
  animation: orbit-pulse 3.2s ease-out infinite;
}
.orbit-ring {
  position: absolute;
  border: 1rpx solid rgba(255, 255, 255, 0.42);
  border-radius: 999rpx;
}
.orbit-ring--outer {
  inset: 0;
  animation: orbit-turn 18s linear infinite;
}
.orbit-ring--inner {
  inset: 25rpx;
  border-style: dashed;
  animation: orbit-turn 12s linear infinite reverse;
}
.orbit-node {
  position: absolute;
  width: 9rpx;
  height: 9rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 999rpx;
  background: #ffffff;
  box-shadow: 0 0 15rpx var(--agent-glow);
}
.orbit-node--a { top: 15rpx; right: 30rpx; }
.orbit-node--b { bottom: 18rpx; left: 22rpx; }
.avatar-shell {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 92rpx;
  height: 92rpx;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 4rpx solid rgba(255, 255, 255, 0.94);
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 12rpx 28rpx rgba(12, 19, 55, 0.24), 0 0 34rpx var(--agent-glow);
}
.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 26rpx;
  overflow: hidden;
}
.avatar-glyph {
  font-family: var(--font-serif, 'STSong', serif);
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}
.category-line {
  position: absolute;
  right: 14rpx;
  bottom: 13rpx;
  left: 14rpx;
  display: flex;
  align-items: center;
  gap: 9rpx;
}
.category-rule {
  flex: 1;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.48));
}
.category {
  flex-shrink: 0;
  font-size: 18rpx;
  letter-spacing: 1rpx;
  color: rgba(255, 255, 255, 0.88);
}
.content {
  min-height: 190rpx;
  box-sizing: border-box;
  padding: 18rpx 18rpx 16rpx;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #ffffff, #fcfdff);
}
.name {
  display: block;
  font-size: 28rpx;
  line-height: 1.4;
  font-weight: 700;
  color: #273047;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.desc {
  display: -webkit-box;
  min-height: 62rpx;
  margin-top: 7rpx;
  font-size: 22rpx;
  line-height: 1.45;
  color: #6b7488;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  margin-top: auto;
  padding-top: 14rpx;
  border-top: 1rpx solid rgba(91, 108, 154, 0.1);
}
.usage {
  min-width: 0;
  font-size: 20rpx;
  color: #969dae;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3rpx;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: var(--agent-soft);
}
.action-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--agent-ink);
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
@keyframes orbit-pulse {
  0% { opacity: .8; transform: scale(.72); }
  72%, 100% { opacity: 0; transform: scale(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  .orbit-ring,
  .visual-scan,
  .ai-dot,
  .orbit-pulse { animation: none; }
}
</style>
