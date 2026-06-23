<script setup lang="ts">
/** 首页 Banner 轮播（原型 components/home/home-banner.tsx；uni swiper 实现自动播放+滑动+指示器） */
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import type { BannerItem } from '@/lib/home-data'

const props = withDefaults(defineProps<{ banners: BannerItem[]; interval?: number }>(), {
  interval: 4000,
})

const current = ref(0)
function onChange(e: any) {
  current.value = e.detail.current
}
function onTap(link: string) {
  navigateTo(link)
}
</script>

<template>
  <view v-if="banners.length" class="banner-wrap">
    <swiper
      class="swiper"
      :autoplay="banners.length > 1"
      :interval="interval"
      :duration="300"
      circular
      @change="onChange"
    >
      <swiper-item v-for="b in banners" :key="b.id" @tap="onTap(b.link)">
        <view class="slide">
          <image :src="b.image" class="slide-img" mode="aspectFill" />
          <view class="mask" />
          <text class="slide-title">{{ b.title }}</text>
        </view>
      </swiper-item>
    </swiper>
    <!-- 指示器 -->
    <view v-if="banners.length > 1" class="dots">
      <view
        v-for="(b, i) in banners"
        :key="i"
        class="dot"
        :class="{ active: i === current }"
      />
    </view>
</template>

<style scoped lang="scss">
.banner-wrap {
  position: relative;
  margin: 16rpx 32rpx 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
}
.swiper { height: 288rpx; border-radius: 24rpx; }
.slide { position: relative; width: 100%; height: 100%; }
.slide-img { width: 100%; height: 100%; }
.mask {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent 50%);
}
.slide-title {
  position: absolute; bottom: 24rpx; left: 32rpx; right: 96rpx;
  color: #fff; font-size: 28rpx; font-weight: 500;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.4);
}
.dots {
  position: absolute; bottom: 16rpx; right: 24rpx;
  display: flex; align-items: center; gap: 8rpx;
}
.dot {
  width: 12rpx; height: 12rpx; border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}
.dot.active { width: 32rpx; background: #fff; }
</style>
