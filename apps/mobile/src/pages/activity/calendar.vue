<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left" @click="goBack">
        <text class="nav-icon">‹</text>
        <text class="nav-title">活动日历</text>
      </view>
    </view>

    <!-- 月份选择器 -->
    <view class="month-bar">
      <view class="nav-btn" @click="changeMonth(-1)"><text class="nav-arrow">‹</text></view>
      <view class="month-info">
        <text class="month-text">{{ year }}年{{ month }}月</text>
      </view>
      <view class="nav-btn" @click="changeMonth(1)"><text class="nav-arrow">›</text></view>
    </view>

    <!-- 图例 -->
    <view class="legend-row">
      <view v-for="t in legendTypes" :key="t.key" class="legend-item">
        <view class="legend-dot" :style="{ background: t.color }" />
        <text class="legend-label">{{ t.label }}</text>
      </view>
    </view>

    <!-- 星期标题 -->
    <view class="weekday-row">
      <text v-for="d in weekdays" :key="d" class="wd">{{ d }}</text>
    </view>

    <!-- 日期网格 -->
    <view class="days-grid">
      <view
        v-for="(cell, idx) in calendarDays"
        :key="idx"
        class="day-cell"
        :class="{ 'other-month': !cell.isCurrent, 'today': cell.isToday, 'selected': selectedDate === cell.date }"
        @click="selectDay(cell)"
      >
        <text class="day-num" :class="{ 'today-num': cell.isToday }">{{ cell.day }}</text>
        <view v-if="cell.marker" class="marker-row">
          <view v-if="cell.marker.hasFlashSale" class="marker-dot" style="background:#C41E3A" />
          <view v-if="cell.marker.hasGroupBuy" class="marker-dot" style="background:#C9A96E" />
          <view v-if="cell.marker.hasLive" class="marker-dot" style="background:#3498db" />
          <view v-if="cell.marker.hasCourse" class="marker-dot" style="background:#2ecc71" />
        </view>
      </view>
    </view>

    <!-- 选中日期活动 -->
    <view class="events-section">
      <view class="events-header">
        <text class="events-title">{{ selectedDate ? selectedDate + ' 活动' : '点击日期查看活动' }}</text>
      </view>
      <DataState
        :is-loading="eventsLoading"
        :is-empty="selectedDate && dayEvents.length === 0"
        empty-icon="📅"
        empty-title="当天暂无活动"
        empty-description="该日期没有安排活动"
      >
        <view v-for="e in dayEvents" :key="e.id" class="event-card" @click="goEvent(e)">
          <view class="event-icon-wrap" :style="{ background: getEventColor(e.type) + '20' }">
            <text class="event-icon">{{ getEventEmoji(e.type) }}</text>
          </view>
          <view class="event-info">
            <view class="event-title-row">
              <text class="event-title">{{ e.title }}</text>
              <text class="event-status" :class="'status-' + e.status">{{ getStatusText(e.status) }}</text>
            </view>
            <text class="event-time">{{ e.startTime?.split(' ')[1] }} - {{ e.endTime?.split(' ')[1] }}</text>
            <text v-if="e.extra?.hostName" class="event-host">👤 {{ e.extra.hostName }}</text>
          </view>
          <text class="event-arrow">›</text>
        </view>
      </DataState>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { marketingApi } from '../../api'

interface CalendarMarker {
  date: string
  hasFlashSale: boolean
  hasGroupBuy: boolean
  hasLive: boolean
  hasCourse: boolean
  events: CalendarEvent[]
}

interface CalendarEvent {
  id: string
  title: string
  type: string
  status: string
  startTime: string
  endTime: string
  extra?: Record<string, any>
}

interface CalendarCell {
  date: string
  day: number
  isCurrent: boolean
  isToday: boolean
  marker?: CalendarMarker
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const legendTypes = [
  { key: 'flash_sale', label: '秒杀', color: '#C41E3A' },
  { key: 'group_buy', label: '拼团', color: '#C9A96E' },
  { key: 'live', label: '直播', color: '#3498db' },
  { key: 'course', label: '课程', color: '#2ecc71' },
]

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedDate = ref('')
const dayEvents = ref<CalendarEvent[]>([])
const eventsLoading = ref(false)
const calendarData = ref<{ markers: CalendarMarker[] } | null>(null)

const todayStr = now.toISOString().split('T')[0]

const calendarDays = computed(() => {
  const firstDay = new Date(year.value, month.value - 1, 1)
  const lastDay = new Date(year.value, month.value, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const days: CalendarCell[] = []

  // 上月末尾
  const prevMonthLastDay = new Date(year.value, month.value - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const prevM = month.value === 1 ? 12 : month.value - 1
    const prevY = month.value === 1 ? year.value - 1 : year.value
    const ds = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({ date: ds, day, isCurrent: false, isToday: ds === todayStr })
  }

  // 当月
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year.value}-${String(month.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const marker = calendarData.value?.markers?.find(m => m.date === ds)
    days.push({ date: ds, day, isCurrent: true, isToday: ds === todayStr, marker })
  }

  // 下月开头
  const remaining = 42 - days.length
  for (let day = 1; day <= remaining; day++) {
    const nextM = month.value === 12 ? 1 : month.value + 1
    const nextY = month.value === 12 ? year.value + 1 : year.value
    const ds = `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({ date: ds, day, isCurrent: false, isToday: ds === todayStr })
  }

  return days
})

onMounted(() => {
  loadCalendarData()
})

async function loadCalendarData() {
  try {
    const res = await marketingApi.pageByRoute('calendar')
    if (res && res.data) {
      calendarData.value = res.data
    }
  } catch { /* ignore */ }
}

function changeMonth(delta: number) {
  const d = new Date(year.value, month.value - 1 + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  selectedDate.value = ''
  dayEvents.value = []
  loadCalendarData()
}

function selectDay(cell: CalendarCell) {
  if (!cell.day) return
  selectedDate.value = cell.date
  if (cell.marker?.events) {
    dayEvents.value = cell.marker.events
  } else {
    dayEvents.value = []
  }
}

function getEventColor(type: string): string {
  const map: Record<string, string> = {
    flash_sale: '#C41E3A',
    group_buy: '#C9A96E',
    live: '#3498db',
    course: '#2ecc71',
    promotion: '#e67e22',
  }
  return map[type] || '#999'
}

function getEventEmoji(type: string): string {
  const map: Record<string, string> = {
    flash_sale: '⚡',
    group_buy: '👥',
    live: '🔴',
    course: '📖',
    promotion: '🎁',
  }
  return map[type] || '📌'
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    upcoming: '即将开始',
    ongoing: '进行中',
    ended: '已结束',
  }
  return map[status] || status
}

function goEvent(e: CalendarEvent) {
  const routes: Record<string, string> = {
    flash_sale: '/pages/shop/flash-sale',
    group_buy: '/pages/shop/group-buy',
    live: '/pages/live/live-room',
    course: '/pages/courses/course-detail',
  }
  const path = routes[e.type] || '/pages/activity/landing'
  uni.navigateTo({ url: `${path}?id=${e.id}` })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; padding-bottom: 30rpx; }
.header { padding: 24rpx; background: #fff; }
.header-left { display: flex; align-items: center; gap: 12rpx; }
.nav-icon { font-size: 36rpx; color: #2C2C2C; font-weight: bold; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }

.month-bar { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.nav-btn { width: 56rpx; height: 56rpx; border-radius: 50%; background: #F5F0E8; display: flex; align-items: center; justify-content: center; }
.nav-arrow { font-size: 32rpx; color: #666; font-weight: bold; }
.month-info { display: flex; align-items: center; gap: 8rpx; }
.month-text { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }

.legend-row { display: flex; justify-content: center; gap: 24rpx; padding: 12rpx 24rpx; background: #fff; border-bottom: 1rpx solid #E5E1DB; }
.legend-item { display: flex; align-items: center; gap: 6rpx; }
.legend-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.legend-label { font-size: 22rpx; color: #999; }

.weekday-row { display: flex; background: #fff; padding: 12rpx 0; }
.wd { flex: 1; text-align: center; font-size: 24rpx; color: #999; font-weight: 500; }

.days-grid { display: flex; flex-wrap: wrap; background: #fff; }
.day-cell { width: 14.285%; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1rpx solid #f5f0e8; position: relative; }
.day-cell.other-month { opacity: 0.3; }
.day-cell.selected { background: rgba(196, 30, 58, 0.06); }
.day-num { font-size: 26rpx; color: #2C2C2C; }
.today-num { background: #C41E3A; color: #fff; border-radius: 50%; width: 48rpx; height: 48rpx; line-height: 48rpx; text-align: center; font-weight: 600; }
.marker-row { display: flex; gap: 4rpx; position: absolute; bottom: 6rpx; }
.marker-dot { width: 10rpx; height: 10rpx; border-radius: 50%; }

.events-section { background: #fff; margin: 16rpx 24rpx; border-radius: 16rpx; padding: 24rpx; }
.events-header { margin-bottom: 16rpx; }
.events-title { font-size: 28rpx; font-weight: 500; color: #2C2C2C; }

.event-card { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; border-radius: 12rpx; background: #FAFAFA; margin-bottom: 12rpx; }
.event-card:active { opacity: 0.8; }
.event-icon-wrap { width: 64rpx; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.event-icon { font-size: 32rpx; }
.event-info { flex: 1; min-width: 0; }
.event-title-row { display: flex; align-items: center; gap: 8rpx; }
.event-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-status { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-upcoming { background: #fef3e2; color: #e67e22; }
.status-ongoing { background: #fde8e8; color: #C41E3A; }
.status-ended { background: #f0f0f0; color: #999; }
.event-time { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.event-host { font-size: 22rpx; color: #999; display: block; margin-top: 2rpx; }
.event-arrow { font-size: 32rpx; color: #ccc; }
</style>
