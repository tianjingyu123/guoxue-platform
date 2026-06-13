<template>
  <view class="min-h-screen bg-background">
    <!-- 顶部导航 -->
    <view class="bg-primary px-4 pt-12 pb-4 flex items-center justify-between">
      <view @click="goBack" class="w-8 h-8 flex items-center justify-center">
        <text class="text-white text-lg">←</text>
      </view>
      <text class="text-[17px] font-bold text-white">学习看板</text>
      <view @click="fetchData(true)" :class="['w-8 h-8 flex items-center justify-center', refreshing ? 'animate-spin' : '']">
        <text class="text-white">⟳</text>
      </view>
    </view>

    <!-- Loading skeleton -->
    <view v-if="loading" class="px-4 py-4 space-y-4 animate-pulse">
      <view class="h-24 bg-white rounded-2xl" />
      <view class="grid grid-cols-2 gap-3">
        <view v-for="i in 4" :key="i" class="h-28 bg-white rounded-2xl" />
      </view>
      <view class="h-44 bg-white rounded-2xl" />
      <view class="h-48 bg-white rounded-2xl" />
    </view>

    <!-- Content -->
    <view v-else class="px-4 py-4 space-y-4 pb-10">
      <!-- 连续学习徽章 -->
      <view class="bg-gradient-to-r from-primary to-primary/70 rounded-2xl p-4 relative overflow-hidden">
        <view class="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full" />
        <view class="absolute -right-2 -bottom-8 w-32 h-32 bg-white/5 rounded-full" />
        <view class="flex items-center justify-between relative z-10">
          <view>
            <view class="flex items-center gap-2 mb-1">
              <text class="text-yellow-400"></text>
              <text class="text-[13px] text-white/80 font-medium">连续学习</text>
            </view>
            <view class="flex items-baseline gap-1">
              <text class="text-[36px] font-black text-white leading-none">{{ d.streak }}</text>
              <text class="text-[14px] text-white/70">天</text>
            </view>
          </view>
          <view class="text-right">
            <text class="text-[13px] text-white/70 block mb-1">本周学习</text>
            <text class="text-[20px] font-bold text-white">{{ fmtMinutes(d.weeklyMinutes) }}</text>
          </view>
        </view>
        <view class="flex gap-1.5 mt-3 relative z-10">
          <view v-for="i in 7" :key="i" :class="['flex-1 h-1.5 rounded-full', i <= d.streak % 7 ? 'bg-yellow-400' : 'bg-white/20']" />
        </view>
        <text class="text-[10px] text-white/50 mt-1 relative z-10 block">本周进度 {{ d.streak % 7 }}/7天</text>
      </view>

      <!-- 四项概览统计 -->
      <view class="grid grid-cols-2 gap-3">
        <view v-for="(stat, idx) in stats" :key="idx" class="bg-white rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
          <view :class="['w-9 h-9 rounded-xl flex items-center justify-center', stat.bg]">
            <text>{{ stat.icon }}</text>
          </view>
          <text class="text-[22px] font-black text-foreground leading-none">{{ stat.value }}</text>
          <text class="text-[12px] text-muted-foreground">{{ stat.label }}</text>
          <text v-if="stat.sub" class="text-[11px] text-primary font-medium">{{ stat.sub }}</text>
        </view>
      </view>

      <!-- 趋势图 -->
      <view class="bg-white rounded-2xl p-4 shadow-sm">
        <view class="flex items-center justify-between mb-4">
          <text class="text-[15px] font-bold text-foreground">近30天学习趋势</text>
          <view class="flex items-center gap-1 text-[12px] text-muted-foreground">
            <text class="text-primary font-medium">本周 {{ fmtMinutes(weeklyTotal) }}</text>
          </view>
        </view>
        <view class="flex items-end gap-[2px] h-[80px] mb-2">
          <view v-for="(day, i) in d.trend" :key="i" class="flex-1 flex flex-col items-center justify-end h-full">
            <view :class="['w-full rounded-t-sm', getBarColor(i)]" :style="{ height: Math.max((day.minutes / maxVal) * 100, 4) + '%' }" />
          </view>
        </view>
        <view class="flex items-end">
          <view v-for="(day, i) in d.trend" :key="'l'+i" class="flex-1 text-center">
            <text v-if="[0,6,13,20,27,29].includes(i)" class="text-[9px] text-muted-foreground">{{ i === 29 ? '今' : (new Date(day.date).getMonth()+1) + '/' + new Date(day.date).getDate() }}</text>
          </view>
        </view>
        <view class="flex items-center gap-4 mt-3 pt-3 border-t border-[#F2EFEA]">
          <view class="flex items-center gap-1.5">
            <view class="w-2.5 h-2.5 rounded-sm bg-primary" />
            <text class="text-[11px] text-muted-foreground">今日</text>
          </view>
          <view class="flex items-center gap-1.5">
            <view class="w-2.5 h-2.5 rounded-sm bg-primary/25" />
            <text class="text-[11px] text-muted-foreground">工作日</text>
          </view>
          <view class="flex items-center gap-1.5">
            <view class="w-2.5 h-2.5 rounded-sm bg-accent/60" />
            <text class="text-[11px] text-muted-foreground">周末</text>
          </view>
        </view>
      </view>

      <!-- 最近学习记录 -->
      <view class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <view class="flex items-center justify-between px-4 pt-4 pb-2">
          <text class="text-[15px] font-bold text-foreground">最近学习</text>
          <view @click="goCourses" class="text-[12px] text-primary flex items-center gap-0.5">
            全部课程 ›
          </view>
        </view>
        <view class="px-4 pb-2">
          <view v-if="d.recentRecords.length === 0" class="py-10 text-center text-muted-foreground text-[13px]">暂无学习记录</view>
          <view v-else>
            <view v-for="(r, i) in d.recentRecords" :key="i" @click="goLearn(r.courseId)" class="flex items-center gap-3 py-3 border-b border-[#F2EFEA] last:border-0">
              <view class="w-14 h-14 rounded-xl overflow-hidden bg-[#F2EFEA] flex-shrink-0 relative">
                <view class="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <text class="text-primary/50 text-2xl"></text>
                </view>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-[13px] font-medium text-foreground block truncate">{{ r.courseTitle }}</text>
                <text class="text-[11px] text-muted-foreground block truncate mt-0.5">{{ r.lessonTitle }}</text>
                <view class="flex items-center gap-3 mt-1.5">
                  <text class="text-[10px] text-muted-foreground">{{ relativeTime(r.studyAt) }}</text>
                  <text class="text-[10px] text-muted-foreground">学习 {{ r.duration }} 分钟</text>
                  <text class="text-[10px] text-primary font-medium">进度 {{ r.progress }}%</text>
                </view>
              </view>
              <text class="text-[#CCC] text-sm">›</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface LearningDashboard {
  totalMinutes: number
  totalCourses: number
  totalNotes: number
  totalWorks: number
  streak: number
  weeklyMinutes: number
  trend: { date: string; minutes: number }[]
  recentRecords: {
    courseId: string
    courseTitle: string
    cover: string
    lessonTitle: string
    studyAt: string
    duration: number
    progress: number
  }[]
}

const MOCK: LearningDashboard = {
  totalMinutes: 1240,
  totalCourses: 8,
  totalNotes: 36,
  totalWorks: 12,
  streak: 7,
  weeklyMinutes: 185,
  trend: Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return { date: d.toISOString().slice(0, 10), minutes: Math.floor(Math.random() * 90) + (i > 20 ? 30 : 5) }
  }),
  recentRecords: [
    { courseId: '1', courseTitle: '八字命理入门精讲', cover: '', lessonTitle: '第三讲：天干地支详解', studyAt: '2024-01-15T14:30:00Z', duration: 45, progress: 68 },
    { courseId: '2', courseTitle: '紫微斗数基础课程', cover: '', lessonTitle: '第一讲：命盘排列方法', studyAt: '2024-01-14T20:15:00Z', duration: 32, progress: 25 },
    { courseId: '3', courseTitle: '周易易经入门到精通', cover: '', lessonTitle: '第八讲：六十四卦详解', studyAt: '2024-01-13T11:00:00Z', duration: 58, progress: 90 },
  ],
}

const data = ref<LearningDashboard | null>(null)
const loading = ref(true)
const refreshing = ref(false)

const d = computed(() => data.value!)
const maxVal = computed(() => Math.max(...d.value.trend.map(item => item.minutes), 1))
const weeklyTotal = computed(() => d.value.trend.slice(-7).reduce((s, item) => s + item.minutes, 0))

const stats = computed(() => [
  { icon: '🕐', label: '累计学习', value: fmtMinutes(d.value.totalMinutes), bg: 'bg-primary/10', sub: '' },
  { icon: '', label: '学习课程', value: `${d.value.totalCourses} 门`, bg: 'bg-[#4A90D9]/10', sub: '点击查看全部' },
  { icon: '✏️', label: '学习笔记', value: `${d.value.totalNotes} 篇`, bg: 'bg-accent/10', sub: '' },
  { icon: '', label: '提交作业', value: `${d.value.totalWorks} 次`, bg: 'bg-[#27AE60]/10', sub: '' },
])

function fmtMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}小时${m > 0 ? m + '分' : ''}` : `${m}分钟`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return '今天'
  if (d === 1) return '昨天'
  return `${d}天前`
}

function getBarColor(i: number) {
  const d = new Date(d.value.trend[i].date)
  const today = new Date().toISOString().slice(0, 10)
  if (d.value.trend[i].date === today) return 'bg-primary'
  if (d.getDay() === 0 || d.getDay() === 6) return 'bg-accent/60'
  return 'bg-primary/25'
}

async function fetchData(isRefresh = false) {
  if (isRefresh) refreshing.value = true
  try {
    await new Promise(r => setTimeout(r, 500))
    data.value = MOCK
  } catch {
    data.value = MOCK
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

fetchData()

function goBack() { uni.navigateBack() }
function goCourses() { uni.navigateTo({ url: '/pages/mine/my-courses/index' }) }
function goLearn(courseId: string) { uni.navigateTo({ url: `/pages/courses/${courseId}/learn/index` }) }
</script>
