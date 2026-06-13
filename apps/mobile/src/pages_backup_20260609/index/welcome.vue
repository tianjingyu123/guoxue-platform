<template>
  <view class="page">
    <!-- 背景装饰 -->
    <view class="bg-layer">
      <view class="bg-gradient" />
      <view class="bg-stars">
        <view
          v-for="i in 20"
          :key="i"
          class="star"
          :style="starStyle(i)"
        />
      </view>
      <view class="bg-glow" />
    </view>

    <view class="content">
      <!-- Logo -->
      <view
        class="logo-area"
        :class="{ show: showContent }"
      >
        <view class="logo-circle">
          <text class="logo-icon">
            🏛
          </text>
        </view>
      </view>

      <!-- 欢迎文字 -->
      <view
        class="text-area"
        :class="{ show: showContent }"
      >
        <text class="welcome-line">
          {{ userName ? userName + '，欢迎来到' : '欢迎来到' }}
        </text>
        <text class="brand-name">
          国学传统文化平台
        </text>
      </view>

      <!-- Slogan -->
      <text
        class="slogan"
        :class="{ show: showSlogan }"
      >
        探寻东方智慧，传承千年文化
      </text>

      <!-- 进入按钮 -->
      <view
        class="btn-area"
        :class="{ show: showButton }"
      >
        <view
          class="btn-enter"
          @click="enter"
        >
          <text>进入平台</text>
          <text class="btn-countdown">
            ({{  countdown }}s)
          </text>
        </view>
      </view>

      <!-- 装饰 -->
      <view
        class="deco-line"
        :class="{ show: showButton }"
      >
        <view class="deco-bar" />
        <view class="deco-dot" />
        <view class="deco-bar" />
      </view>

      <!-- 底部提示 -->
      <text
        class="bottom-tip"
        :class="{ show: showButton }"
      >
        {{  hasInterests ? '即将进入首页' : '即将进入兴趣选择' }}
      </text>
    </view>

    <view class="footer-copy">
      国学平台 · 传承东方智慧
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { authApi } from '../../api'

const showContent = ref(false); const showSlogan = ref(false); const showButton = ref(false)
const countdown = ref(3); const hasInterests = ref<boolean | null>(null); const userName = ref('')

let timer: any = null

onMounted(async () => {
  try {
    const profile = await authApi.getProfile() as any
    userName.value = profile?.nickname || profile?.username || ''
    hasInterests.value = profile?.interests?.length > 0
  } catch { hasInterests.value = false }

  // 动画序列
  setTimeout(() => showContent.value = true, 100)
  setTimeout(() => showSlogan.value = true, 600)
  setTimeout(() => showButton.value = true, 1000)

  // 倒计时
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      navigate()
    }
  }, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

function navigate() {
  if (hasInterests.value === null) return
  uni.reLaunch({ url: hasInterests.value ? '/pages/index/index' : '/pages/index/interests-guide' })
}

function enter() {
  if (timer) clearInterval(timer)
  uni.reLaunch({ url: '/pages/index/interests-guide' })
}

function starStyle(i: number) {
  const size = Math.random() * 4 + 2
  return {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: `${size}rpx`,
    height: `${size}rpx`,
    animationDelay: `${Math.random() * 3}s`,
    opacity: Math.random() * 0.5 + 0.3,
  }
}
</script>

<style scoped>
.page { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
.bg-layer { position: absolute; inset: 0; }
.bg-gradient { width: 100%; height: 100%; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); }
.bg-stars { position: absolute; inset: 0; }
.star { position: absolute; background: #fff; border-radius: 50%; animation: twinkle 2s ease-in-out infinite alternate; }
@keyframes twinkle { from { opacity: 0.3; } to { opacity: 0.8; } }
.bg-glow { position: absolute; top: 25%; left: 50%; transform: translateX(-50%); width: 600rpx; height: 400rpx; background: rgba(201,169,110,0.08); border-radius: 50%; filter: blur(100rpx); }
.content { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 0 64rpx; }
.logo-area { margin-bottom: 48rpx; transition: all 0.7s ease-out; opacity: 0; transform: scale(0.9); }
.logo-area.show { opacity: 1; transform: scale(1); }
.logo-circle { width: 160rpx; height: 160rpx; border-radius: 50%; background: linear-gradient(135deg, #C9A96E, #A67C52); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 80rpx rgba(201,169,110,0.4); }
.logo-icon { font-size: 72rpx; }
.text-area { text-align: center; transition: all 0.7s ease-out 0.1s; opacity: 0; transform: translateY(16rpx); }
.text-area.show { opacity: 1; transform: translateY(0); }
.welcome-line { font-size: 36rpx; color: rgba(255,255,255,0.9); display: block; margin-bottom: 12rpx; }
.brand-name { font-size: 52rpx; font-weight: bold; background: linear-gradient(90deg, #C9A96E, #E8D5B0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 4rpx; }
.slogan { font-size: 28rpx; color: rgba(255,255,255,0.6); margin-top: 40rpx; transition: all 0.7s ease-out; opacity: 0; transform: translateY(16rpx); }
.slogan.show { opacity: 1; transform: translateY(0); }
.btn-area { margin-top: 80rpx; transition: all 0.7s ease-out; opacity: 0; transform: translateY(16rpx); }
.btn-area.show { opacity: 1; transform: translateY(0); }
.btn-enter { padding: 20rpx 80rpx; border-radius: 48rpx; background: linear-gradient(135deg, #C41E3A, #9B1B30); color: #fff; font-size: 30rpx; font-weight: 500; box-shadow: 0 8rpx 40rpx rgba(196,30,58,0.4); display: flex; align-items: center; gap: 12rpx; }
.btn-countdown { font-size: 24rpx; opacity: 0.7; }
.deco-line { display: flex; align-items: center; gap: 16rpx; margin-top: 80rpx; transition: all 0.7s ease-out 0.5s; opacity: 0; }
.deco-line.show { opacity: 1; }
.deco-bar { width: 80rpx; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent); }
.deco-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(201,169,110,0.5); }
.bottom-tip { font-size: 22rpx; color: rgba(255,255,255,0.3); margin-top: 32rpx; transition: all 0.7s ease-out 0.7s; opacity: 0; }
.bottom-tip.show { opacity: 1; }
.footer-copy { position: absolute; bottom: 64rpx; left: 0; right: 0; text-align: center; font-size: 20rpx; color: rgba(255,255,255,0.2); z-index: 10; }
</style>
