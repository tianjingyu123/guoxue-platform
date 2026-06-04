<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-content">
        <text class="back-btn" @click="uni.navigateBack">‹</text>
        <text class="nav-title">学习计划</text>
        <view class="nav-streak">
          <text class="streak-icon">🔥</text>
          <text class="streak-val">{{ streak }}天连续</text>
        </view>
      </view>
    </view>

    <!-- 完成度统计 -->
    <view class="progress-bar">
      <view class="progress-left">
        <view class="progress-header">
          <text class="progress-label">今日完成</text>
          <text class="progress-fraction">{{ doneCount }}/{{ tasks.length }} 项</text>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: progressPct + '%' }" />
        </view>
      </view>
      <view class="progress-right">
        <text class="progress-pct">{{ progressPct }}%</text>
        <text class="progress-pct-label">完成率</text>
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 学习目标卡片 -->
      <view class="goal-card">
        <view class="goal-header">
          <view class="goal-title-row">
            <text class="goal-icon">🎯</text>
            <text class="goal-title">学习目标</text>
          </view>
          <text class="goal-edit" @click="showGoalEditor = true">✏️ 编辑</text>
        </view>
        <view class="goal-stats">
          <view class="goal-stat">
            <text class="goal-val" style="color:#C41E3A">{{ goal.daysPerWeek }}</text>
            <text class="goal-label">天 / 周</text>
          </view>
          <view class="goal-stat">
            <text class="goal-val" style="color:#C9A96E">{{ goal.minutesPerDay }}</text>
            <text class="goal-label">分钟 / 天</text>
          </view>
          <view class="goal-stat">
            <text class="goal-val" style="color:#4A90D9">{{ goal.daysPerWeek * goal.minutesPerDay }}</text>
            <text class="goal-label">分钟 / 周</text>
          </view>
        </view>
        <!-- 周计划指示格 -->
        <view class="week-grid">
          <view
            v-for="(label, i) in weekLabels"
            :key="i"
            class="week-cell"
            :class="{ 'week-today': i === todayDay, 'week-planned': i > 0 && i <= goal.daysPerWeek }"
          >
            <text class="week-label">{{ label }}</text>
          </view>
        </view>
      </view>

      <!-- 今日任务 -->
      <view class="task-card">
        <view class="task-header">
          <view class="task-title-row">
            <text class="task-icon">🔥</text>
            <view class="task-title-group">
              <text class="task-card-title">今日任务</text>
              <text class="task-date">{{ todayDateStr }}</text>
            </view>
          </view>
          <text class="task-count">{{ doneCount }}/{{ tasks.length }}</text>
        </view>
        <view class="task-progress">
          <view class="task-progress-track">
            <view class="task-progress-fill" :style="{ width: progressPct + '%' }" />
          </view>
          <view class="task-progress-info">
            <text class="task-plan-time">计划 {{ totalMinutes }} 分钟</text>
            <text class="task-done-time">已完成 {{ doneMinutes }} 分钟</text>
          </view>
        </view>
        <view v-if="tasks.length === 0" class="task-empty">
          <text>今日没有安排学习任务</text>
        </view>
        <view v-else class="task-list">
          <view
            v-for="t in tasks"
            :key="t.id"
            class="task-item"
            @click="toggleTask(t.id)"
          >
            <view class="task-check" :class="{ 'task-checked': t.isDone }">
              <text v-if="t.isDone">✓</text>
            </view>
            <view class="task-info">
              <text class="task-name" :class="{ 'task-name-done': t.isDone }">{{ t.title }}</text>
              <text class="task-lesson">{{ t.lessonTitle }}</text>
            </view>
            <text class="task-duration">🕐 {{ t.duration }}分钟</text>
          </view>
        </view>
      </view>

      <!-- 课程安排 -->
      <view class="course-card">
        <view class="course-card-header">
          <view class="course-card-title-row">
            <text class="course-card-icon">📅</text>
            <text class="course-card-title">课程安排</text>
          </view>
          <text class="course-add" @click="goAddCourse">＋</text>
        </view>
        <view v-if="courses.length === 0" class="course-empty" @click="goAddCourse">
          <text class="course-empty-icon">📚</text>
          <text class="course-empty-text">还没有安排课程，点击添加</text>
        </view>
        <view v-else class="course-list">
          <view
            v-for="(c, idx) in courses"
            :key="c.id"
            class="course-item"
            :class="{ 'course-dragging': draggingId === c.id }"
          >
            <text class="course-drag">⠿</text>
            <image :src="c.cover" class="course-cover" mode="aspectFill" />
            <view class="course-info">
              <text class="course-name">{{ c.title }}</text>
              <view class="course-progress">
                <view class="course-progress-track">
                  <view class="course-progress-fill" :style="{ width: (c.completedLessons / c.totalLessons * 100) + '%' }" />
                </view>
                <text class="course-progress-pct">{{ Math.round(c.completedLessons / c.totalLessons * 100) }}%</text>
              </view>
              <view class="course-days">
                <text
                  v-for="(l, i) in weekLabels"
                  :key="i"
                  class="course-day"
                  :class="{ 'course-day-active': c.scheduledDays?.includes(i) }"
                >{{ l }}</text>
              </view>
            </view>
            <text class="course-remove" @click="removeCourse(c.id)">🗑️</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="bottom-tip">
        <text class="tip-text">从</text>
        <text class="tip-link" @click="goAddCourse">课程广场</text>
        <text class="tip-text">添加更多课程到学习计划</text>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>

    <!-- 目标编辑弹窗 -->
    <view v-if="showGoalEditor" class="dialog-overlay" @click="showGoalEditor = false">
      <view class="dialog-content" @click.stop>
        <view class="dialog-header">
          <text class="dialog-title">设置学习目标</text>
          <text class="dialog-close" @click="showGoalEditor = false">✕</text>
        </view>
        <view class="editor-section">
          <text class="editor-label">每周学习天数</text>
          <view class="days-selector">
            <text
              v-for="d in 7"
              :key="d"
              class="day-btn"
              :class="{ 'day-active': editDays === d }"
              @click="editDays = d"
            >{{ d }}</text>
          </view>
        </view>
        <view class="editor-section">
          <text class="editor-label">每日学习时长</text>
          <view class="minutes-selector">
            <text
              v-for="m in minuteOptions"
              :key="m"
              class="minute-btn"
              :class="{ 'minute-active': editMinutes === m }"
              @click="editMinutes = m"
            >{{ m >= 60 ? (m / 60) + '小时' : m + '分钟' }}</text>
          </view>
        </view>
        <text class="save-goal-btn" @click="saveGoal">保存目标</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const showGoalEditor = ref(false)
const editDays = ref(5)
const editMinutes = ref(30)
const draggingId = ref<string | null>(null)
const streak = ref(7)

const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
const today = new Date()
const todayDay = today.getDay()
const todayDateStr = today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
const minuteOptions = [15, 20, 30, 45, 60, 90, 120]

const goal = ref({ daysPerWeek: 5, minutesPerDay: 30 })
const courses = ref<any[]>([
  { id: 'pc1', courseId: 'c1', title: '八字命理入门精讲', cover: '', totalLessons: 32, completedLessons: 12, scheduledDays: [1, 3, 5], order: 0 },
  { id: 'pc2', courseId: 'c2', title: '紫微斗数基础课', cover: '', totalLessons: 24, completedLessons: 6, scheduledDays: [2, 4], order: 1 },
  { id: 'pc3', courseId: 'c3', title: '周易易经入门', cover: '', totalLessons: 18, completedLessons: 0, scheduledDays: [6], order: 2 },
])

const tasks = ref<any[]>([])
const loading = ref(false)

const doneCount = computed(() => tasks.value.filter((t: any) => t.isDone).length)
const totalMinutes = computed(() => tasks.value.reduce((s: number, t: any) => s + (t.duration || 0), 0))
const doneMinutes = computed(() => tasks.value.filter((t: any) => t.isDone).reduce((s: number, t: any) => s + (t.duration || 0), 0))
const progressPct = computed(() => tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0)

onMounted(() => {
  loadFromStorage()
  initTasks()
})

function loadFromStorage() {
  try {
    const savedGoal = uni.getStorageSync('study_goal')
    const savedCourses = uni.getStorageSync('study_courses')
    if (savedGoal) goal.value = JSON.parse(savedGoal)
    if (savedCourses) courses.value = JSON.parse(savedCourses)
  } catch {}
}

function initTasks() {
  const todayStr = today.toISOString().slice(0, 10)
  try {
    const saved = uni.getStorageSync(`study_tasks_${todayStr}`)
    if (saved) {
      tasks.value = JSON.parse(saved)
      return
    }
  } catch {}
  // Generate from courses
  tasks.value = courses.value
    .filter((c: any) => c.scheduledDays?.includes(todayDay))
    .map((c: any) => ({
      id: `task-${c.courseId}`,
      courseId: c.courseId,
      title: c.title,
      lessonTitle: `第 ${c.completedLessons + 1} 课`,
      duration: goal.value.minutesPerDay,
      isDone: false,
      date: today.toISOString().slice(0, 10),
    }))
  saveTasks()
}

function saveTasks() {
  const todayStr = today.toISOString().slice(0, 10)
  uni.setStorageSync(`study_tasks_${todayStr}`, JSON.stringify(tasks.value))
}

function toggleTask(id: string) {
  const t = tasks.value.find((t: any) => t.id === id)
  if (t) {
    t.isDone = !t.isDone
    saveTasks()
  }
}

function removeCourse(id: string) {
  courses.value = courses.value.filter((c: any) => c.id !== id)
  uni.setStorageSync('study_courses', JSON.stringify(courses.value))
  initTasks()
}

function saveGoal() {
  goal.value = { daysPerWeek: editDays.value, minutesPerDay: editMinutes.value }
  uni.setStorageSync('study_goal', JSON.stringify(goal.value))
  showGoalEditor.value = false
  initTasks()
  uni.showToast({ title: '目标已保存' })
}

function goAddCourse() {
  uni.showToast({ title: '课程广场功能开发中', icon: 'none' })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

.nav-bar { background: #C41E3A; padding: 60rpx 24rpx 20rpx; }
.nav-content { display: flex; align-items: center; gap: 16rpx; }
.back-btn { font-size: 44rpx; color: #fff; line-height: 1; }
.nav-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #fff; }
.nav-streak { display: flex; align-items: center; gap: 4rpx; background: rgba(255,255,255,0.2); padding: 6rpx 16rpx; border-radius: 20rpx; }
.streak-icon { font-size: 24rpx; }
.streak-val { font-size: 22rpx; color: #fff; font-weight: 500; }

.progress-bar { background: linear-gradient(135deg, #C41E3A, #9B0B28); padding: 8rpx 24rpx 24rpx; display: flex; gap: 24rpx; align-items: center; }
.progress-left { flex: 1; }
.progress-header { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.progress-label { font-size: 22rpx; color: rgba(255,255,255,0.8); }
.progress-fraction { font-size: 22rpx; color: #fff; font-weight: 600; }
.progress-track { height: 12rpx; background: rgba(255,255,255,0.2); border-radius: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: #C9A96E; border-radius: 6rpx; transition: width 0.5s; }
.progress-right { text-align: center; }
.progress-pct { font-size: 40rpx; font-weight: bold; color: #C9A96E; display: block; line-height: 1; }
.progress-pct-label { font-size: 18rpx; color: rgba(255,255,255,0.6); margin-top: 4rpx; display: block; }

.scroll-area { padding: 24rpx; }

.goal-card { background: #fff; border-radius: 24rpx; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.goal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.goal-title-row { display: flex; align-items: center; gap: 12rpx; }
.goal-icon { font-size: 32rpx; }
.goal-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.goal-edit { font-size: 22rpx; color: #C41E3A; }
.goal-stats { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.goal-stat { flex: 1; text-align: center; background: #FAF8F5; border-radius: 16rpx; padding: 20rpx; }
.goal-val { font-size: 44rpx; font-weight: bold; display: block; line-height: 1; }
.goal-label { font-size: 20rpx; color: #999; margin-top: 8rpx; display: block; }
.week-grid { display: flex; gap: 8rpx; }
.week-cell { flex: 1; height: 56rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; background: #F2EFEA; }
.week-label { font-size: 22rpx; color: #bbb; }
.week-today { background: #C41E3A; }
.week-today .week-label { color: #fff; font-weight: 500; }
.week-planned { background: rgba(196,30,58,0.08); }
.week-planned .week-label { color: #C41E3A; }

.task-card { background: #fff; border-radius: 24rpx; margin-bottom: 20rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.task-header { padding: 24rpx 24rpx 0; display: flex; justify-content: space-between; align-items: flex-start; }
.task-title-row { display: flex; gap: 12rpx; }
.task-icon { font-size: 32rpx; }
.task-title-group { }
.task-card-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; }
.task-date { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.task-count { font-size: 26rpx; font-weight: bold; color: #C41E3A; }
.task-progress { padding: 16rpx 24rpx 0; }
.task-progress-track { height: 12rpx; background: #F2EFEA; border-radius: 6rpx; overflow: hidden; }
.task-progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E74C3C); border-radius: 6rpx; transition: width 0.5s; }
.task-progress-info { display: flex; justify-content: space-between; margin-top: 4rpx; font-size: 18rpx; color: #999; }
.task-done-time { color: #C41E3A; }
.task-empty { text-align: center; padding: 48rpx 0; font-size: 24rpx; color: #bbb; }
.task-list { }
.task-item { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; border-top: 1rpx solid #F5F0E8; }
.task-check { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #fff; flex-shrink: 0; }
.task-checked { background: #52C41A; border-color: #52C41A; }
.task-info { flex: 1; }
.task-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; }
.task-name-done { text-decoration: line-through; color: #bbb; }
.task-lesson { font-size: 20rpx; color: #999; margin-top: 4rpx; display: block; }
.task-duration { font-size: 20rpx; color: #bbb; }

.course-card { background: #fff; border-radius: 24rpx; margin-bottom: 20rpx; overflow: hidden; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
.course-card-header { padding: 24rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 1rpx solid #F2EFEA; }
.course-card-title-row { display: flex; align-items: center; gap: 12rpx; }
.course-card-icon { font-size: 32rpx; }
.course-card-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; }
.course-add { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(196,30,58,0.08); display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #C41E3A; }
.course-empty { padding: 64rpx 0; text-align: center; }
.course-empty-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.course-empty-text { font-size: 24rpx; color: #bbb; }
.course-list { }
.course-item { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; border-bottom: 1rpx solid #F5F0E8; }
.course-dragging { opacity: 0.4; background: #FAF8F5; }
.course-drag { font-size: 28rpx; color: #ddd; cursor: grab; flex-shrink: 0; }
.course-cover { width: 72rpx; height: 72rpx; border-radius: 12rpx; background: #F2EFEA; flex-shrink: 0; }
.course-info { flex: 1; }
.course-name { font-size: 24rpx; font-weight: 500; color: #2C2C2C; display: block; margin-bottom: 8rpx; }
.course-progress { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.course-progress-track { flex: 1; height: 10rpx; background: #F2EFEA; border-radius: 5rpx; overflow: hidden; }
.course-progress-fill { height: 100%; background: linear-gradient(90deg, #C41E3A, #E74C3C); border-radius: 5rpx; }
.course-progress-pct { font-size: 18rpx; color: #bbb; }
.course-days { display: flex; gap: 4rpx; }
.course-day { width: 28rpx; height: 28rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16rpx; font-weight: 500; background: #F2EFEA; color: #ccc; }
.course-day-active { background: #C41E3A; color: #fff; }
.course-remove { font-size: 28rpx; flex-shrink: 0; }

.bottom-tip { text-align: center; padding: 16rpx 0 40rpx; font-size: 22rpx; color: #bbb; }
.tip-link { color: #C41E3A; font-weight: 500; }

.bottom-spacer { height: 40rpx; }

.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: flex-end; }
.dialog-content { background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 32rpx; width: 100%; }
.dialog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32rpx; }
.dialog-title { font-size: 32rpx; font-weight: bold; color: #2C2C2C; }
.dialog-close { font-size: 36rpx; color: #999; padding: 8rpx; }
.editor-section { margin-bottom: 28rpx; }
.editor-label { font-size: 24rpx; color: #666; display: block; margin-bottom: 16rpx; }
.days-selector { display: flex; gap: 16rpx; }
.day-btn { flex: 1; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: bold; background: #F2EFEA; color: #666; }
.day-active { background: #C41E3A; color: #fff; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.minutes-selector { display: flex; flex-wrap: wrap; gap: 16rpx; }
.minute-btn { padding: 16rpx 32rpx; border-radius: 16rpx; font-size: 24rpx; font-weight: bold; background: #F2EFEA; color: #666; }
.minute-active { background: #C41E3A; color: #fff; box-shadow: 0 8rpx 24rpx rgba(196,30,58,0.3); }
.save-goal-btn { width: 100%; height: 88rpx; background: linear-gradient(135deg, #C41E3A, #E74C3C); color: #fff; border-radius: 20rpx; font-size: 28rpx; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 32rpx rgba(196,30,58,0.35); }
</style>
