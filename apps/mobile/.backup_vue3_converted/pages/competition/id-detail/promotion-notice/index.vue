<template>
  <view class="min-h-screen bg-gradient-to-b from-amber-50 to-[#FAF8F5]">
    <!-- 庆祝粒子 -->
    <view v-if="showConfetti" class="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <view v-for="i in 50" :key="i" class="absolute w-2 h-2 rounded-full"
        :style="{
          left: Math.random() * 100 + '%',
          backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          animationDelay: (Math.random() * 3) + 's',
          animationDuration: (3 + Math.random() * 2) + 's',
          animationName: 'confetti-fall',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite'
        }"
      />
    </view>

    <!-- 顶部操作 -->
    <header class="sticky top-0 z-40 bg-transparent">
      <view class="flex items-center justify-between px-4 h-11">
        <view @click="goBack" class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
          <text class="text-lg text-foreground">‹</text>
        </view>
        <view class="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
          <text class="text-base"></text>
        </view>
      </view>
    </header>

    <!-- 庆祝动画区域 -->
    <view class="text-center pt-8 pb-6 px-4">
      <view class="relative inline-block mb-4">
        <text class="absolute -top-2 -left-4 text-base text-amber-400 animate-pulse"></text>
        <text class="absolute -top-4 right-0 text-sm text-amber-300 animate-pulse"></text>
        <text class="absolute bottom-0 -right-4 text-base text-amber-500 animate-pulse"></text>
        <view class="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
          <text class="text-5xl text-white">👑</text>
        </view>
      </view>
      <text class="text-3xl font-bold text-amber-600 block mb-2">恭喜晋级！</text>
      <text class="text-muted-foreground">您已成功晋级{{ promotionData.nextRound }}</text>
    </view>

    <!-- 赛事信息 -->
    <view class="px-4 mb-4">
      <text class="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded inline-flex items-center gap-1">
        <text></text> {{ promotionData.competitionTitle }}
      </text>
    </view>

    <!-- 选手信息卡片 -->
    <view class="px-4 mb-4">
      <view class="rounded-xl p-4 border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <view class="flex items-center gap-4">
          <view class="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
            <text class="text-2xl font-bold text-amber-600">{{ promotionData.participant.name.slice(0, 1) }}</text>
          </view>
          <view class="flex-1">
            <text class="font-bold text-lg block">{{ promotionData.participant.name }}</text>
            <text class="text-sm text-muted-foreground">参赛编号: {{ promotionData.participant.participantNo }}</text>
          </view>
        </view>
        <view class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-amber-100">
          <view class="text-center">
            <text class="text-2xl font-bold text-primary block">{{ promotionData.participant.rank }}</text>
            <text class="text-xs text-muted-foreground">排名</text>
          </view>
          <view class="text-center">
            <text class="text-2xl font-bold text-amber-600 block">{{ promotionData.participant.score }}</text>
            <text class="text-xs text-muted-foreground">得分</text>
          </view>
          <view class="text-center">
            <text class="text-2xl font-bold text-green-600 block">{{ Math.round((1 - promotionData.participant.rank / promotionData.participant.totalParticipants) * 100) }}%</text>
            <text class="text-xs text-muted-foreground">超越选手</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 下一轮比赛信息 -->
    <view class="px-4 mb-4">
      <view class="bg-white rounded-xl p-4 border border-border/50 shadow-sm">
        <text class="font-bold block mb-3"> {{ promotionData.nextRoundInfo.name }}赛程安排</text>
        <view class="space-y-3 text-sm">
          <view class="flex items-start gap-3">
            <text class="text-muted-foreground mt-0.5">🕐</text>
            <view>
              <text class="text-muted-foreground block">比赛时间</text>
              <text class="font-medium">{{ promotionData.nextRoundInfo.startTime }} - {{ promotionData.nextRoundInfo.endTime }}</text>
            </view>
          </view>
          <view class="flex items-start gap-3">
            <text class="text-muted-foreground mt-0.5"></text>
            <view>
              <text class="text-muted-foreground block">比赛形式</text>
              <text class="font-medium">{{ promotionData.nextRoundInfo.format }}</text>
            </view>
          </view>
        </view>
        <view class="mt-4 p-3 bg-secondary rounded-xl">
          <text class="text-sm font-medium mb-2 block">比赛要求</text>
          <view class="text-sm text-ink-soft space-y-1">
            <view v-for="(req, i) in promotionData.nextRoundInfo.requirements" :key="i" class="flex items-start gap-2">
              <text class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0 inline-block" />
              <text>{{ req }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="px-4 mb-6">
      <view class="rounded-xl p-4 bg-amber-50 border border-amber-200">
        <text class="font-medium text-amber-800 mb-2 flex items-center gap-1">
          <text></text> 温馨提示
        </text>
        <view class="text-sm text-amber-700 space-y-1">
          <text v-for="(tip, i) in promotionData.nextRoundInfo.tips" :key="i" class="block">• {{ tip }}</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="px-4 pb-6 space-y-3">
      <view @click="goToPoster" class="w-full text-center py-3 rounded-xl bg-primary text-white text-sm font-medium">
        ⬇ 生成专属海报
      </view>
      <view class="grid grid-cols-2 gap-3">
        <view @click="goTo('/pages/competition/' + competitionId + '/id-detail/result/index')" class="text-center py-3 rounded-xl border border-border text-sm">
          查看排行榜
        </view>
        <view @click="goTo('/pages/competition/' + competitionId + '/id-detail/index')" class="text-center py-3 rounded-xl border border-border text-sm">
          查看赛程
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const competitionId = ref('1')

const confettiColors = ['#C41E3A', '#C9A96E', '#4A90D9', '#E67E22', '#27AE60']
const showConfetti = ref(true)
let confettiTimer: ReturnType<typeof setTimeout> | null = null

const promotionData = {
  competitionTitle: '2024热卜杯·八字命理大赛',
  currentRound: '初赛',
  nextRound: '复赛',
  participant: { name: '张三', avatar: '', participantNo: 'BZ20240128', rank: 128, score: 86, totalParticipants: 1286 },
  nextRoundInfo: {
    name: '复赛', type: 'case', startTime: '2024-04-15 09:00', endTime: '2024-04-20 18:00',
    description: '真实案例分析，提交书面报告', format: '提交案例分析报告',
    requirements: ['报告字数不少于3000字', '需包含案例背景、分析过程、结论三部分', '4月20日18:00前提交'],
    tips: ['建议提前准备素材', '注意时间管理，避免最后时刻提交', '报告需原创，禁止抄袭'],
  },
}

onMounted(() => {
  // 从路由参数获取competitionId
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage && currentPage.$page && currentPage.$page.options) {
    const id = currentPage.$page.options.id
    if (id) competitionId.value = id
  }

  // 5秒后关闭庆祝粒子
  confettiTimer = setTimeout(() => {
    showConfetti.value = false
  }, 5000)
})

onBeforeUnmount(() => {
  if (confettiTimer) clearTimeout(confettiTimer)
})

function goBack() { uni.navigateBack() }

function goTo(url: string) { uni.navigateTo({ url }) }

function goToPoster() {
  uni.navigateTo({ url: '/pages/competition/' + competitionId.value + '/id-detail/poster/index' })
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
<style>
@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}
</style>
