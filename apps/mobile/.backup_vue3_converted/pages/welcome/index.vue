<template>
  <view class="fixed inset-0 overflow-hidden" style="background:linear-gradient(180deg,#1a1a2e 0%,#16213e 50%,#0f0f23 100%)">
    <!-- 背景装饰 - 星辰点缀 -->
    <view class="absolute inset-0">
      <view v-for="(star, i) in stars" :key="i" class="absolute w-1 h-1 bg-white rounded-full" :style="{ left: star.left, top: star.top, animationDelay: star.delay, opacity: star.opacity }" />
      <!-- 金色光晕 -->
      <view class="absolute top-1/4 left-1/2 w-[400rpx] h-[400rpx] rounded-full" style="background:rgba(201,169,110,0.1);filter:blur(100px);transform:translateX(-50%)" />
      <view class="absolute bottom-1/4 left-1/2 w-[300rpx] h-[300rpx] rounded-full" style="background:rgba(196,30,58,0.1);filter:blur(80px);transform:translateX(-50%)" />
    </view>

    <!-- 主要内容 -->
    <view class="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
      <!-- 欢迎图标 -->
      <view :class="['mb-8 transition-all duration-700 ease-out', showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90']">
        <view class="w-20 h-20 rounded-full flex items-center justify-center" style="background:linear-gradient(135deg,#C9A96E,#A67C52);box-shadow:0 0 40px rgba(201,169,110,0.4)">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:40px;height:40px">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </view>
      </view>

      <!-- 欢迎文字 -->
      <view :class="['text-center transition-all duration-700 ease-out', showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']">
        <text class="text-2xl font-serif font-bold text-white block mb-2">{{ userName ? userName + '，' : '' }}欢迎来到</text>
        <text class="text-3xl font-serif font-bold block" style="background:linear-gradient(90deg,#C9A96E,#E8D5B0);-webkit-background-clip:text;color:transparent">热卜国学</text>
      </view>

      <!-- Slogan -->
      <view :class="['mt-6 transition-all duration-700 ease-out', showSlogan ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']">
        <text class="text-[15px] text-white/70 text-center block leading-relaxed">探寻东方智慧，传承千年文化</text>
        <text class="text-[13px] text-white/50 text-center block mt-1">开启你的国学之旅</text>
      </view>

      <!-- 进入按钮 -->
      <view
        :class="['mt-12 px-10 py-3 rounded-full text-white font-medium text-[15px] transition-all duration-300', showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4']"
        :style="{background:'linear-gradient(90deg,#C41E3A,#9B1B30)',boxShadow:'0 4px 20px rgba(196,30,58,0.4)'}"
        @click="handleNavigate"
      >
        <text v-if="hasInterests === null">加载中...</text>
        <text v-else>进入平台 <text class="text-white/70 ml-1">({{ countdown }}s)</text></text>
      </view>

      <!-- 装饰分隔线 -->
      <view :class="['mt-16 flex items-center gap-4 transition-all duration-700', showButton ? 'opacity-100' : 'opacity-0']">
        <view class="w-12 h-px" style="background:linear-gradient(90deg,transparent,rgba(201,169,110,0.5))" />
        <view class="w-1.5 h-1.5 rounded-full" style="background:rgba(201,169,110,0.5)" />
        <view class="w-12 h-px" style="background:linear-gradient(270deg,transparent,rgba(201,169,110,0.5))" />
      </view>

      <!-- 底部提示 -->
      <text :class="['mt-6 text-[12px] text-white/40 transition-all duration-700', showButton ? 'opacity-100' : 'opacity-0']">
        {{ hasInterests ? '即将进入首页' : '即将进入兴趣选择' }}
      </text>
    </view>

    <!-- 底部版权 -->
    <view class="absolute bottom-8 left-0 right-0 text-center">
      <text class="text-[11px] text-white/30">热卜国学 - 传承东方智慧</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const countdown = ref(3)
const showContent = ref(false)
const showSlogan = ref(false)
const showButton = ref(false)
const hasInterests = ref<boolean | null>(null)
const userName = ref('')

const stars = computed(() => {
  return Array.from({ length: 30 }, () => ({
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    delay: Math.random() * 2 + 's',
    opacity: Math.random() * 0.5 + 0.3,
  }))
})

let timers: ReturnType<typeof setTimeout>[] = []

function handleNavigate() {
  if (hasInterests.value === null) return
  if (hasInterests.value) {
    uni.reLaunch({ url: '/pages/index/index' })
  } else {
    uni.navigateTo({ url: '/pages/interests-guide/index' })
  }
}

onMounted(() => {
  // 动画序列
  timers.push(setTimeout(() => { showContent.value = true }, 100))
  timers.push(setTimeout(() => { showSlogan.value = true }, 600))
  timers.push(setTimeout(() => { showButton.value = true }, 1000))

  // 倒计时
  const countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      handleNavigate()
    }
  }, 1000)
  timers.push(countdownTimer as any)

  // 获取用户信息
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const options = currentPage?.$page?.options || currentPage?.options || {}
    userName.value = options.nickname || ''
    hasInterests.value = options.hasInterests === 'true'
  } catch (e) {
    hasInterests.value = false
  }
})

onUnmounted(() => {
  timers.forEach(t => clearTimeout(t))
})
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
