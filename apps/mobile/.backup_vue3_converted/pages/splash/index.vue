<template>
  <view
    class="fixed inset-0 z-[9999]"
    style="background: linear-gradient(180deg, #1A1F2E 0%, #252A38 50%, #1A1F2E 100%); overflow: hidden;"
  >
    <!-- 山峦剪影层 -->
    <view style="position: absolute; bottom: 0; left: 0; right: 0; height: 40%;">
      <svg style="position: absolute; bottom: 0; left: 0; right: 0; width: 100%; height: 100%; opacity: 0.2;" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <path fill="#2A3040" d="M0,400 L0,200 Q200,100 400,180 Q600,260 800,150 Q1000,40 1200,120 Q1400,200 1440,150 L1440,400 Z" />
      </svg>
      <svg style="position: absolute; bottom: 0; left: 0; right: 0; width: 100%; height: 100%; opacity: 0.3;" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="#252A38" d="M0,320 L0,160 Q180,80 360,140 Q540,200 720,100 Q900,0 1080,80 Q1260,160 1440,120 L1440,320 Z" />
      </svg>
    </view>

    <!-- 天边曙光 -->
    <view style="position: absolute; top: 20%; left: 0; right: 0; height: 30%; background: linear-gradient(180deg, transparent, rgba(201,169,110,0.05));" />

    <!-- 金色光晕 -->
    <view style="position: absolute; top: 30%; left: 50%; width: 600px; height: 200px; border-radius: 50%; background: rgba(201,169,110,0.1); transform: translateX(-50%);" />

    <!-- 右上角跳过按钮 -->
    <view
      @click="goHome"
      style="position: absolute; top: 48px; right: 16px; z-index: 20; padding: 6px 12px; border-radius: 9999px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);"
    >
      <text style="color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500;">跳过 {{ countdown }}s</text>
    </view>

    <!-- 主内容区 -->
    <view style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh;">
      <!-- Logo -->
      <view
        :style="{
          width: '128px', height: '128px', marginBottom: '24px', borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          opacity: logoAnimated ? 1 : 0, transform: logoAnimated ? 'scale(1)' : 'scale(0.75)',
          transition: 'all 0.7s ease-out'
        }"
      >
        <image src="/static/images/logo.jpg" mode="aspectFill" style="width: 100%; height: 100%;" />
      </view>

      <!-- 品牌名 -->
      <text
        :style="{
          fontFamily: 'Noto Serif SC, serif', fontSize: '30px', fontWeight: 'bold',
          color: '#ffffff', marginBottom: '12px', letterSpacing: '0.2em',
          opacity: logoAnimated ? 1 : 0,
          transition: 'all 0.5s ease-out', transitionDelay: '200ms'
        }"
      >
        热卜国学
      </text>

      <!-- Slogan -->
      <text
        :style="{
          fontSize: '16px', color: '#C9A96E', letterSpacing: '0.3em',
          opacity: sloganVisible ? 1 : 0,
          transition: 'all 0.5s ease-out'
        }"
      >
        探寻东方智慧
      </text>

      <!-- 底部版权 -->
      <view style="position: absolute; bottom: 32px; left: 0; right: 0; text-align: center;">
        <text style="font-size: 11px; color: rgba(255,255,255,0.3);">Copyright 2024 热卜国学 All Rights Reserved</text>
      </view>
    </view>

    <!-- 广告展示阶段 -->
    <view v-if="phase === 'ad' && ad" style="position: absolute; inset: 0; background: #000;">
      <view
        @click="goHome"
        style="position: absolute; top: 48px; right: 16px; z-index: 20; padding: 8px 16px; border-radius: 9999px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3);"
      >
        <text style="color: #fff; font-size: 14px; font-weight: 500;">跳过 {{ adCountdown }}s</text>
      </view>
      <view style="width: 100%; height: 100%;" @click="handleAdClick">
        <image :src="ad.image" mode="aspectFill" style="width: 100%; height: 100%;" />
      </view>
      <view style="position: absolute; bottom: 24px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <view style="width: 24px; height: 24px; border-radius: 4px; overflow: hidden;">
          <image src="/static/images/logo.jpg" mode="aspectFill" style="width: 100%; height: 100%;" />
        </view>
        <text style="color: rgba(255,255,255,0.6); font-size: 12px;">热卜国学</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface SplashAd {
  id: string
  image: string
  link: string
  duration: number
}

const phase = ref<'brand' | 'ad'>('brand')
const countdown = ref(3)
const logoAnimated = ref(false)
const sloganVisible = ref(false)
const ad = ref<SplashAd | null>(null)
const adCountdown = ref(5)

let timers: ReturnType<typeof setTimeout>[] = []

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' })
}

function handleAdClick() {
  if (ad.value?.link) {
    if (ad.value.link.startsWith('/')) {
      uni.navigateTo({ url: ad.value.link })
    }
  }
}

onMounted(() => {
  timers.push(setTimeout(() => { logoAnimated.value = true }, 100))
  timers.push(setTimeout(() => { sloganVisible.value = true }, 600))

  const brandTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(brandTimer)
      if (ad.value) {
        phase.value = 'ad'
        adCountdown.value = ad.value?.duration || 5
      } else {
        goHome()
      }
    }
  }, 1000)
  timers.push(brandTimer as any)

  const adTimer = setInterval(() => {
    if (phase.value !== 'ad') return
    adCountdown.value--
    if (adCountdown.value <= 0) {
      clearInterval(adTimer)
      goHome()
    }
  }, 1000)
  timers.push(adTimer as any)
})

onUnmounted(() => {
  timers.forEach(t => clearTimeout(t))
})
</script>
