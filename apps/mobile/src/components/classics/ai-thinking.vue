<script setup lang="ts">
/**
 * AI 研读中动态卡 —— 长耗时（20-60s）LLM 等待反馈组件
 * 董事长反馈：划线 AI 翻译等待过程要有动态效果，否则用户没等出结果就走了。
 *
 * 设计三件套（有文化气质的等待，不是干转圈）：
 *  ① 阶段性文案轮播（4s/10s/20s 三次推进·淡入淡出）——让用户感到"在推进"
 *  ② 墨点晕开动画（三枚墨点依次晕染·纯 CSS transform/opacity·X5 兼容，不用 filter/lottie）
 *  ③ 伪进度条（时间指数函数缓进渐近 ~90%·结果到达组件随 v-if 卸载=瞬间"充满"换真内容）
 *
 * 用法：<ai-thinking mode="translate" />（听书页/阅读器点句等待处复用）
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

type AiThinkMode = 'translate' | 'interpret' | 'lookup'

const props = withDefaults(
  defineProps<{
    mode?: AiThinkMode
    /** 请求发起时刻（epoch ms）：抽屉关闭重开导致组件重挂载时，凭它续接进度/文案阶段而非从头再来 */
    since?: number
  }>(),
  { mode: 'translate', since: 0 },
)

/** 各动作的阶段文案组（与真实生成过程节奏对应，末条兜底长等待） */
const PHASE_TEXTS: Record<AiThinkMode, string[]> = {
  translate: ['正在研读原文…', '正在查证字词典故…', '正在组织白话译文…', '内容较长，AI 正在细细斟酌…'],
  interpret: ['正在研读原文…', '正在梳理背景与典故…', '正在阐发义理与要点…', '内容较长，AI 正在细细斟酌…'],
  lookup: ['正在检索古汉语字库…', '正在查证本义与引申…', '正在整理释义与用例…', '内容较长，AI 正在细细斟酌…'],
}
/** 阶段切换时间点（ms）：0s → 4s → 10s → 20s（末条常驻） */
const PHASE_AT = [0, 4000, 10000, 20000]

const phaseIdx = ref(0)
const fading = ref(false)
const progress = ref(4) // 起步即有一点，避免"空条"观感
const phaseText = computed(() => (PHASE_TEXTS[props.mode] || PHASE_TEXTS.translate)[phaseIdx.value] || '')

let timer: ReturnType<typeof setInterval> | null = null
let fadeTimer: ReturnType<typeof setTimeout> | null = null
let startedAt = 0

onMounted(() => {
  startedAt = props.since > 0 ? props.since : Date.now()
  timer = setInterval(() => {
    const t = Date.now() - startedAt
    // 伪进度：指数渐近曲线（5s≈30% / 20s≈73% / 40s≈87%），封顶 90% 留"最后一口气"
    progress.value = Math.max(4, Math.min(90, Math.round(90 * (1 - Math.exp(-t / 12000)))))
    // 阶段文案：到点先淡出，换词后淡入
    let next = 0
    for (let i = 0; i < PHASE_AT.length; i++) if (t >= PHASE_AT[i]) next = i
    if (next !== phaseIdx.value && !fading.value) {
      fading.value = true
      fadeTimer = setTimeout(() => {
        phaseIdx.value = next
        fading.value = false
      }, 280)
    }
  }, 250)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (fadeTimer) clearTimeout(fadeTimer)
})
</script>

<template>
  <view class="ait">
    <view class="ait-top">
      <!-- 三枚墨点依次晕开（transform/opacity only） -->
      <view class="ait-ink">
        <view v-for="n in 3" :key="n" class="ait-drop" :style="{ animationDelay: (n - 1) * 0.4 + 's' }" />
      </view>
      <text class="ait-txt" :class="{ 'ait-txt--hide': fading }">{{ phaseText }}</text>
    </view>
    <!-- 伪进度条 + shimmer 流光 -->
    <view class="ait-bar">
      <view class="ait-bar-fill" :style="{ width: progress + '%' }" />
      <view class="ait-bar-shimmer" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.ait {
  min-width: 340rpx;
  padding: 6rpx 2rpx 2rpx;
}
.ait-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 44rpx;
}

/* 墨点晕开：从浓缩小点晕染放大变淡，再收回（呼吸循环） */
.ait-ink {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-shrink: 0;
}
.ait-drop {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #78350f;
  animation: ait-bloom 1.9s ease-in-out infinite;
}
@keyframes ait-bloom {
  0% { transform: scale(0.4); opacity: 0.85; }
  55% { transform: scale(1.35); opacity: 0.16; }
  100% { transform: scale(0.4); opacity: 0.85; }
}

/* 阶段文案：宋体衬线 + 淡入淡出切换 */
.ait-txt {
  font-family: var(--font-serif, 'Songti SC', serif);
  font-size: 25rpx;
  color: #92400e;
  line-height: 1.5;
  opacity: 1;
  transition: opacity 0.28s ease;
}
.ait-txt--hide { opacity: 0; }

/* 伪进度条：缓进渐近 ~90%，流光 shimmer 提示"在干活" */
.ait-bar {
  position: relative;
  height: 8rpx;
  margin-top: 18rpx;
  background: rgba(201, 169, 110, 0.18);
  border-radius: 999rpx;
  overflow: hidden;
}
.ait-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #c9a96e, #d97706);
  border-radius: 999rpx;
  transition: width 0.3s linear;
}
.ait-bar-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  width: 34%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
  animation: ait-shimmer 1.6s linear infinite;
}
@keyframes ait-shimmer {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(400%); }
}
</style>
