<template>
  <view class="page">
    <!-- 柔和光晕 -->
    <view class="glow" />

    <view class="center">
      <!-- 热卜 LOGO -->
      <view class="logo-wrap" :class="{ 'logo-in': true }">
        <view class="logo-box">
          <image class="logo-img" :src="logoSrc" mode="aspectFill" />
        </view>
      </view>

      <!-- 欢迎标题 -->
      <view class="title-wrap" :class="{ 'fade-in': showTitle }">
        <text class="title">{{ userName ? userName + '，' : '' }}欢迎来到国学世界</text>
      </view>

      <!-- Slogan -->
      <text class="slogan" :class="{ 'fade-in': showSlogan }">{{ slogan }}</text>

      <!-- 开始探索按钮 -->
      <view
        class="explore-btn"
        :class="{ 'fade-in': showButton }"
        hover-class="btn-hover"
        @tap="handleNavigate"
      >
        <template v-if="loading">
          <text class="btn-text">加载中…</text>
        </template>
        <template v-else>
          <text class="btn-text">开始探索</text>
          <AppIcon name="arrow-right" :size="16" color="#ffffff" />
          <text class="btn-count">({{ countdown }}s)</text>
        </template>
      </view>

      <!-- 装饰分隔线 -->
      <view class="divider" :class="{ 'fade-in': showButton }">
        <view class="line line-left" />
        <view class="dot" />
        <view class="line line-right" />
      </view>
    </view>

    <!-- 底部品牌落款 -->
    <view class="footer">
      <text class="footer-text">{{ brandName }} · {{ tagline }}</text>
    </view>
  </view>

  </view>
  </view>
  </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { navigateTo, reLaunch } from '@/utils/router'
import { BRAND } from '@/lib/brand'

const logoSrc = ref('/images/logo.jpg')
const slogan = BRAND.slogan
const brandName = BRAND.name
const tagline = BRAND.tagline

const countdown = ref(3)
const showTitle = ref(false)
const showSlogan = ref(false)
const showButton = ref(false)
const loading = ref(true)
const userName = ref('')
const hasInterests = ref<boolean | null>(null)

let timers: ReturnType<typeof setTimeout>[] = []
let countdownTimer: ReturnType<typeof setInterval> | null = null
let navigated = false

// 取用户资料（mock：无后端时给默认值，演示完整欢迎态）
function loadProfile() {
  // 原型走 authApi.getProfile()，此处 mock
  setTimeout(() => {
    userName.value = '道友'
    hasInterests.value = true
    loading.value = false
  }, 300)
}

function handleNavigate() {
  if (loading.value || navigated) return
  navigated = true
  if (countdownTimer) clearInterval(countdownTimer)
  // 有兴趣标签进首页，否则进兴趣引导（兴趣引导页未迁，统一回首页兜底）
  if (hasInterests.value) {
    reLaunch('/')
  } else {
    navigateTo('/interests-guide')
  }
}

onMounted(() => {
  loadProfile()
  // 渐入动画序列
  timers.push(setTimeout(() => (showTitle.value = true), 1000))
  timers.push(setTimeout(() => (showSlogan.value = true), 1500))
  timers.push(setTimeout(() => (showButton.value = true), 2000))
  // 倒计时
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      handleNavigate()
    }
  }, 1000)
})

onUnmounted(() => {
  timers.forEach(clearTimeout)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #f7f0e3 0%, #efe4cf 100%);
}

.glow {
  position: absolute;
  left: 50%;
  top: 33%;
  width: 600rpx;
  height: 600rpx;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.18);
  filter: blur(120rpx);
}

.center {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 64rpx;
}

/* LOGO 缩放渐入 */
.logo-wrap {
  margin-bottom: 80rpx;
  opacity: 0;
  transform: scale(0.9);
  animation: logoIn 1s ease-out forwards;
}
@keyframes logoIn {
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.logo-box {
  width: 208rpx;
  height: 208rpx;
  border-radius: 48rpx;
  overflow: hidden;
  box-shadow: 0 16rpx 48rpx rgba(58, 50, 38, 0.18);
  border: 1px solid rgba(201, 169, 110, 0.3);
}
.logo-img {
  width: 208rpx;
  height: 208rpx;
}

/* 渐入通用 */
.title-wrap,
.slogan,
.explore-btn,
.divider {
  opacity: 0;
  transform: translateY(12rpx);
  transition: all 1s ease-out;
}
.fade-in {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

.title-wrap {
  text-align: center;
}
.title {
  font-family: serif;
  font-size: 52rpx;
  font-weight: 700;
  color: #3a3226;
}

.slogan {
  margin-top: 32rpx;
  font-family: serif;
  font-size: 32rpx;
  color: #7a6f60;
}

.explore-btn {
  margin-top: 112rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 28rpx 80rpx;
  border-radius: 48rpx;
  background: #c41e3a;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.28);
  transition: all 0.7s ease-out;
}
.btn-hover {
  transform: scale(0.95);
}
.btn-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
}
.btn-count {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.7);
}

.divider {
  margin-top: 128rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
}
.line {
  width: 96rpx;
  height: 1px;
}
.line-left {
  background: linear-gradient(to right, transparent, rgba(201, 169, 110, 0.6));
}
.line-right {
  background: linear-gradient(to left, transparent, rgba(201, 169, 110, 0.6));
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(201, 169, 110, 0.6);
}

.footer {
  position: absolute;
  bottom: 64rpx;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 10;
}
.footer-text {
  font-size: 22rpx;
  color: rgba(122, 111, 96, 0.6);
}
</style>
