<template>
  <view class="splash">
    <!-- 品牌展示阶段 -->
    <view v-if="phase === 'brand'" class="phase-brand">
      <!-- 背景层 -->
      <view class="bg">
        <view class="mountain mountain-back"></view>
        <view class="mountain mountain-front"></view>
        <view class="dawn"></view>
        <view class="glow"></view>
      </view>

      <!-- 跳过按钮 -->
      <view class="skip-btn" @tap="goHome">跳过 {{ countdown }}s</view>

      <!-- 主内容 -->
      <view class="brand-content">
        <view class="logo" :class="{ 'logo-in': logoAnimated }">
          <app-icon name="compass" :size="64" color="#C9A96E" />
        </view>
        <text class="brand-name" :class="{ 'name-in': logoAnimated }">热卜国学</text>
        <text class="slogan" :class="{ 'slogan-in': sloganVisible }">探寻东方智慧</text>
      </view>

      <!-- 底部版权 -->
      <view class="copyright">
        <text class="copyright-text">Copyright 2024 热卜国学 All Rights Reserved</text>
      </view>
    </view>

    <!-- 广告展示阶段 -->
    <view v-else-if="phase === 'ad' && ad" class="phase-ad">
      <view class="skip-btn skip-btn-ad" @tap="goHome">跳过 {{ adCountdown }}s</view>
      <image lazy-load class="ad-image" :src="ad.image" mode="aspectFill" @tap="handleAdClick" />
      <view class="ad-brand">
        <view class="ad-brand-logo">
          <app-icon name="compass" :size="14" color="#C9A96E" />
        </view>
        <text class="ad-brand-text">热卜国学</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { reLaunch, navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'

interface SplashAd {
  id: string
  image: string
  link: string
  duration: number
}

const phase = ref<'brand' | 'ad'>('brand')
const countdown = ref(3)
const adCountdown = ref(5)
const logoAnimated = ref(false)
const sloganVisible = ref(false)
const ad = ref<SplashAd | null>(null)

let brandTimer: ReturnType<typeof setInterval> | null = null
let adTimer: ReturnType<typeof setInterval> | null = null
let logoT: ReturnType<typeof setTimeout> | null = null
let sloganT: ReturnType<typeof setTimeout> | null = null

function clearAll() {
  if (brandTimer) { clearInterval(brandTimer); brandTimer = null }
  if (adTimer) { clearInterval(adTimer); adTimer = null }
  if (logoT) { clearTimeout(logoT); logoT = null }
  if (sloganT) { clearTimeout(sloganT); sloganT = null }
}

function goHome() {
  clearAll()
  reLaunch('/')
}

function handleAdClick() {
  if (ad.value?.link) {
    clearAll()
    navigateTo(ad.value.link)
  }
}

function startBrandCountdown() {
  brandTimer = setInterval(() => {
    if (countdown.value <= 1) {
      if (brandTimer) { clearInterval(brandTimer); brandTimer = null }
      if (ad.value) {
        phase.value = 'ad'
        adCountdown.value = ad.value.duration
        startAdCountdown()
      } else {
        goHome()
      }
      countdown.value = 0
      return
    }
    countdown.value -= 1
  }, 1000)
}

function startAdCountdown() {
  adTimer = setInterval(() => {
    if (adCountdown.value <= 1) {
      goHome()
      return
    }
    adCountdown.value -= 1
  }, 1000)
}

onLoad(() => {
  // 开屏广告：此处无广告配置时直接走品牌展示后跳首页
  ad.value = null
  // Logo 动画
  logoT = setTimeout(() => { logoAnimated.value = true }, 100)
  sloganT = setTimeout(() => { sloganVisible.value = true }, 600)
  startBrandCountdown()
})

onUnmounted(clearAll)
</script>

<style scoped>
.splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
}

.phase-brand {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, #1a1f2e 0%, #252a38 50%, #1a1f2e 100%);
}

.mountain {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}

.mountain-back {
  height: 40%;
  background: #2a3040;
  opacity: 0.2;
  clip-path: polygon(0 50%, 28% 25%, 55% 45%, 80% 12%, 100% 38%, 100% 100%, 0 100%);
}

.mountain-front {
  height: 30%;
  background: #252a38;
  opacity: 0.3;
  clip-path: polygon(0 50%, 25% 25%, 50% 62%, 75% 12%, 100% 38%, 100% 100%, 0 100%);
}

.dawn {
  position: absolute;
  top: 20%;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(to bottom, transparent, rgba(201, 169, 110, 0.05), transparent);
}

.glow {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: 600rpx;
  height: 200rpx;
  background: rgba(201, 169, 110, 0.1);
  border-radius: 50%;
  filter: blur(80rpx);
}

.skip-btn {
  position: absolute;
  top: 96rpx;
  right: 32rpx;
  z-index: 20;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  font-size: 26rpx;
  font-weight: 500;
}

.skip-btn-ad {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.brand-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo {
  width: 192rpx;
  height: 192rpx;
  margin-bottom: 48rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.4);
  opacity: 0;
  transform: scale(0.75);
  transition: all 0.7s ease-out;
}

.logo-in {
  opacity: 1;
  transform: scale(1);
}

.brand-name {
  font-size: 60rpx;
  font-weight: bold;
  color: #fff;
  letter-spacing: 12rpx;
  margin-bottom: 24rpx;
  opacity: 0;
  transform: translateY(16rpx);
  transition: all 0.5s ease-out 0.2s;
}

.name-in {
  opacity: 1;
  transform: translateY(0);
}

.slogan {
  font-size: 32rpx;
  color: #c9a96e;
  letter-spacing: 12rpx;
  opacity: 0;
  transform: translateY(8rpx);
  transition: all 0.5s ease-out;
}

.slogan-in {
  opacity: 1;
  transform: translateY(0);
}

.copyright {
  position: absolute;
  bottom: 64rpx;
  left: 0;
  right: 0;
  text-align: center;
}

.copyright-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 1rpx;
}

.phase-ad {
  position: absolute;
  inset: 0;
  background: #000;
}

.ad-image {
  width: 100%;
  height: 100%;
}

.ad-brand {
  position: absolute;
  bottom: 48rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.ad-brand-logo {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ad-brand-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
}
</style>
