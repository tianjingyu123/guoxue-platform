<script setup lang="ts">
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import type { AgentReferral } from '@/lib/agent-routing'

const props = defineProps<{ payload?: unknown }>()
const data = (props.payload || {}) as Partial<AgentReferral>

function openRoute() {
  if (data.route) navigateTo(data.route)
}
</script>

<template>
  <view class="route-card" :class="`tone-${data.tone || 'indigo'}`">
    <view class="route-orbit" aria-hidden="true">
      <view class="orbit-ring orbit-ring-a" />
      <view class="orbit-ring orbit-ring-b" />
      <view class="orbit-node node-a" />
      <view class="orbit-node node-b" />
      <text class="route-glyph">{{ data.glyph || '智' }}</text>
    </view>
    <view class="route-copy">
      <text class="route-eyebrow">{{ data.eyebrow || '专业能力转介' }}</text>
      <text class="route-title">{{ data.title }}</text>
      <text class="route-desc">{{ data.description }}</text>
      <view class="route-reason">
        <AppIcon name="sparkles" :size="22" color="currentColor" />
        <text class="route-reason-text">{{ data.reason }}</text>
      </view>
      <view class="route-action" @tap="openRoute">
        <text class="route-action-text">{{ data.actionLabel || '继续' }}</text>
        <AppIcon name="arrow-right" :size="24" color="#ffffff" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.route-card {
  --route-deep: #27316d;
  --route-accent: #6677e8;
  --route-soft: #eef0ff;
  width: 100%;
  overflow: hidden;
  border: 1rpx solid rgba(79, 112, 255, .2);
  border-radius: 28rpx;
  background: linear-gradient(145deg, #fff 25%, var(--route-soft));
  box-shadow: 0 14rpx 36rpx rgba(35, 44, 94, .1);
}
.tone-crimson { --route-deep: #861f39; --route-accent: #d64062; --route-soft: #fff0f3; }
.tone-cyan { --route-deep: #07517c; --route-accent: #1c9bd2; --route-soft: #e9f8ff; }
.tone-violet { --route-deep: #5b206f; --route-accent: #b143cf; --route-soft: #fbecff; }
.tone-jade { --route-deep: #0c6258; --route-accent: #22a98e; --route-soft: #e8faf5; }
.tone-amber { --route-deep: #7a4312; --route-accent: #de8a2f; --route-soft: #fff4e4; }
.route-orbit {
  position: relative;
  height: 178rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 105%, rgba(255,255,255,.2), transparent 55%),
    linear-gradient(135deg, var(--route-deep), var(--route-accent));
}
.orbit-ring { position: absolute; border: 1rpx solid rgba(255,255,255,.34); border-radius: 50%; }
.orbit-ring-a { width: 132rpx; height: 132rpx; }
.orbit-ring-b { width: 212rpx; height: 212rpx; border-style: dashed; animation: route-spin 18s linear infinite; }
.orbit-node { position: absolute; width: 11rpx; height: 11rpx; border-radius: 50%; background: #fff; box-shadow: 0 0 18rpx rgba(255,255,255,.9); }
.node-a { transform: translate(92rpx,-36rpx); }
.node-b { transform: translate(-70rpx,62rpx); }
.route-glyph {
  position: relative;
  width: 82rpx;
  height: 82rpx;
  border: 1rpx solid rgba(255,255,255,.55);
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
  font-family: "Songti SC", "STSong", serif;
  font-size: 42rpx;
  font-weight: 700;
  color: #fff;
}
.route-copy { padding: 24rpx 26rpx 26rpx; }
.route-eyebrow { display: block; font-size: 20rpx; letter-spacing: 3rpx; color: var(--route-accent); font-weight: 700; }
.route-title { display: block; margin-top: 8rpx; font-family: "Songti SC", "STSong", serif; font-size: 34rpx; line-height: 1.38; color: #242936; font-weight: 700; }
.route-desc { display: block; margin-top: 12rpx; font-size: 27rpx; line-height: 1.65; color: #555d6d; }
.route-reason { margin-top: 18rpx; padding: 14rpx 16rpx; display: flex; align-items: flex-start; gap: 9rpx; border-radius: 16rpx; color: var(--route-deep); background: rgba(255,255,255,.7); }
.route-reason-text { flex: 1; font-size: 22rpx; line-height: 1.48; }
.route-action { height: 72rpx; margin-top: 20rpx; padding: 0 22rpx; display: flex; align-items: center; justify-content: center; gap: 10rpx; border-radius: 18rpx; background: linear-gradient(135deg, var(--route-deep), var(--route-accent)); box-shadow: 0 9rpx 22rpx rgba(79, 112, 255, .18); }
.route-action-text { font-size: 26rpx; color: #fff; font-weight: 700; }
@keyframes route-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .orbit-ring-b { animation: none; } }
</style>
