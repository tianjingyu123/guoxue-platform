<script setup lang="ts">
/** 排盘引导大卡（原型 PaipanGuideCard）：宣纸纹理 + 八卦底纹 + 太极旋转图标 + CTA */
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'

const tags = ['八字', '紫微', '六爻', '奇门']
</script>

<template>
  <view class="pp-card card-press" @tap="navigateTo('/pages/paipan/index')">
    <!-- 宣纸纹理层 -->
    <view class="paper-texture" />
    <!-- 八卦背景装饰 -->
    <image lazy-load src="/static/bagua-deco.svg" class="bagua-deco" mode="aspectFit" />

    <view class="row">
      <!-- 太极旋转图标 -->
      <view class="taiji-box gold-glow">
        <image lazy-load src="/static/taiji-gold.svg" class="taiji taiji-rotate" mode="aspectFit" />
      </view>
      <!-- 文案 -->
      <view class="copy">
        <view class="title-row">
          <text class="title">排盘工具</text>
          <text class="free-tag">免费使用</text>
        </view>
        <text class="desc">易学工具大全，算法精准，功能全面</text>
        <view class="tags">
          <text v-for="t in tags" :key="t" class="tag">{{ t }}</text>
        </view>
      </view>
      <!-- CTA -->
      <view class="cta">
        <text class="cta-text">立即体验</text>
        <app-icon name="chevron-right" :size="26" color="#ffffff" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.pp-card {
  position: relative;
  margin: 12rpx 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #faf3e8 0%, #fdf8f0 40%, #faf3e8 100%);
  border: 2rpx solid rgba(201, 169, 110, 0.35);
  box-shadow: 0 4rpx 32rpx rgba(201, 169, 110, 0.15), 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.paper-texture {
  position: absolute; inset: 0; opacity: 0.04; pointer-events: none;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 6rpx, rgba(139, 100, 50, 0.3) 6rpx, rgba(139, 100, 50, 0.3) 8rpx);
}
.bagua-deco {
  position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%);
  width: 160rpx; height: 160rpx; opacity: 0.06; pointer-events: none;
}
.row { position: relative; padding: 28rpx 32rpx; display: flex; align-items: center; gap: 28rpx; }
.taiji-box {
  width: 104rpx; height: 104rpx; border-radius: 24rpx; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #c9a96e, #b8985f);
}
/* 太极符号：金底白阴阳鱼 SVG（对齐原型） */
.taiji { width: 64rpx; height: 64rpx; }
.copy { flex: 1; min-width: 0; }
.title-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 4rpx; }
.title {
  font-family: var(--font-serif); font-weight: 700; font-size: 34rpx;
  color: var(--text-ink, #2c2c2c); letter-spacing: 1rpx;
}
.free-tag {
  font-size: 18rpx; color: var(--brand); font-weight: 500;
  padding: 4rpx 12rpx; border-radius: 8rpx; background: rgba(196, 30, 58, 0.1);
}
.desc { display: block; font-size: 24rpx; color: var(--text-soft, #555); margin-bottom: 16rpx; }
.tags { display: flex; gap: 12rpx; }
.tag {
  font-size: 20rpx; color: #c9a96e; font-weight: 500;
  padding: 4rpx 16rpx; border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7); border: 2rpx solid rgba(201, 169, 110, 0.25);
  flex-shrink: 0; white-space: nowrap;
}
.cta {
  flex-shrink: 0; display: flex; align-items: center; gap: 4rpx;
  padding: 16rpx 28rpx; border-radius: 999rpx;
  background: var(--brand); box-shadow: 0 6rpx 24rpx rgba(196, 30, 58, 0.25);
}
.cta-text { color: #fff; font-size: 26rpx; font-weight: 500; }
</style>
