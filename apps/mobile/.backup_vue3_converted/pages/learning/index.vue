<template>
  <view class="min-h-screen bg-background pb-6">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      <view class="flex items-center justify-between px-4 h-14">
        <view @click="goBack" class="p-1"><text class="text-xl text-foreground">←</text></view>
        <text class="font-semibold text-base text-foreground">学习进度</text>
        <view class="w-9" />
      </view>
    </header>

    <!-- 学习统计卡片 -->
    <view class="px-4 py-4">
      <view class="p-4 rounded-xl" style="background:linear-gradient(135deg,rgba(196,30,58,0.1),rgba(201,169,110,0.05),rgba(196,30,58,0.1));border:1px solid rgba(196,30,58,0.2)">
        <!-- 连续学习天数 -->
        <view class="flex items-center justify-between mb-4">
          <view class="flex items-center gap-2">
            <text class="text-orange-500"></text>
            <text class="text-sm font-medium text-foreground">连续学习 {{ statsData.streak }} 天</text>
          </view>
          <text class="text-xs px-2 py-0.5 rounded" style="background:rgba(249,115,22,0.1);color:#EA580C">坚持就是胜利</text>
        </view>

        <!-- 学习日历 -->
        <view class="flex justify-between mb-4">
          <view v-for="(day, idx) in calendarData" :key="idx" class="flex flex-col items-center">
            <text class="text-[10px] text-muted-foreground mb-1">{{ day.day }}</text>
            <view class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
              :class="[day.isToday ? 'ring-2 ring-primary' : '', day.completed ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground']">
              {{ day.date }}
            </view>
            <text v-if="day.minutes > 0" class="text-[10px] text-muted-foreground mt-1">{{ day.minutes }}分</text>
          </view>
        </view>

        <!-- 本周目标进度 -->
        <view>
          <view class="flex items-center justify-between text-xs mb-1">
            <text class="text-muted-foreground flex items-center gap-1"> 本周目标</text>
            <text class="text-foreground font-medium">{{ formatTime(statsData.weeklyProgress) }} / {{ formatTime(statsData.weeklyTarget) }}</text>
          </view>
          <view class="h-2 rounded-full overflow-hidden" style="background:#F5F1EB">
            <view class="h-full rounded-full transition-all" :style="{ background: 'linear-gradient(90deg,#C41E3A,#C9A96E)', width: (statsData.weeklyProgress / statsData.weeklyTarget) * 100 + '%' }" />
          </view>
        </view>
      </view>

      <!-- 统计数据网格 -->
      <view class="grid grid-cols-3 gap-3 mt-4">
        <view class="bg-white rounded-xl p-3 text-center shadow-sm">
          <text class="text-primary text-lg block mb-1">🕐</text>
          <text class="text-lg font-bold text-foreground block">{{ formatTime(statsData.totalMinutes) }}</text>
          <text class="text-[10px] text-muted-foreground">累计学习</text>
        </view>
        <view class="bg-white rounded-xl p-3 text-center shadow-sm">
          <text class="text-accent text-lg block mb-1"></text>
          <text class="text-lg font-bold text-foreground block">{{ statsData.totalCourses }}</text>
          <text class="text-[10px] text-muted-foreground">学习课程</text>
        </view>
        <view class="bg-white rounded-xl p-3 text-center shadow-sm">
          <text class="text-amber-500 text-lg block mb-1"></text>
          <text class="text-lg font-bold text-foreground block">{{ statsData.completedCourses }}</text>
          <text class="text-[10px] text-muted-foreground">已完成</text>
        </view>
      </view>
    </view>

    <!-- Tab切换 -->
    <view class="px-4 mb-4">
      <view class="flex rounded-xl p-1" style="background:#F5F1EB">
        <view @click="activeTab = 'learning'"
          class="flex-1 py-2 text-sm font-medium rounded-lg text-center transition-colors"
          :class="activeTab === 'learning' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'">
          正在学习 ({{ learningCourses.length }})
        </view>
        <view @click="activeTab = 'completed'"
          class="flex-1 py-2 text-sm font-medium rounded-lg text-center transition-colors"
          :class="activeTab === 'completed' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'">
          已完成 ({{ completedCourses.length }})
        </view>
      </view>
    </view>

    <!-- 课程列表 -->
    <view class="px-4 space-y-3">
      <!-- 正在学习 -->
      <template v-if="activeTab === 'learning'">
        <view v-for="course in learningCourses" :key="course.id" @click="goCourse(course.id)"
          class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex gap-3">
            <view class="w-20 h-20 rounded-lg flex items-center justify-center shrink-0" style="background:linear-gradient(135deg,rgba(196,30,58,0.2),rgba(201,169,110,0.2))">
              <text class="text-2xl text-primary/60">▶</text>
            </view>
            <view class="flex-1 min-w-0">
              <text class="font-medium text-sm text-foreground line-clamp-1 block mb-1">{{ course.title }}</text>
              <text class="text-xs text-muted-foreground block mb-2">{{ course.instructor }}</text>
              <view class="mb-2">
                <view class="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <text>已学 {{ course.completedChapters }}/{{ course.totalChapters }} 章</text>
                  <text>{{ course.progress }}%</text>
                </view>
                <view class="h-1.5 rounded-full overflow-hidden" style="background:#F5F1EB">
                  <view class="h-full bg-primary rounded-full transition-all" :style="{ width: course.progress + '%' }" />
                </view>
              </view>
              <view class="flex items-center justify-between">
                <text class="text-[10px] text-muted-foreground">上次学到：{{ course.lastChapter }}</text>
                <text class="text-[10px] text-muted-foreground">{{ course.lastTime }}</text>
              </view>
            </view>
          </view>
          <view class="w-full mt-3 py-2 text-center text-sm font-medium rounded-lg" style="background:rgba(196,30,58,0.1);color:#C41E3A">继续学习</view>
        </view>
      </template>

      <!-- 已完成 -->
      <template v-else>
        <view v-for="course in completedCourses" :key="course.id" @click="goCourseDetail(course.id)"
          class="bg-white rounded-xl p-4 shadow-sm">
          <view class="flex gap-3">
            <view class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0 relative" style="background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(16,185,129,0.2))">
              <text class="text-2xl text-green-600"></text>
              <text v-if="course.certificate" class="absolute -top-1 -right-1 text-sm text-amber-500">🎖</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-center gap-2 mb-1">
                <text class="font-medium text-sm text-foreground line-clamp-1">{{ course.title }}</text>
                <text class="text-[10px] px-1.5 py-0 rounded" style="background:rgba(34,197,94,0.1);color:#16A34A">已完成</text>
              </view>
              <text class="text-xs text-muted-foreground block mb-2">{{ course.instructor }}</text>
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-0.5">
                  <text v-for="i in 5" :key="i" class="text-xs" :class="i <= course.rating ? 'text-amber-400' : 'text-muted-foreground/30'">★</text>
                  <text class="text-[10px] text-muted-foreground ml-1">我的评分</text>
                </view>
                <text class="text-[10px] text-muted-foreground">完成于 {{ course.completedDate }}</text>
              </view>
            </view>
            <text class="text-lg text-muted-foreground self-center">›</text>
          </view>
          <view v-if="course.certificate" class="w-full mt-3 py-2 text-center text-sm font-medium rounded-lg flex items-center justify-center gap-1" style="background:rgba(245,158,11,0.1);color:#D97706">
            🎖 查看结业证书
          </view>
        </view>
      </template>
    </view>

    <!-- 学习路径 -->
    <view class="px-4 mt-6">
      <view class="flex items-center gap-2 mb-3">
        <text class="text-primary"></text>
        <text class="font-semibold text-base text-foreground">我的学习路径</text>
      </view>
      <view class="bg-white rounded-xl p-4 shadow-sm" style="border:1px solid rgba(232,224,213,0.6)">
        <text class="font-medium text-sm block mb-2">八字命理学习路径</text>
        <view class="space-y-3">
          <view v-for="(step, idx) in learningPath" :key="idx">
            <view class="flex items-center gap-3">
              <view class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                :class="step.completed ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'">{{ idx + 1 }}</view>
              <view class="flex-1">
                <text class="text-sm text-foreground">{{ step.name }}</text>
                <text class="text-xs text-muted-foreground block">{{ step.desc }}</text>
              </view>
              <text v-if="step.completed" class="text-sm"></text>
            </view>
            <view v-if="idx < learningPath.length - 1" class="w-0.5 h-4 ml-3" style="background:#F5F1EB" />
          </view>
        </view>
      </view>
    </view>

    <!-- 成就徽章 -->
    <view class="px-4 mt-6 pb-6">
      <view class="flex items-center gap-2 mb-3">
        <text class="text-accent"></text>
        <text class="font-semibold text-base text-foreground">成就徽章</text>
      </view>
      <view class="grid grid-cols-4 gap-3">
        <view v-for="badge in badges" :key="badge.name" class="flex flex-col items-center">
          <view class="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            :class="badge.unlocked ? 'bg-accent/20' : 'bg-secondary grayscale'">
            <text>{{ badge.icon }}</text>
          </view>
          <text class="text-[10px] text-muted-foreground mt-1 text-center">{{ badge.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref<'learning' | 'completed'>('learning')

const statsData = {
  totalMinutes: 1280,
  totalCourses: 12,
  completedCourses: 5,
  streak: 7,
  weeklyTarget: 300,
  weeklyProgress: 180,
}

const calendarData = [
  { day: '一', date: 6, minutes: 45, completed: true },
  { day: '二', date: 7, minutes: 30, completed: true },
  { day: '三', date: 8, minutes: 60, completed: true },
  { day: '四', date: 9, minutes: 0, completed: false },
  { day: '五', date: 10, minutes: 45, completed: true },
  { day: '六', date: 11, minutes: 0, completed: false },
  { day: '日', date: 12, minutes: 0, completed: false, isToday: true },
]

const learningCourses = [
  { id: 1, title: '八字入门实战课', instructor: '周易大师', progress: 65, lastChapter: '第5章 十神详解', lastTime: '昨天 14:30', totalChapters: 28, completedChapters: 18 },
  { id: 2, title: '紫微斗数精讲', instructor: '张玄风', progress: 40, lastChapter: '第12章 四化详解', lastTime: '3天前', totalChapters: 36, completedChapters: 14 },
  { id: 3, title: '风水布局入门', instructor: '陈风水', progress: 15, lastChapter: '第2章 八宅风水', lastTime: '1周前', totalChapters: 12, completedChapters: 2 },
]

const completedCourses = [
  { id: 4, title: '易经六十四卦速记', instructor: '周易大师', completedDate: '2024-01-10', rating: 5, certificate: true },
  { id: 5, title: '八字看婚姻专题', instructor: '玄学居士', completedDate: '2024-01-05', rating: 4, certificate: true },
  { id: 6, title: '姓名学入门', instructor: '李国学', completedDate: '2023-12-28', rating: 5, certificate: false },
]

const learningPath = [
  { name: '天干地支基础', desc: '认识天干地支与五行', completed: true },
  { name: '排盘入门', desc: '学习如何排四柱八字', completed: true },
  { name: '十神分析', desc: '掌握十神关系与含义', completed: false },
  { name: '格局判断', desc: '学习判断八字格局', completed: false },
  { name: '实战案例', desc: '通过案例掌握分析方法', completed: false },
]

const badges = [
  { name: '初入玄学', icon: '🌱', unlocked: true },
  { name: '勤奋学习', icon: '', unlocked: true },
  { name: '持之以恒', icon: '', unlocked: true },
  { name: '学富五车', icon: '', unlocked: false },
  { name: '排盘高手', icon: '', unlocked: false },
  { name: '命理大师', icon: '👑', unlocked: false },
  { name: '风水达人', icon: '🏔', unlocked: false },
  { name: '国学宗师', icon: '🏛', unlocked: false },
]

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}小时${mins > 0 ? `${mins}分钟` : ''}` : `${mins}分钟`
}

function goBack() { uni.navigateBack() }
function goCourse(id: number) { uni.navigateTo({ url: `/pages/learn/detail?id=${id}` }) }
function goCourseDetail(id: number) { uni.navigateTo({ url: `/pages/course/detail?id=${id}` }) }
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
