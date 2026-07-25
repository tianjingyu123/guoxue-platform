<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-btn" @tap="go('/discover')">
        <app-icon name="arrow-left" :size="40" color="#1A1A1A" />
      </view>
      <text class="nav-title">活动日历</text>
      <view class="nav-btn" />
    </view>

    <view :style="{ height: navH + 'px' }" />

    <!-- 月份选择器 -->
    <view class="month-bar">
      <view class="month-btn" @tap="changeMonth(-1)">
        <app-icon name="chevron-left" :size="40" color="#1A1A1A" compact />
      </view>
      <view class="month-center">
        <app-icon name="calendar" :size="32" color="#C41E3A" />
        <text class="month-label">{{ year }}年{{ month }}月</text>
      </view>
      <view class="month-btn" @tap="changeMonth(1)">
        <app-icon name="chevron-right" :size="40" color="#1A1A1A" />
      </view>
    </view>

    <!-- 图例 -->
    <view class="legend">
      <view v-for="t in legendTypes" :key="t.type" class="legend-item">
        <view class="legend-dot" :style="{ background: t.color }" />
        <text class="legend-label">{{ t.label }}</text>
      </view>
    </view>

    <!-- 星期标题 -->
    <view class="weekdays">
      <view v-for="d in weekdays" :key="d" class="weekday">
        <text class="weekday-txt">{{ d }}</text>
      </view>
    </view>

    <!-- 日历格子 -->
    <view class="cal-grid">
      <view
        v-for="cell in calendarDays"
        :key="cell.date"
        class="cal-cell"
        :class="{ selected: selectedDate === cell.date }"
        @tap="selectDate(cell)"
      >
        <text
          class="cal-day"
          :class="{ dim: !cell.isCurrentMonth, today: cell.date === today && cell.isCurrentMonth }"
        >{{ cell.day }}</text>
        <view v-if="cell.marker" class="cal-dots">
          <view v-if="cell.marker.hasFlashSale" class="cal-dot" :style="{ background: typeColor.flash_sale }" />
          <view v-if="cell.marker.hasGroupBuy" class="cal-dot" :style="{ background: typeColor.group_buy }" />
          <view v-if="cell.marker.hasLive" class="cal-dot" :style="{ background: typeColor.live }" />
          <view v-if="cell.marker.hasCourse" class="cal-dot" :style="{ background: typeColor.course }" />
        </view>
      </view>
    </view>

    <!-- 选中日期的活动列表 -->
    <view class="events">
      <block v-if="selectedDate">
        <text class="events-title">{{ selectedDate.replace(/-/g, '/') }} 的活动</text>
        <view v-if="selectedEvents.length > 0" class="events-list">
          <view
            v-for="ev in selectedEvents"
            :key="ev.id"
            class="event-item"
            @tap="go(getEventLink(ev))"
          >
            <view class="event-icon" :style="{ background: typeColor[ev.type] + '20' }">
              <app-icon :name="typeIcon[ev.type]" :size="40" :color="typeColor[ev.type]" />
            </view>
            <view class="event-info">
              <view class="event-top">
                <text class="event-title">{{ ev.title }}</text>
                <view class="event-badge" :class="{ on: ev.status === 'ongoing' }">
                  <text class="event-badge-txt" :class="{ on: ev.status === 'ongoing' }">{{ statusText(ev.status) }}</text>
                </view>
              </view>
              <view class="event-meta">
                <text class="event-meta-txt">{{ ev.timeRange }}</text>
                <text v-if="ev.extra" class="event-meta-txt">| {{ ev.extra }}</text>
              </view>
            </view>
            <app-icon name="chevron-right" :size="28" color="#999" />
          </view>
        </view>
        <view v-else class="empty">
          <app-icon name="calendar" :size="96" color="#CCCCCC" />
          <text class="empty-txt">该日期暂无活动</text>
        </view>
      </block>
      <view v-else class="empty">
        <text class="empty-txt">点击日期查看活动详情</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '@/utils/router'

const statusBarHeight = ref(0)
const navH = ref(44)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const typeColor: Record<string, string> = {
  flash_sale: '#C41E3A',
  group_buy: '#EA580C',
  promotion: '#CA8A04',
  live: '#7C3AED',
  course: '#16A34A',
}
const typeIcon: Record<string, string> = {
  flash_sale: 'zap',
  group_buy: 'users',
  promotion: 'tag',
  live: 'radio',
  course: 'book-open',
}
const typeLabel: Record<string, string> = {
  flash_sale: '秒杀',
  group_buy: '拼团',
  promotion: '促销',
  live: '直播',
  course: '课程',
}
const legendTypes = [
  { type: 'flash_sale', color: typeColor.flash_sale, label: typeLabel.flash_sale },
  { type: 'group_buy', color: typeColor.group_buy, label: typeLabel.group_buy },
  { type: 'live', color: typeColor.live, label: typeLabel.live },
  { type: 'course', color: typeColor.course, label: typeLabel.course },
]

// 日历活动单元的本地类型定义
interface CalendarEvent {
  id: number
  type: string
  title: string
  status: string
  timeRange: string
  extra: string
}
interface CalendarMarker {
  date: string
  hasFlashSale: boolean
  hasGroupBuy: boolean
  hasLive: boolean
  hasCourse: boolean
  events: CalendarEvent[]
}
interface CalendarCell {
  date: string
  day: number
  isCurrentMonth: boolean
  marker?: CalendarMarker
}

const now = new Date()
const currentDate = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const selectedDate = ref<string | null>(null)
const selectedEvents = ref<CalendarEvent[]>([])

const year = computed(() => currentDate.value.getFullYear())
const month = computed(() => currentDate.value.getMonth() + 1)
const today = new Date().toISOString().split('T')[0]

// mock markers：当月几天有活动
const markers = computed(() => {
  const y = year.value
  const m = String(month.value).padStart(2, '0')
  return [
    {
      date: `${y}-${m}-08`,
      hasFlashSale: true, hasGroupBuy: false, hasLive: true, hasCourse: false,
      events: [
        { id: 1, type: 'flash_sale', title: '八字精讲限时秒杀', status: 'ongoing', timeRange: '10:00 - 12:00', extra: '8件商品' },
        { id: 2, type: 'live', title: '紫微斗数直播课', status: 'upcoming', timeRange: '20:00 - 21:30', extra: '周易大师' },
      ],
    },
    {
      date: `${y}-${m}-15`,
      hasFlashSale: false, hasGroupBuy: true, hasLive: false, hasCourse: true,
      events: [
        { id: 3, type: 'group_buy', title: '风水入门拼团购', status: 'ongoing', timeRange: '全天', extra: '3人团' },
        { id: 4, type: 'course', title: '国学经典精读课', status: 'upcoming', timeRange: '19:00 - 20:00', extra: '张玄风' },
      ],
    },
    {
      date: `${y}-${m}-22`,
      hasFlashSale: true, hasGroupBuy: false, hasLive: false, hasCourse: false,
      events: [
        { id: 5, type: 'flash_sale', title: '开运手串秒杀专场', status: 'upcoming', timeRange: '14:00 - 16:00', extra: '5件商品' },
      ],
    },
  ]
})

const calendarDays = computed(() => {
  const y = year.value
  const m = month.value
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()
  const days: CalendarCell[] = []

  const prevMonthLastDay = new Date(y, m - 1, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const pm = m === 1 ? 12 : m - 1
    const py = m === 1 ? y - 1 : y
    days.push({ date: `${py}-${String(pm).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, isCurrentMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const marker = markers.value.find(mk => mk.date === dateStr)
    days.push({ date: dateStr, day, isCurrentMonth: true, marker })
  }
  const remaining = 42 - days.length
  for (let day = 1; day <= remaining; day++) {
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    days.push({ date: `${ny}-${String(nm).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, isCurrentMonth: false })
  }
  return days
})

function changeMonth(delta: number) {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + delta)
  currentDate.value = d
  selectedDate.value = null
  selectedEvents.value = []
}
function selectDate(cell: CalendarCell) {
  selectedDate.value = cell.date
  selectedEvents.value = cell.marker?.events || []
}
function statusText(s: string) {
  return s === 'ongoing' ? '进行中' : s === 'upcoming' ? '即将开始' : '已结束'
}
function getEventLink(ev: CalendarEvent) {
  switch (ev.type) {
    case 'flash_sale':
    case 'group_buy':
    case 'promotion':
      return `/activity/landing?id=${ev.id}&type=${ev.type}`
    case 'live':
      return `/live/${ev.id}`
    case 'course':
      return `/courses/${ev.id}`
    default:
      return '/discover'
  }
}
function go(path: string) {
  navigateTo(path)
}

onMounted(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 0
    navH.value = (info.statusBarHeight || 0) + 44
  } catch (e) {}
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F5F5;
}
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
  background: #F5F5F5;
  border-bottom: 2rpx solid #EEEEEE;
}
.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #FFFFFF;
  border-bottom: 2rpx solid #EEEEEE;
}
.month-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.month-center {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.month-label {
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A1A;
}
.legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 16rpx 32rpx;
  background: #FFFFFF;
  border-bottom: 2rpx solid #EEEEEE;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}
.legend-label {
  font-size: 22rpx;
  color: #999;
}
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #FFFFFF;
}
.weekday {
  text-align: center;
  padding: 16rpx 0;
}
.weekday-txt {
  font-size: 26rpx;
  color: #999;
  font-weight: 500;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #FFFFFF;
  border-bottom: 2rpx solid #EEEEEE;
}
.cal-cell {
  position: relative;
  aspect-ratio: 1;
  padding: 8rpx;
  border-bottom: 2rpx solid rgba(238, 238, 238, 0.5);
  border-right: 2rpx solid rgba(238, 238, 238, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
}
.cal-cell.selected {
  background: rgba(196, 30, 58, 0.1);
}
.cal-day {
  font-size: 26rpx;
  color: #1A1A1A;
}
.cal-day.dim {
  color: rgba(153, 153, 153, 0.5);
}
.cal-day.today {
  color: var(--brand);
  font-weight: 700;
}
.cal-dots {
  position: absolute;
  bottom: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4rpx;
}
.cal-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
}
.events {
  padding: 32rpx;
}
.events-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #999;
  margin-bottom: 24rpx;
}
.events-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.event-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  border: 2rpx solid #EEEEEE;
}
.event-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.event-info {
  flex: 1;
  min-width: 0;
}
.event-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.event-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-badge {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  background: #F0F0F0;
}
.event-badge.on {
  background: var(--brand);
}
.event-badge-txt {
  font-size: 20rpx;
  color: #999;
}
.event-badge-txt.on {
  color: #FFFFFF;
}
.event-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}
.event-meta-txt {
  font-size: 22rpx;
  color: #999;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx 0;
  gap: 16rpx;
}
.empty-txt {
  font-size: 26rpx;
  color: #999;
}
</style>
