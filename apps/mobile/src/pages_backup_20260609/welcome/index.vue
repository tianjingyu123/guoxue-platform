<template>
  <view class="welcome-page">
    <!-- 背景装饰 - 星辰 -->
    <view class="stars-bg">
      <view
        v-for="i in 30"
        :key="i"
        class="star"
        :style="{
          left: starPositions[i-1]?.left + '%',
          top: starPositions[i-1]?.top + '%',
          animationDelay: starPositions[i-1]?.delay + 's',
          opacity: starPositions[i-1]?.opacity
        }"
      />
      <!-- 金色光晕 -->
      <view class="glow-gold" />
      <view class="glow-red" />
    </view>

    <!-- 主要内容 -->
    <view class="main-content">
      <!-- 欢迎图标 -->
      <view class="logo-wrap" :class="{ show: showContent }">
        <view class="logo-circle">
          <text class="logo-star">✦</text>
        </view>
      </view>

      <!-- 欢迎文字 -->
      <view class="welcome-text" :class="{ show: showContent }">
        <text class="welcome-title">{{ userName ? userName + '，' : '' }}欢迎来到</text>
        <text class="brand-name">热卜国学</text>
      </view>

      <!-- Slogan -->
      <view class="slogan" :class="{ show: showSlogan }">
        <text class="slogan-main">探寻东方智慧，传承千年文化</text>
        <text class="slogan-sub">开启你的国学之旅</text>
      </view>

      <!-- 进入按钮 -->
      <view class="enter-btn-wrap" :class="{ show: showButton }">
        <view class="enter-btn" @click="handleNavigate">
          <text v-if="hasInterests === null">加载中...</text>
          <template v-else>
            <text>进入平台</text>
            <text class="countdown-text">({{ countdown }}s)</text>
          </template>
        </view>
      </view>

      <!-- 装饰分隔线 -->
      <view class="divider-row" :class="{ show: showButton }">
        <view class="divider-line left" />
        <view class="divider-dot" />
        <view class="divider-line right" />
      </view>

      <!-- 底部提示 -->
      <text class="bottom-hint" :class="{ show: showButton }">
        {{ hasInterests ? '即将进入首页' : '即将进入兴趣选择' }}
      </text>
    </view>

    <!-- 底部版权 -->
    <view class="copyright">
      <text class="copyright-text">热卜国学 - 传承东方智慧</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const countdown = ref(3)
const showContent = ref(false)
const showSlogan = ref(false)
const showButton = ref(false)
const hasInterests = ref<boolean | null>(null)
const userName = ref('')

const starPositions = ref<{ left: number; top: number; delay: number; opacity: number }[]>([])

onMounted(() => {
  // 生成星星位置
  starPositions.value = Array.from({ length: 30 }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    opacity: Math.random() * 0.5 + 0.3
  }))

  // 动画序列
  setTimeout(() => { showContent.value = true }, 100)
  setTimeout(() => { showSlogan.value = true }, 600)
  setTimeout(() => { showButton.value = true }, 1000)

  // 模拟检查用户兴趣
  setTimeout(() => { hasInterests.value = false }, 500)
})

let countdownTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  countdownTimer = setInterval(() => {
    if (countdown.value <= 1) {
      countdown.value = 0
      if (countdownTimer) clearInterval(countdownTimer)
      handleNavigate()
      return
    }
    countdown.value--
  }, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

function handleNavigate() {
  if (hasInterests.value === null) return
  const url = hasInterests.value ? '/pages/index/index' : '/pages/interests-guide/index'
  uni.redirectTo({ url })
}
</script>

<style scoped>
.welcome-page {
  position: fixed;
  inset: 0;
  background: linear-gradient(to bottom, #1a1a2e, #16213e, #0f0f23);
  overflow: hidden;
}

.stars-bg {
  position: absolute;
  inset: 0;
}

.star {
  position: absolute;
  width: 4rpx;
  height: 4rpx;
  background: #fff;
  border-radius: 50%;
  animation: starPulse 2s infinite;
}

@keyframes starPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.glow-gold {
  position: absolute;
  top: 25%;
  left: 50%;
  transform: translateX(-50%);
  width: 800rpx;
  height: 800rpx;
  background: rgba(201, 169, 110, 0.1);
  border-radius: 50%;
  filter: blur(200rpx);
}

.glow-red {
  position: absolute;
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
  width: 600rpx;
  height: 600rpx;
  background: rgba(196, 30, 58, 0.1);
  border-radius: 50%;
  filter: blur(160rpx);
}

.main-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 64rpx;
}

.logo-wrap {
  margin-bottom: 64rpx;
  transition: all 0.7s ease-out;
  opacity: 0;
  transform: scale(0.9);
}
.logo-wrap.show {
  opacity: 1;
  transform: scale(1);
}

.logo-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #C9A96E, #A67C52);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 80rpx rgba(201, 169, 110, 0.4);
}

.logo-star {
  font-size: 60rpx;
  color: #fff;
}

.welcome-text {
  text-align: center;
  transition: all 0.7s ease-out;
  opacity: 0;
  transform: translateY(8rpx);
}
.welcome-text.show {
  opacity: 1;
  transform: translateY(0);
}

.welcome-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}

.brand-name {
  font-size: 56rpx;
  font-weight: bold;
  background: linear-gradient(to right, #C9A96E, #E8D5B0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.slogan {
  margin-top: 48rpx;
  text-align: center;
  transition: all 0.7s ease-out;
  opacity: 0;
  transform: translateY(8rpx);
}
.slogan.show {
  opacity: 1;
  transform: translateY(0);
}

.slogan-main {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  display: block;
}

.slogan-sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8rpx;
}

.enter-btn-wrap {
  margin-top: 96rpx;
  transition: all 0.7s ease-out;
  opacity: 0;
  transform: translateY(8rpx);
}
.enter-btn-wrap.show {
  opacity: 1;
  transform: translateY(0);
}

.enter-btn {
  padding: 24rpx 80rpx;
  border-radius: 60rpx;
  background: linear-gradient(to right, #C41E3A, #9B1B30);
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 40rpx rgba(196, 30, 58, 0.4);
  display: flex;
  align-items: center;
}

.countdown-text {
  margin-left: 16rpx;
  color: rgba(255, 255, 255, 0.7);
}

.divider-row {
  margin-top: 128rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  transition: all 0.7s ease-out;
  opacity: 0;
}
.divider-row.show {
  opacity: 1;
}

.divider-line {
  width: 96rpx;
  height: 2rpx;
}
.divider-line.left {
  background: linear-gradient(to right, transparent, rgba(201, 169, 110, 0.5));
}
.divider-line.right {
  background: linear-gradient(to left, transparent, rgba(201, 169, 110, 0.5));
}

.divider-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.5);
}

.bottom-hint {
  margin-top: 48rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.7s ease-out;
  opacity: 0;
}
.bottom-hint.show {
  opacity: 1;
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
}
</style>
