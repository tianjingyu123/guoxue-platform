<template>
  <view class="page">
    <view class="brand-bg">
      <view class="logo-area">
        <text class="logo-text">热卜国学</text>
        <text class="slogan">传承千年智慧，启迪现代人生</text>
      </view>
      <view class="skip-btn" @click="skip">
        <text>跳过 {{countdown}}s</text>
      </view>
    </view>
    <view v-if="ad" class="ad-overlay" @click="goAd">
      <image :src="ad.image" class="ad-img" mode="aspectFill" />
      <view class="ad-countdown">广告 {{adCountdown}}s</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { systemApi } from '../../api'

const countdown = ref(3)
const adCountdown = ref(5)
const ad = ref<any>(null)
let timer: any = null

onMounted(async () => {
  try {
    const res: any = await systemApi.getBanners()
    if (res?.splash) ad.value = res.splash
  } catch {}
  startCountdown()
})

function startCountdown() {
  const target = ad.value ? adCountdown : countdown
  timer = setInterval(() => {
    if (ad.value) {
      adCountdown.value--
      if (adCountdown.value <= 0) goHome()
    } else {
      countdown.value--
      if (countdown.value <= 0) goHome()
    }
  }, 1000)
}

function skip() { goHome() }
function goHome() { clearInterval(timer); uni.reLaunch({ url: '/pages/index/index' }) }
function goAd() { if (ad.value?.link) { /* jump */ } }

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style>
.page { width: 100vw; height: 100vh; position: relative; }
.brand-bg {
  width: 100%; height: 100%;
  background: linear-gradient(180deg, #8B0000 0%, #C41E3A 40%, #E8D5C5 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.logo-area { text-align: center; animation: fadeInScale 0.8s ease-out; }
.logo-text { font-size: 36px; font-weight: bold; color: #fff; letter-spacing: 4px; font-family: 'Noto Serif SC', serif; }
.slogan { font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 12px; display: block; }
.skip-btn {
  position: absolute; top: 60px; right: 24px;
  background: rgba(255,255,255,0.2); border-radius: 16px; padding: 6px 16px;
}
.skip-btn text { color: #fff; font-size: 13px; }
.ad-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; }
.ad-img { width: 100%; height: 100%; }
.ad-countdown {
  position: absolute; top: 60px; right: 24px;
  background: rgba(0,0,0,0.5); border-radius: 16px; padding: 6px 16px; color: #fff; font-size: 13px;
}
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
</style>
