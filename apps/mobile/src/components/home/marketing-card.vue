<script setup lang="ts">
/** 营销/活动入口大卡（原型 MarketingCard）。
 *  改用 <swiper>：既保留 5s 自动轮播（autoplay+circular），又支持手动左右滑动
 *  （原实现是单 view + setInterval，只能自动切换、无法手滑）。 */
import { ref } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { marketingBanners } from '@/lib/home-data'

const idx = ref(0)
function onChange(e: { detail: { current: number } }) {
  idx.value = e.detail.current
}
</script>

<template>
  <view class="mk-wrap">
    <swiper
      class="mk-swiper"
      :autoplay="marketingBanners.length > 1"
      :circular="true"
      :interval="5000"
      :duration="400"
      @change="onChange"
    >
      <swiper-item
        v-for="b in marketingBanners"
        :key="b.href + b.title"
      >
        <view
          class="mk-card card-press"
          :style="{ background: `linear-gradient(135deg, ${b.bgFrom} 0%, ${b.bgTo} 100%)`, boxShadow: `0 8rpx 40rpx ${b.bgFrom}40` }"
          @tap="navigateTo(b.href)"
        >
          <view class="deco deco-1" :style="{ background: b.accent }" />
          <view class="deco deco-2" :style="{ background: b.accent }" />

          <view class="left">
            <text class="label" :style="{ background: b.accent }">{{ b.label }}</text>
            <text class="title">{{ b.title }}</text>
            <text class="subtitle">{{ b.subtitle }}</text>
          </view>
          <view class="cta" :style="{ background: b.accent, color: b.bgTo }">
            <text class="cta-text" :style="{ color: b.bgTo }">立即领取</text>
            <app-icon name="chevron-right" :size="26" :color="b.bgTo" />
          </view>
        </view>
      </swiper-item>
    </swiper>

    <view v-if="marketingBanners.length > 1" class="dots">
      <view v-for="(_, i) in marketingBanners" :key="i" class="dot" :class="{ active: i === idx }" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.mk-wrap { position: relative; margin: 0 32rpx 12rpx; }
.mk-swiper { height: 168rpx; border-radius: 24rpx; overflow: hidden; }
.mk-card {
  position: relative;
  height: 168rpx;
  border-radius: 24rpx;
  overflow: hidden;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
  display: flex; align-items: center; justify-content: space-between;
}
.deco { position: absolute; border-radius: 999rpx; pointer-events: none; }
.deco-1 { right: -48rpx; top: -48rpx; width: 192rpx; height: 192rpx; opacity: 0.12; }
.deco-2 { right: -16rpx; bottom: 0; width: 128rpx; height: 128rpx; opacity: 0.08; }
.left { position: relative; z-index: 1; flex: 1; min-width: 0; }
.label {
  display: inline-block; font-size: 18rpx; font-weight: 700; color: var(--brand);
  padding: 4rpx 12rpx; border-radius: 999rpx; margin-bottom: 8rpx;
}
.title {
  display: block; color: #fff; font-weight: 700; font-size: 32rpx;
  font-family: var(--font-serif); letter-spacing: 1rpx;
}
.subtitle { display: block; color: rgba(255, 255, 255, 0.8); font-size: 24rpx; margin-top: 4rpx; }
.cta {
  position: relative; z-index: 1; flex-shrink: 0;
  display: flex; align-items: center; gap: 4rpx;
  padding: 16rpx 28rpx; border-radius: 999rpx; font-weight: 700;
}
.cta-text { font-size: 26rpx; font-weight: 700; }
.dots {
  position: absolute; bottom: 16rpx; left: 50%; transform: translateX(-50%);
  display: flex; gap: 8rpx; z-index: 2;
}
.dot { width: 12rpx; height: 8rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.4); transition: all 0.3s ease; }
.dot.active { width: 32rpx; background: #fff; }
</style>
