<script setup lang="ts">
/** 营销/活动入口大卡（原型 MarketingCard，5s 自动轮播渐变背景） */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo } from '@/utils/router'
import { homeApi } from '@/lib/home-data'

const idx = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const banners = ref<any[]>([])
const banner = computed(() => banners.value[idx.value] || banners.value[0])

onMounted(async () => {
  try {
    const data = await homeApi.getHome()
    banners.value = data.banners || []
  } catch { /* fallback below */ }
  if (!banners.value.length) {
    const mod = await import('@/lib/home-data')
    banners.value = mod.marketingBanners
  }
  if (banners.value.length) {
    timer = setInterval(() => {
      idx.value = (idx.value + 1) % banners.value.length
    }, 5000)
  }
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <view
    class="mk-card card-press"
    :style="{ background: `linear-gradient(135deg, ${banner.bgFrom} 0%, ${banner.bgTo} 100%)`, boxShadow: `0 8rpx 40rpx ${banner.bgFrom}40` }"
    @tap="navigateTo(banner.href)"
  >
    <view class="deco deco-1" :style="{ background: banner.accent }" />
    <view class="deco deco-2" :style="{ background: banner.accent }" />

    <view class="left">
      <text class="label" :style="{ background: banner.accent }">{{ banner.label }}</text>
      <text class="title">{{ banner.title }}</text>
      <text class="subtitle">{{ banner.subtitle }}</text>
    </view>
    <view class="cta" :style="{ background: banner.accent, color: banner.bgTo }">
      <text class="cta-text" :style="{ color: banner.bgTo }">立即领取</text>
      <app-icon name="chevron-right" :size="26" :color="banner.bgTo" />
    </view>

    <view v-if="banners.length > 1" class="dots">
      <view v-for="(_, i) in banners" :key="i" class="dot" :class="{ active: i === idx }" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.mk-card {
  position: relative;
  margin: 0 32rpx 12rpx;
  border-radius: 24rpx;
  overflow: hidden;
  padding: 24rpx 32rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.deco { position: absolute; border-radius: 999rpx; pointer-events: none; }
.deco-1 { right: -48rpx; top: -48rpx; width: 192rpx; height: 192rpx; opacity: 0.12; }
.deco-2 { right: -16rpx; bottom: 0; width: 128rpx; height: 128rpx; opacity: 0.08; }
.left { position: relative; z-index: 1; flex: 1; min-width: 0; }
.label {
  display: inline-block; font-size: 18rpx; font-weight: 700; color: #c41e3a;
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
  display: flex; gap: 8rpx;
}
.dot { width: 12rpx; height: 8rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.4); transition: all 0.3s ease; }
.dot.active { width: 32rpx; background: #fff; }
</style>
