<script setup lang="ts">
/**
 * 智能体卡 · 重设计（card-system.html §智能体定稿）
 * 封面 3:4：动态渐变背景（background-position 7s 流动）+ 中央图标（白毛玻璃圆底·金光晕呼吸 3.5s）
 * 左上「AI」淡紫角标；body：名称 + 简介2行 + hook「问一问 ›」
 * 4 色系按 payload.category 自动匹配（agentTheme），缺省暖金。
 * X5 安全：无 aspect-ratio（padding-top）、无 backdrop-filter（用半透明白底近似毛玻璃）、
 *          动效仅 background-position / opacity。
 */
import { computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { type FeedEnvelope, payloadStr, agentTheme } from '@/lib/feed-data'

const props = defineProps<{ item: FeedEnvelope }>()
const theme = computed(() => agentTheme(props.item))
const name = computed(() => props.item.title || props.item.author?.name || 'AI 学友')
const intro = computed(() => props.item.subtitle || payloadStr(props.item, 'question') || '')
const hook = computed(() => payloadStr(props.item, 'action') || '问一问')
</script>

<template>
  <view class="fcard agent">
    <view class="cov">
      <!-- 动态渐变背景（background-position 流动） -->
      <view class="grad" :style="{ background: theme.gradient }" />
      <!-- 左上「AI」淡紫角标 -->
      <text class="ai-badge">AI</text>
      <!-- 中央毛玻璃圆底图标 + 呼吸金光晕 -->
      <view class="a-icon">
        <view class="halo" :style="{ borderColor: theme.accent }" />
        <app-icon :name="theme.icon" :size="48" :color="theme.iconStroke" />
      </view>
    </view>
    <view class="body">
      <text class="title">{{ name }}</text>
      <text v-if="intro" class="intro">{{ intro }}</text>
      <view class="meta">
        <text class="hook">{{ hook }} ›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.fcard { background: #fff; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(60,50,40,.06); }
.cov { position: relative; width: 100%; padding-top: 133.33%; overflow: hidden; }
/* 渐变背景流动（X5 安全：只动 background-position） */
.grad {
  position: absolute; inset: 0;
  background-size: 200% 200% !important;
  animation: gradFlow 7s ease-in-out infinite alternate;
}
@keyframes gradFlow { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
.ai-badge {
  position: absolute; top: 16rpx; left: 16rpx; z-index: 3;
  font-size: 20rpx; font-weight: 700; letter-spacing: 1rpx; color: #7e6b96;
  background: rgba(180,155,209,.18); border: 2rpx solid rgba(180,155,209,.5);
  border-radius: 8rpx; padding: 2rpx 12rpx;
}
/* 中央圆底图标（44% 封面宽，2:1 卡宽约 335rpx/列，取固定 148rpx 近似） */
.a-icon {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2;
  width: 148rpx; height: 148rpx; border-radius: 999rpx;
  background: rgba(255,255,255,.5);
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 2rpx 6rpx rgba(255,255,255,.7), 0 4rpx 16rpx rgba(120,100,60,.12);
}
/* 呼吸金光晕（只动 opacity） */
.halo {
  position: absolute; inset: -4rpx; border-radius: 999rpx;
  border: 4rpx solid #c9a96e; opacity: .3;
  animation: halo 3.5s ease-in-out infinite;
}
@keyframes halo { 0%, 100% { opacity: .3; } 50% { opacity: .6; } }
.body { padding: 18rpx 20rpx 22rpx; }
.title { display: block; font-size: 28rpx; line-height: 1.45; font-weight: 500; color: #2c2c2c; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.intro { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 8rpx; font-size: 22rpx; line-height: 1.5; color: #555; }
.meta { margin-top: 16rpx; display: flex; align-items: center; }
.hook { margin-left: auto; font-size: 22rpx; color: #8a6420; }
</style>
