<template>
  <view class="fixed inset-0 z-[9999] overflow-hidden bg-gradient-to-b from-[#1A1F2E] via-[#252A38] to-[#1A1F2E]">
    <!-- 山峦剪影层 -->
    <view class="absolute bottom-0 left-0 right-0 h-[40%]">
      <view class="absolute bottom-0 left-0 right-0 w-full h-full opacity-20">
        <!-- Mountain path 1 -->
        <svg class="w-full h-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path fill="#2A3040" d="M0,400 L0,200 Q200,100 400,180 Q600,260 800,150 Q1000,40 1200,120 Q1400,200 1440,150 L1440,400 Z" />
        </svg>
      </view>
      <view class="absolute bottom-0 left-0 right-0 w-full h-full opacity-30">
        <!-- Mountain path 2 -->
        <svg class="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#252A38" d="M0,320 L0,160 Q180,80 360,140 Q540,200 720,100 Q900,0 1080,80 Q1260,160 1440,120 L1440,320 Z" />
        </svg>
      </view>
    </view>

    <!-- 天边曙光 -->
    <view class="absolute top-[20%] left-0 right-0 h-[30%] bg-gradient-to-b from-transparent via-[#C9A96E]/5 to-transparent" />

    <!-- 金色光晕 -->
    <view class="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#C9A96E]/10 rounded-full blur-[100px]" />

    <!-- 右上角跳过按钮 -->
    <view
      @click="goHome"
      class="absolute top-12 right-4 z-20 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium"
    >
      跳过 {{ countdown }}s
    </view>

    <!-- 主内容区 -->
    <view class="relative z-10 flex flex-col items-center justify-center min-h-screen">
      <!-- Logo -->
      <view
        :class="[
          'w-32 h-32 mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 transition-all duration-700 ease-out',
          logoAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        ]"
      >
        <image src="/static/images/logo.jpg" alt="热卜" class="w-full h-full object-cover" />
      </view>

      <!-- 品牌名 -->
      <text
        :class="[
          'font-serif text-3xl font-bold text-white tracking-widest mb-3 transition-all duration-500 delay-200',
          logoAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        ]"
      >
        热卜国学
      </text>

      <!-- Slogan -->
      <text
        :class="[
          'text-base text-[#C9A96E] tracking-[0.3em] transition-all duration-500',
          sloganVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        ]"
      >
        探寻东方智慧
      </text>

      <!-- 底部版权 -->
      <view class="absolute bottom-8 left-0 right-0 text-center">
        <text class="text-[11px] text-white/30 tracking-wide">
          Copyright 2024 热卜国学 All Rights Reserved
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const countdown = ref(3)
const logoAnimated = ref(false)
const sloganVisible = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

onMounted(() => {
  // Logo 动画
  setTimeout(() => { logoAnimated.value = true }, 100)
  // Slogan 动画
  setTimeout(() => { sloganVisible.value = true }, 600)

  // 倒计时
  countdownTimer = setInterval(() => {
    if (countdown.value <= 1) {
      if (countdownTimer) clearInterval(countdownTimer)
      goHome()
      return
    }
    countdown.value--
  }, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.transition-all {
  transition: all 0.3s ease;
}
</style>
