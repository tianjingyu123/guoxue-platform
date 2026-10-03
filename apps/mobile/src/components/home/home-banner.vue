<script setup lang="ts">
/** 首页 Banner 轮播：生成式渐变横幅（渐变底 + 图标水印 + 标题 + CTA），
 *  无需图片资源、无破图。后端 banner 只提供 title/link，配色图标按顺序循环。 */
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import type { BannerItem } from '@/lib/home-data'

const props = withDefaults(defineProps<{ banners: BannerItem[]; interval?: number }>(), {
  interval: 4000,
})

const current = ref(0)
function onChange(e: { detail: { current: number } }) {
  current.value = e.detail.current
}
function onTap(link: string) {
  navigateTo(link)
}

// 生成式主题：按 banner 顺序循环配色+图标（国学低饱和色系），无需图片
const THEMES = [
  { grad: 'linear-gradient(135deg, #3e6390, #1e3a5f)', icon: 'graduation-cap' },
  { grad: 'linear-gradient(135deg, #9c4150, #5c2230)', icon: 'radio' },
  { grad: 'linear-gradient(135deg, #3a6b57, #1f3d31)', icon: 'shopping-bag' },
  { grad: 'linear-gradient(135deg, #8a5c3b, #573620)', icon: 'book-open' },
]
function themeFor(i: number) {
  return THEMES[i % THEMES.length]
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
      <swiper-item v-for="(b, i) in banners" :key="b.id" @tap="onTap(b.link)">
        <view class="slide" :style="{ background: themeFor(i).grad }">
          <view class="slide-pattern" />
          <AppIcon :name="themeFor(i).icon" :size="150" color="rgba(255,255,255,0.14)" class="slide-watermark" />
          <view class="slide-body">
            <text class="slide-title">{{ b.title }}</text>
            <view class="slide-cta">
              <text class="slide-cta-txt">立即查看</text>
              <AppIcon name="chevron-right" :size="22" color="#fff" />
            </view>
          </view>
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
.slide { position: relative; width: 100%; height: 100%; overflow: hidden; }
/* 柔和光晕底纹 */
.slide-pattern {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    radial-gradient(circle at 18% 22%, rgba(255,255,255,0.12) 0%, transparent 45%),
    radial-gradient(circle at 88% 80%, rgba(255,255,255,0.08) 0%, transparent 45%);
}
/* 大图标水印 */
.slide-watermark {
  position: absolute; right: 8rpx; top: 50%;
  transform: translateY(-50%);
}
.slide-body {
  position: absolute; left: 40rpx; bottom: 40rpx; right: 150rpx;
  z-index: 1;
}
.slide-title {
  display: block;
  color: #fff; font-size: 34rpx; font-weight: 600; line-height: 1.4;
  letter-spacing: 1rpx;
  font-family: 'STKaiti', 'KaiTi', 'STSong', serif;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.slide-cta {
  display: inline-flex; align-items: center; gap: 4rpx;
  margin-top: 16rpx; padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.22); border-radius: 999rpx;
}
.slide-cta-txt { color: #fff; font-size: 22rpx; font-weight: 500; }
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
