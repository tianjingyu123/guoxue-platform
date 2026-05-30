<template>
  <view class="page">
    <view class="center">
      <text class="welcome-text">欢迎来到</text>
      <text class="brand-text">国学传统文化平台</text>
      <text class="slogan">传承千年智慧 · 启迪现代人生</text>
    </view>
    <view class="btn-area">
      <button class="btn-enter" @click="enter">进入平台</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { authApi } from '../../api'

let timer: any = null

onMounted(async () => {
  try {
    const profile = await authApi.getProfile()
    timer = setTimeout(() => {
      const hasInterests = (profile as any)?.interests?.length > 0
      uni.reLaunch({ url: hasInterests ? '/pages/index/index' : '/pages/index/interests-guide' })
    }, 3000)
  } catch {
    timer = setTimeout(() => enter(), 3000)
  }
})

function enter() {
  if (timer) clearTimeout(timer)
  uni.reLaunch({ url: '/pages/index/interests-guide' })
}
</script>

<style>
.page {
  width: 100vw; height: 100vh;
  background: linear-gradient(180deg, #C41E3A 0%, #8B0000 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative;
}
.center { text-align: center; animation: fadeIn 1s ease-out; }
.welcome-text { font-size: 18px; color: rgba(255,255,255,0.9); display: block; }
.brand-text { font-size: 28px; font-weight: bold; color: #fff; margin-top: 12px; display: block; letter-spacing: 3px; font-family: 'Noto Serif SC', serif; }
.slogan { font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 16px; display: block; }
.btn-area { position: absolute; bottom: 80px; left: 24px; right: 24px; }
.btn-enter {
  width: 100%; height: 48px; border-radius: 24px;
  background: rgba(255,255,255,0.2); color: #fff; font-size: 16px;
  border: 1px solid rgba(255,255,255,0.4); text-align: center; line-height: 48px;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
