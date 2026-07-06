<script setup lang="ts">
/** 学习计划页 - 从原型 app/courses/study-plan/page.tsx 迁移 */
import { ref, computed, onMounted } from 'vue'
import { goBack, navigateTo } from '@/utils/router'
import AppIcon from '@/components/common/app-icon.vue'
import SmartCover from '@/components/common/smart-cover.vue'
import { courseApi } from '@/lib/course-data'

const loading = ref(true)
const error = ref('')

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
const DAY_MS = 86400000
const today = new Date()
const todayDay = today.getDay()
const todayStr = today.toISOString().slice(0, 10)

// 学习目标详情对象，模板 v-else 裸访问字段，保留 any 避免 null 链式报错
const goal = ref<any>(null)
// 计划课程列表，模板裸访问 scheduledDays/cover 等字段，保留 any
const courses = ref<any[]>([])
const studyStreak = ref(0)
const checkInLevels = ref<number[]>([])

// 今日任务：取计划日含今天的课程（computed 响应 courses 变化）
const tasks = computed(() =>
  courses.value
    .filter((c) => c.scheduledDays.includes(todayDay))
    .map((c) => ({
      id: `task-${c.courseId}`,
      title: c.title,
      lessonTitle: `第 ${c.completedLessons + 1} 课`,
      duration: 30,
      isDone: false,
    })),
)
const taskDoneStatus = ref<Record<string, boolean>>({})
function toggleTask(id: string) {
  taskDoneStatus.value[id] = !taskDoneStatus.value[id]
}
function isTaskDone(id: string) { return !!taskDoneStatus.value[id] }

const doneCount = computed(() => tasks.value.filter((t) => isTaskDone(t.id)).length)
const totalMin = computed(() => tasks.value.reduce((s, t) => s + t.duration, 0))
const doneMin = computed(() => tasks.value.filter((t) => isTaskDone(t.id)).reduce((s, t) => s + t.duration, 0))
const donePct = computed(() => (tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0))

const todayLabel = computed(() =>
  today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }),
)

// 打卡热力图：4 周 × 7 天，从今天往前对齐到周日
const weeks = computed(() => {
  const start = new Date(today)
  start.setDate(start.getDate() - 27)
  start.setDate(start.getDate() - start.getDay())
  const out: { dateStr: string; month: number; level: number; isToday: boolean; isFuture: boolean }[][] = []
  for (let w = 0; w < 4; w++) {
    const row = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(date.getDate() + w * 7 + d)
      const dateStr = date.toISOString().slice(0, 10)
      const daysAgo = Math.round((today.getTime() - date.getTime()) / DAY_MS)
      const level = daysAgo >= 0 && daysAgo < checkInLevels.value.length ? checkInLevels.value[daysAgo] : 0
      row.push({ dateStr, month: date.getMonth() + 1, level, isToday: dateStr === todayStr, isFuture: date.getTime() > today.getTime() })
    }
    out.push(row)
  }
  return out
})
const checkInTotal = computed(() => {
  let n = 0
  weeks.value.forEach((wk) => wk.forEach((c) => { if (!c.isFuture && c.level > 0) n++ }))
  return n
})
function levelClass(level: number) {
  return ['lv0', 'lv1', 'lv2', 'lv3'][level] || 'lv0'
}

function removeCourse(id: string) {
  courses.value = courses.value.filter((c) => c.id !== id)
}
function coursePct(c: { completedLessons: number; totalLessons: number }) {
  return Math.round((c.completedLessons / c.totalLessons) * 100)
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await courseApi.getStudyPlan()
    goal.value = res.goal
    courses.value = res.courses
    studyStreak.value = res.streak
    checkInLevels.value = res.checkInLevels
  } catch (e) {
    error.value = (e as Error)?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <!-- Loading -->
  <view v-if="loading" class="loading-wrap">
    <text class="loading-text">加载中...</text>
  </view>
  <!-- Error -->
  <view v-else-if="error" class="error-wrap">
    <text class="error-text">{{ error }}</text>
    <view class="retry-btn" @tap="loadData"><text class="retry-text">重试</text></view>
  </view>
  <!-- Content -->
  <view v-else class="page">
    <!-- 导航栏 -->
    <view class="nav">
      <view class="nav-back" @tap="goBack"><app-icon name="chevron-left" :size="40" color="#ffffff" /></view>
      <text class="nav-title">学习计划</text>
      <view class="streak"><app-icon name="flame" :size="28" color="#fdba74" /><text class="streak-txt">{{ studyStreak }}天连续</text></view>
    </view>

    <!-- 完成度统计条 -->
    <view class="stat-bar">
      <view class="stat-left">
        <view class="stat-row">
          <text class="stat-label">今日完成</text>
          <text class="stat-val">{{ doneCount }}/{{ tasks.length }} 项</text>
        </view>
        <view class="stat-track"><view class="stat-fill" :style="{ width: donePct + '%' }" /></view>
      </view>
      <view class="stat-pct">
        <text class="stat-pct-num">{{ donePct }}%</text>
        <text class="stat-pct-label">完成率</text>
      </view>
    </view>

    <view class="body">
      <!-- 打卡日历热力图 -->
      <view class="card">
        <view class="card-head">
          <view class="card-head-l">
            <view class="ico-box red"><app-icon name="calendar" :size="28" color="#C41E3A" /></view>
            <text class="card-title">打卡日历</text>
          </view>
          <text class="card-sub">近30天打卡 <text class="hl">{{ checkInTotal }}</text> 天</text>
        </view>
        <view class="cal-wkrow">
          <view class="cal-mlabel" />
          <text v-for="(l, i) in WEEK_LABELS" :key="i" class="cal-wk">{{ l }}</text>
        </view>
        <view class="cal-grid">
          <view v-for="(week, wi) in weeks" :key="wi" class="cal-week">
            <text class="cal-mlabel">{{ week[0].month }}月</text>
            <view v-for="(cell, di) in week" :key="di" class="cal-cellwrap">
              <view class="cal-cell" :class="[cell.isFuture ? 'future' : levelClass(cell.level), { tdy: cell.isToday }]" />
            </view>
          </view>
        </view>
        <view class="cal-legend">
          <text class="legend-txt">少</text>
          <view class="legend-box lv0" /><view class="legend-box lv1" /><view class="legend-box lv2" /><view class="legend-box lv3" />
          <text class="legend-txt">多</text>
        </view>
      </view>

      <!-- 目标卡片 -->
      <view class="card">
        <view class="card-head">
          <view class="card-head-l">
            <view class="ico-box red"><app-icon name="target" :size="28" color="#C41E3A" /></view>
            <text class="card-title">学习目标</text>
          </view>
          <view class="edit-btn"><app-icon name="pencil" :size="24" color="#C41E3A" /><text class="edit-txt">编辑</text></view>
        </view>
        <view class="goal-stats">
          <view class="goal-stat">
            <text class="goal-num red">{{ goal.daysPerWeek }}</text>
            <text class="goal-unit">天 / 周</text>
          </view>
          <view class="goal-stat">
            <text class="goal-num gold">{{ goal.minutesPerDay }}</text>
            <text class="goal-unit">分钟 / 天</text>
          </view>
          <view class="goal-stat">
            <text class="goal-num blue">{{ goal.daysPerWeek * goal.minutesPerDay }}</text>
            <text class="goal-unit">分钟 / 周</text>
          </view>
        </view>
        <view class="goal-week">
          <view
            v-for="(l, i) in WEEK_LABELS" :key="i"
            class="gw-cell" :class="i === todayDay ? 'tdy' : (i !== 0 && i <= goal.daysPerWeek ? 'plan' : 'off')"
          >
            <text class="gw-txt">{{ l }}</text>
            <view v-if="i !== 0 && i <= goal.daysPerWeek && i !== todayDay" class="gw-dot" />
          </view>
        </view>
      </view>

      <!-- 今日任务 -->
      <view class="card np">
        <view class="task-head">
          <view class="task-head-row">
            <view class="card-head-l">
              <view class="ico-box orange"><app-icon name="flame" :size="28" color="#f97316" /></view>
              <view class="task-head-tt">
                <text class="card-title">今日任务</text>
                <text class="task-date">{{ todayLabel }}</text>
              </view>
            </view>
            <text class="task-count">{{ doneCount }}/{{ tasks.length }}</text>
          </view>
          <view class="task-track"><view class="task-fill" :style="{ width: donePct + '%' }" /></view>
          <view class="task-mins">
            <text class="task-min">计划 {{ totalMin }} 分钟</text>
            <text class="task-min hl">已完成 {{ doneMin }} 分钟</text>
          </view>
        </view>
        <view v-if="tasks.length === 0" class="task-empty">今日没有安排学习任务</view>
        <view v-else class="task-list">
          <view v-for="task in tasks" :key="task.id" class="task-item" @tap="toggleTask(task.id)">
            <app-icon :name="isTaskDone(task.id) ? 'check-circle-2' : 'circle'" :size="40" :color="isTaskDone(task.id) ? '#52C41A' : '#DDDDDD'" />
            <view class="task-info">
              <text class="task-name" :class="{ done: isTaskDone(task.id) }">{{ task.title }}</text>
              <text class="task-lesson">{{ task.lessonTitle }}</text>
            </view>
            <view class="task-dur"><app-icon name="clock" :size="22" color="#BBBBBB" /><text class="task-dur-txt">{{ task.duration }}分钟</text></view>
          </view>
        </view>
      </view>

      <!-- 课程安排 -->
      <view class="card np">
        <view class="tl-head">
          <view class="card-head-l">
            <view class="ico-box blue"><app-icon name="calendar" :size="28" color="#4A90D9" /></view>
            <text class="card-title">课程安排</text>
          </view>
          <view class="add-btn"><app-icon name="plus" :size="28" color="#C41E3A" /></view>
        </view>
        <view v-if="courses.length === 0" class="tl-empty">
          <app-icon name="book-open" :size="56" color="#BBBBBB" /><text class="tl-empty-txt">还没有安排课程，点击添加</text>
        </view>
        <view v-else class="tl-list">
          <view v-for="course in courses" :key="course.id" class="tl-item">
            <app-icon name="grip-vertical" :size="28" color="#DDDDDD" />
            <smart-cover class="tl-cover" :src="course.cover" :title="course.title" type="course" />
            <view class="tl-info">
              <text class="tl-name">{{ course.title }}</text>
              <view class="tl-prog-row">
                <view class="tl-track"><view class="tl-fill" :style="{ width: coursePct(course) + '%' }" /></view>
                <text class="tl-pct">{{ coursePct(course) }}%</text>
              </view>
              <view class="tl-days">
                <text v-for="(l, i) in WEEK_LABELS" :key="i" class="tl-day" :class="{ on: course.scheduledDays.includes(i) }">{{ l }}</text>
              </view>
            </view>
            <view class="tl-del" @tap="removeCourse(course.id)"><app-icon name="trash-2" :size="28" color="#DDDDDD" /></view>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="foot">
        <text class="foot-txt">从</text>
        <text class="foot-link" @tap="navigateTo('/courses-list')">课程广场</text>
        <text class="foot-txt">添加更多课程到学习计划</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #FAF8F5; }

.nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 24rpx; height: 112rpx; padding: 0 32rpx; background: var(--brand); }
.nav-back { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; margin-left: -16rpx; }
.nav-title { flex: 1; font-size: 34rpx; font-weight: 700; color: #fff; }
.streak { display: flex; align-items: center; gap: 8rpx; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 999rpx; }
.streak-txt { font-size: 24rpx; font-weight: 700; color: #fff; }

.stat-bar { display: flex; align-items: center; gap: 32rpx; padding: 8rpx 32rpx 40rpx; background: linear-gradient(to right, var(--brand), #9B0B28); }
.stat-left { flex: 1; }
.stat-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.stat-label { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.stat-val { font-size: 24rpx; font-weight: 700; color: #fff; }
.stat-track { height: 16rpx; background: rgba(255,255,255,0.2); border-radius: 999rpx; overflow: hidden; }
.stat-fill { height: 100%; background: #C9A96E; border-radius: 999rpx; }
.stat-pct { text-align: center; }
.stat-pct-num { display: block; font-size: 48rpx; font-weight: 900; color: #C9A96E; line-height: 1; }
.stat-pct-label { font-size: 20rpx; color: rgba(255,255,255,0.6); margin-top: 4rpx; }

.body { padding: 32rpx; }
.card { background: #fff; border-radius: 32rpx; padding: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); margin-bottom: 32rpx; }
.card.np { padding: 0; overflow: hidden; }
.card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.card-head-l { display: flex; align-items: center; gap: 16rpx; }
.ico-box { width: 56rpx; height: 56rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.ico-box.red { background: rgba(196,30,58,0.1); }
.ico-box.orange { background: #fff7ed; }
.ico-box.blue { background: rgba(74,144,217,0.1); }
.card-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; }
.card-sub { font-size: 24rpx; color: #999; }
.hl { color: var(--brand); font-weight: 500; }

/* 热力图 */
.cal-wkrow { display: flex; margin-bottom: 16rpx; }
.cal-mlabel { width: 48rpx; font-size: 20rpx; color: #999; }
.cal-wk { flex: 1; text-align: center; font-size: 20rpx; color: #999; }
.cal-grid { display: flex; flex-direction: column; gap: 8rpx; }
.cal-week { display: flex; align-items: center; }
.cal-cellwrap { flex: 1; display: flex; justify-content: center; }
.cal-cell { width: 48rpx; height: 48rpx; border-radius: 12rpx; }
.cal-cell.lv0 { background: #F2EFEA; }
.cal-cell.lv1 { background: #FFE5E5; }
.cal-cell.lv2 { background: #FF9999; }
.cal-cell.lv3 { background: var(--brand); }
.cal-cell.future { background: transparent; }
.cal-cell.tdy { border: 3rpx solid var(--brand); box-shadow: 0 0 0 3rpx #fff inset; }
.cal-legend { display: flex; align-items: center; justify-content: flex-end; gap: 8rpx; margin-top: 24rpx; }
.legend-txt { font-size: 20rpx; color: #999; }
.legend-box { width: 24rpx; height: 24rpx; border-radius: 8rpx; }
.legend-box.lv0 { background: #F2EFEA; }
.legend-box.lv1 { background: #FFE5E5; }
.legend-box.lv2 { background: #FF9999; }
.legend-box.lv3 { background: var(--brand); }

/* 目标卡 */
.edit-btn { display: flex; align-items: center; gap: 8rpx; }
.edit-txt { font-size: 24rpx; color: var(--brand); font-weight: 500; }
.goal-stats { display: flex; gap: 24rpx; margin-bottom: 24rpx; }
.goal-stat { flex: 1; text-align: center; background: #FAF8F5; border-radius: 24rpx; padding: 24rpx 0; }
.goal-num { display: block; font-size: 56rpx; font-weight: 900; line-height: 1; }
.goal-num.red { color: var(--brand); }
.goal-num.gold { color: #C9A96E; }
.goal-num.blue { color: #4A90D9; }
.goal-unit { font-size: 22rpx; color: #999; margin-top: 8rpx; }
.goal-week { display: flex; gap: 12rpx; }
.gw-cell { flex: 1; height: 64rpx; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; }
.gw-cell.tdy { background: var(--brand); }
.gw-cell.plan { background: rgba(196,30,58,0.1); }
.gw-cell.off { background: #F2EFEA; }
.gw-txt { font-size: 18rpx; font-weight: 500; }
.gw-cell.tdy .gw-txt { color: #fff; }
.gw-cell.plan .gw-txt { color: var(--brand); }
.gw-cell.off .gw-txt { color: #BBB; }
.gw-dot { width: 8rpx; height: 8rpx; border-radius: 999rpx; background: rgba(196,30,58,0.5); }

/* 今日任务 */
.task-head { padding: 32rpx 32rpx 24rpx; border-bottom: 1rpx solid #F2EFEA; }
.task-head-row { display: flex; align-items: center; justify-content: space-between; }
.task-head-tt { display: flex; align-items: baseline; gap: 16rpx; }
.task-date { font-size: 24rpx; color: #999; }
.task-count { font-size: 26rpx; font-weight: 700; color: var(--brand); }
.task-track { height: 12rpx; background: #F2EFEA; border-radius: 999rpx; overflow: hidden; margin-top: 20rpx; }
.task-fill { height: 100%; background: linear-gradient(to right, var(--brand), #E74C3C); border-radius: 999rpx; }
.task-mins { display: flex; justify-content: space-between; margin-top: 8rpx; }
.task-min { font-size: 20rpx; color: #999; }
.task-min.hl { color: var(--brand); }
.task-empty { padding: 64rpx 0; text-align: center; font-size: 26rpx; color: #BBB; }
.task-list { display: flex; flex-direction: column; }
.task-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-top: 1rpx solid #F5F0E8; }
.task-item:first-child { border-top: none; }
.task-info { flex: 1; min-width: 0; }
.task-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-name.done { text-decoration: line-through; color: #BBB; }
.task-lesson { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.task-dur { display: flex; align-items: center; gap: 6rpx; }
.task-dur-txt { font-size: 22rpx; color: #BBB; }

/* 课程安排 */
.tl-head { display: flex; align-items: center; justify-content: space-between; padding: 32rpx 32rpx 24rpx; border-bottom: 1rpx solid #F2EFEA; }
.add-btn { width: 56rpx; height: 56rpx; background: rgba(196,30,58,0.1); border-radius: 999rpx; display: flex; align-items: center; justify-content: center; }
.tl-empty { padding: 80rpx 0; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.tl-empty-txt { font-size: 26rpx; color: #BBB; }
.tl-list { display: flex; flex-direction: column; }
.tl-item { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; border-top: 1rpx solid #F5F0E8; }
.tl-item:first-child { border-top: none; }
.tl-cover { width: 96rpx; height: 96rpx; border-radius: 16rpx; background: #F2EFEA; flex-shrink: 0; }
.tl-info { flex: 1; min-width: 0; }
.tl-name { display: block; font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-prog-row { display: flex; align-items: center; gap: 16rpx; margin-top: 8rpx; }
.tl-track { flex: 1; height: 12rpx; background: #F2EFEA; border-radius: 999rpx; overflow: hidden; }
.tl-fill { height: 100%; background: linear-gradient(to right, var(--brand), #E74C3C); border-radius: 999rpx; }
.tl-pct { font-size: 20rpx; color: #BBB; }
.tl-days { display: flex; gap: 8rpx; margin-top: 12rpx; }
.tl-day { width: 32rpx; height: 32rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; font-size: 18rpx; font-weight: 500; background: #F2EFEA; color: #CCC; }
.tl-day.on { background: var(--brand); color: #fff; }
.tl-del { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }

.foot { margin-top: 16rpx; margin-bottom: 64rpx; text-align: center; }
.foot-txt { font-size: 24rpx; color: #BBB; }
.foot-link { font-size: 24rpx; color: var(--brand); font-weight: 500; margin: 0 8rpx; }

/* 加载 / 错误 */
.loading-wrap, .error-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 24rpx; }
.loading-text, .error-text { font-size: 28rpx; color: var(--text-soft); }
.retry-btn { padding: 16rpx 48rpx; background: var(--brand); border-radius: 999rpx; }
.retry-text { font-size: 28rpx; color: #fff; }
</style>
