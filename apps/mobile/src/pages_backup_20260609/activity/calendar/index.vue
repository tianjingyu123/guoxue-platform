<template>
  <view class="cal-page">
    <view class="header-sticky">
      <view class="header-row">
        <text class="header-back" @click="uni.navigateBack()">‹</text>
        <text class="header-title">活动日历</text>
        <view class="header-spacer" />
      </view>

      <view class="month-row">
        <view class="month-btn" @click="changeMonth(-1)"><text>‹</text></view>
        <view class="month-label">
          <text class="month-icon">📅</text>
          <text class="month-text">{{ year }}年{{ month }}月</text>
        </view>
        <view class="month-btn" @click="changeMonth(1)"><text>›</text></view>
      </view>

      <view class="legend-row">
        <view v-for="t in legendTypes" :key="t.key" class="legend-item">
          <view class="legend-dot" :style="{ backgroundColor: t.color }" />
          <text class="legend-label">{{ t.label }}</text>
        </view>
      </view>
    </view>

    <view class="weekday-row">
      <text v-for="d in weekdays" :key="d" class="weekday-cell">{{ d }}</text>
    </view>

    <view class="cal-grid">
      <view
        v-for="(d, i) in calendarDays"
        :key="i"
        class="cal-cell"
        :class="{ 'not-current': !d.isCurrentMonth, selected: selectedDate === d.date, today: d.date === todayStr && d.isCurrentMonth }"
        @click="selectDate(d.date, d.marker)"
      >
        <text class="cal-day" :class="{ 'today-text': d.date === todayStr && d.isCurrentMonth }">{{ d.day }}</text>
        <view v-if="d.marker" class="cal-dots">
          <view v-if="d.marker.hasFlashSale" class="cal-dot" style="background: #FF4D4F;" />
          <view v-if="d.marker.hasGroupBuy" class="cal-dot" style="background: #52C41A;" />
          <view v-if="d.marker.hasLive" class="cal-dot" style="background: #1890FF;" />
          <view v-if="d.marker.hasCourse" class="cal-dot" style="background: #C9A96E;" />
        </view>
      </view>
    </view>

    <view class="event-section">
      <view v-if="selectedDate">
        <text class="event-date-label">{{ selectedDate.replace(/-/g, '/') }} 的活动</text>
        <view v-if="selectedEvents.length > 0" class="event-list">
          <view v-for="e in selectedEvents" :key="e.id" class="event-card" @click="goPage(getEventLink(e))">
            <view class="ev-icon" :style="{ backgroundColor: getEventColor(e.type) + '20' }">
              <text>{{ getEventEmoji(e.type) }}</text>
            </view>
            <view class="ev-info">
              <view class="ev-title-row">
                <text class="ev-title">{{ e.title }}</text>
                <text class="ev-status" :class="e.status">{{ statusMap[e.status] || e.status }}</text>
              </view>
              <view class="ev-meta">
                <text>{{ e.startTime.split(' ')[1] }} - {{ e.endTime.split(' ')[1] }}</text>
                <text v-if="e.extra && e.extra.productCount"> | {{ e.extra.productCount }}件商品</text>
                <text v-if="e.extra && e.extra.hostName"> | {{ e.extra.hostName }}</text>
              </view>
            </view>
            <text class="ev-arrow">›</text>
          </view>
        </view>
        <view v-else class="event-empty">
          <text class="empty-icon">📅</text>
          <text>该日期暂无活动</text>
        </view>
      </view>
      <view v-else class="event-empty">
        <text>点击日期查看活动详情</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const legendTypes = [
  { key: 'flash_sale', label: '秒杀', color: '#FF4D4F' },
  { key: 'group_buy', label: '拼团', color: '#52C41A' },
  { key: 'live', label: '直播', color: '#1890FF' },
  { key: 'course', label: '课程', color: '#C9A96E' },
]
const statusMap: Record<string, string> = { upcoming: '即将开始', ongoing: '进行中', ended: '已结束' }

interface CalendarEvent {
  id: string
  title: string
  type: string
  status: string
  startTime: string
  endTime: string
  extra?: { productCount?: number; hostName?: string }
}

interface DateMarker {
  date: string
  hasFlashSale: boolean
  hasGroupBuy: boolean
  hasLive: boolean
  hasCourse: boolean
  events: CalendarEvent[]
}

const now = new Date()
const currentDate = ref(new Date())
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedDate = ref<string | null>(null)
const selectedEvents = ref<CalendarEvent[]>([])
const todayStr = now.toISOString().split('T')[0]

const mockMarkers: DateMarker[] = [
  { date: '2026-06-08', hasFlashSale: true, hasGroupBuy: false, hasLive: false, hasCourse: true, events: [
    { id: '1', title: '限量秒杀·开光貔貅', type: 'flash_sale', status: 'ongoing', startTime: '2026-06-08 10:00', endTime: '2026-06-08 12:00', extra: { productCount: 50 } },
    { id: '2', title: '八字命理入门课', type: 'course', status: 'ongoing', startTime: '2026-06-08 14:00', endTime: '2026-06-08 16:00', extra: { hostName: '易学张老师' } },
  ]},
  { date: '2026-06-10', hasFlashSale: false, hasGroupBuy: true, hasLive: true, hasCourse: false, events: [
    { id: '3', title: '风水罗盘拼团', type: 'group_buy', status: 'upcoming', startTime: '2026-06-10 09:00', endTime: '2026-06-12 18:00', extra: { productCount: 30 } },
    { id: '4', title: '紫微斗数直播', type: 'live', status: 'upcoming', startTime: '2026-06-10 20:00', endTime: '2026-06-10 22:00', extra: { hostName: '紫微林师傅' } },
  ]},
  { date: '2026-06-15', hasFlashSale: true, hasGroupBuy: true, hasLive: false, hasCourse: false, events: [
    { id: '5', title: '618国学节大促', type: 'flash_sale', status: 'upcoming', startTime: '2026-06-15 00:00', endTime: '2026-06-18 23:59', extra: { productCount: 200 } },
  ]},
]

function changeMonth(delta: number) {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + delta)
  currentDate.value = d
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  selectedDate.value = null
  selectedEvents.value = []
}

function selectDate(dateStr: string, marker?: DateMarker) {
  selectedDate.value = dateStr
  selectedEvents.value = marker?.events || []
}

const calendarDays = (() => {
  const y = year.value
  const m = month.value
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const days: { date: string; day: number; isCurrentMonth: boolean; marker?: DateMarker }[] = []

  const prevMonthLastDay = new Date(y, m - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    days.push({ date: `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, isCurrentMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({ date: d, day, isCurrentMonth: true, marker: mockMarkers.find(mk => mk.date === d) })
  }

  const remaining = 42 - days.length
  for (let day = 1; day <= remaining; day++) {
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    days.push({ date: `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, isCurrentMonth: false })
  }

  return days
})()

function getEventColor(type: string): string {
  const m: Record<string, string> = { flash_sale: '#FF4D4F', group_buy: '#52C41A', live: '#1890FF', course: '#C9A96E', promotion: '#FA8C16' }
  return m[type] || '#999'
}

function getEventEmoji(type: string): string {
  const m: Record<string, string> = { flash_sale: '⚡', group_buy: '👥', live: '📡', course: '📖', promotion: '🏷️' }
  return m[type] || '📌'
}

function getEventLink(e: CalendarEvent): string {
  switch (e.type) {
    case 'flash_sale': case 'group_buy': case 'promotion': return '/pages/activity/landing/index?id=' + e.id
    case 'live': return '/pages/live/detail/index?id=' + e.id
    case 'course': return '/pages/courses/detail/index?id=' + e.id
    default: return ''
  }
}

function goPage(url: string) { uni.navigateTo({ url }) }
</script>

<style scoped>
.cal-page { min-height: 100vh; background: #FAF8F5; padding-bottom: 40rpx; }
.header-sticky { position: sticky; top: 0; z-index: 30; background: #fff; border-bottom: 1px solid #E8E0D5; }
.header-row { display: flex; align-items: center; padding: 10rpx 24rpx; height: 80rpx; }
.header-back { font-size: 48rpx; color: #333; width: 56rpx; }
.header-title { font-size: 30rpx; font-weight: 600; color: #2C2C2C; flex: 1; text-align: center; }
.header-spacer { width: 56rpx; }

.month-row { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 24rpx 14rpx; background: #fff; }
.month-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #666; }
.month-label { display: flex; align-items: center; gap: 6rpx; }
.month-icon { font-size: 28rpx; }
.month-text { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }

.legend-row { display: flex; justify-content: center; gap: 24rpx; padding: 6rpx 24rpx 12rpx; background: #fff; }
.legend-item { display: flex; align-items: center; gap: 4rpx; }
.legend-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.legend-label { font-size: 20rpx; color: #999; }

.weekday-row { display: flex; background: #fff; }
.weekday-cell { flex: 1; text-align: center; padding: 12rpx 0; font-size: 24rpx; color: #999; font-weight: 500; }

.cal-grid { display: flex; flex-wrap: wrap; background: #fff; border-bottom: 1px solid #E8E0D5; }
.cal-cell { width: calc(100% / 7); aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-bottom: 1px solid rgba(232,224,213,0.5); box-sizing: border-box; }
.cal-cell:nth-child(7n) { border-right: none; }
.cal-cell.not-current .cal-day { color: #DDD; }
.cal-cell.selected { background: rgba(196,30,58,0.06); }
.cal-day { font-size: 24rpx; color: #333; }
.cal-day.today-text { color: #C41E3A; font-weight: 700; }
.cal-dots { position: absolute; bottom: 6rpx; display: flex; gap: 3rpx; }
.cal-dot { width: 8rpx; height: 8rpx; border-radius: 50%; }

.event-section { padding: 16rpx 24rpx; }
.event-date-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 12rpx; }
.event-list { display: flex; flex-direction: column; gap: 12rpx; }
.event-card { display: flex; align-items: center; gap: 14rpx; padding: 18rpx; background: #fff; border-radius: 14rpx; border: 1px solid #E8E0D5; }
.ev-icon { width: 72rpx; height: 72rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.ev-info { flex: 1; min-width: 0; }
.ev-title-row { display: flex; align-items: center; gap: 8rpx; margin-bottom: 6rpx; }
.ev-title { font-size: 26rpx; font-weight: 500; color: #2C2C2C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-status { font-size: 18rpx; padding: 2rpx 8rpx; border-radius: 4rpx; flex-shrink: 0; }
.ev-status.ongoing { background: rgba(196,30,58,0.08); color: #C41E3A; }
.ev-status.upcoming { background: rgba(201,169,110,0.12); color: #C9A96E; }
.ev-status.ended { background: #F5F1EB; color: #999; }
.ev-meta { font-size: 20rpx; color: #999; }
.ev-arrow { font-size: 32rpx; color: #BBB; flex-shrink: 0; }
.event-empty { text-align: center; padding: 80rpx 0; font-size: 24rpx; color: #999; }
.empty-icon { font-size: 72rpx; display: block; margin-bottom: 12rpx; opacity: 0.4; }
</style>
