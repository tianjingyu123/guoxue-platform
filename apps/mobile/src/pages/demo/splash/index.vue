<template>
  <view class="fixed inset-0 z-[9999] overflow-hidden">
    <!-- 品牌展示阶段 -->
    <view v-if="phase === 'brand'" class="absolute inset-0 flex flex-col items-center justify-center">
      <!-- 背景 - 深灰蓝色调渐变 -->
      <view class="absolute inset-0 bg-gradient-to-b from-[#1A1F2E] via-[#252A38] to-[#1A1F2E]">
        <!-- 山峦剪影层 -->
        <view class="absolute bottom-0 left-0 right-0 h-[40%]">
          <svg
            class="absolute bottom-0 left-0 right-0 w-full h-full opacity-20"
            viewBox="0 0 1440 400"
            preserveAspectRatio="none"
          >
            <path
              fill="#2A3040"
              d="M0,400 L0,200 Q200,100 400,180 Q600,260 800,150 Q1000,40 1200,120 Q1400,200 1440,150 L1440,400 Z"
            />
          </svg>
          <svg
            class="absolute bottom-0 left-0 right-0 w-full h-full opacity-30"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="#252A38"
              d="M0,320 L0,160 Q180,80 360,140 Q540,200 720,100 Q900,0 1080,80 Q1260,160 1440,120 L1440,320 Z"
            />
          </svg>
        </view>

        <!-- 天边曙光 -->
        <view class="absolute top-[20%] left-0 right-0 h-[30%] bg-gradient-to-b from-transparent via-[#C9A96E]/5 to-transparent" />

        <!-- 微妙光晕 -->
        <view class="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#C9A96E]/10 rounded-full blur-[100px]" />
      </view>

      <!-- 右上角跳过按钮 -->
      <view
        @click="goHome"
        class="absolute top-12 right-4 z-20 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
      >
        <text class="text-white/80 text-sm font-medium">跳过 {{ countdown }}s</text>
      </view>

      <!-- 主内容区 - Logo + 品牌名 + Slogan -->
      <view class="relative z-10 flex flex-col items-center">
        <!-- Logo - 缩放淡入动画 -->
        <view
          :class="[
            'w-32 h-32 mb-6 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden transition-all duration-700 ease-out',
            logoAnimated ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
          ]"
        >
          <image
            src="https://picsum.photos/seed/rebu/128/128"
            mode="aspectFill"
            class="w-full h-full"
          />
        </view>

        <!-- 品牌名 -->
        <text
          :class="[
            'font-serif text-3xl font-bold text-white tracking-widest mb-3 transition-all duration-500',
            logoAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          ]"
        >
          热卜国学
        </text>

        <!-- Slogan -->
        <text
          :class="[
            'text-base text-[#C9A96E] tracking-[0.3em] transition-all duration-500',
            sloganVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          ]"
        >
          探寻东方智慧
        </text>
      </view>

      <!-- 底部版权 -->
      <view class="absolute bottom-8 left-0 right-0 text-center">
        <text class="text-[11px] text-white/30 tracking-wide">
          Copyright 2024 热卜国学 All Rights Reserved
        </text>
      </view>
    </view>

    <!-- 广告展示阶段 -->
    <view v-if="phase === 'ad' && ad" class="absolute inset-0 bg-black">
      <!-- 右上角跳过按钮 -->
      <view
        @click="goHome"
        class="absolute top-12 right-4 z-20 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/30"
      >
        <text class="text-white text-sm font-medium">跳过 {{ adCountdown }}s</text>
      </view>

      <!-- 广告图片 -->
      <view @click="handleAdClick" class="w-full h-full">
        <image
          :src="ad.image"
          alt="广告"
          mode="aspectFill"
          class="w-full h-full"
        />
      </view>

      <!-- 底部品牌标识 -->
      <view class="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        <view class="w-6 h-6 rounded overflow-hidden">
          <image src="https://picsum.photos/seed/rebu/48/48" mode="aspectFill" class="w-full h-full" />
        </view>
        <text class="text-white/60 text-xs">热卜国学</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface SplashAd {
  id: string
  image: string
  link: string
  duration: number
}

const phase = ref<"brand" | "ad">("brand");
const countdown = ref(3);
const logoAnimated = ref(false);
const sloganVisible = ref(false);
const ad = ref<SplashAd | null>(null);
const adCountdown = ref(5);

let brandTimer: ReturnType<typeof setInterval> | null = null;
let adTimer: ReturnType<typeof setInterval> | null = null;

function goHome() {
  uni.switchTab({ url: "/pages/index/index" });
}

function handleAdClick() {
  if (ad.value?.link) {
    window.location.href = ad.value.link;
  }
}

// 品牌Logo动画
onMounted(() => {
  setTimeout(() => { logoAnimated.value = true; }, 100);
  setTimeout(() => { sloganVisible.value = true; }, 600);

  // 品牌阶段倒计时
  brandTimer = setInterval(() => {
    if (phase.value !== "brand") return;
    if (countdown.value <= 1) {
      clearInterval(brandTimer!);
      if (ad.value) {
        phase.value = "ad";
        adCountdown.value = ad.value.duration;
      } else {
        goHome();
      }
      return;
    }
    countdown.value--;
  }, 1000);

  // 广告阶段倒计时
  adTimer = setInterval(() => {
    if (phase.value !== "ad") return;
    if (adCountdown.value <= 1) {
      clearInterval(adTimer!);
      goHome();
      return;
    }
    adCountdown.value--;
  }, 1000);
});

onUnmounted(() => {
  if (brandTimer) clearInterval(brandTimer);
  if (adTimer) clearInterval(adTimer);
});
</script>
