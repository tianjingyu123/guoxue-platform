<template>
  <view class="page">
    <!-- 顶部导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar">
        <view class="nav-left">
          <view class="nav-back" @tap="goBack">
            <app-icon name="chevron-left" :size="20" color="#1a1a1a" />
          </view>
          <text class="nav-title">研究院活动</text>
        </view>
        <view class="nav-right">
          <view class="view-btn" :class="{ 'view-btn-active': viewMode === 'list' }" @tap="viewMode = 'list'">
            <app-icon name="list" :size="16" :color="viewMode === 'list' ? '#fff' : '#4b5563'" />
          </view>
          <view class="view-btn" :class="{ 'view-btn-active': viewMode === 'calendar' }" @tap="viewMode = 'calendar'">
            <app-icon name="calendar-days" :size="16" :color="viewMode === 'calendar' ? '#fff' : '#4b5563'" />
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="scroll" :style="{ paddingTop: navHeight + 'px' }">
      <!-- 搜索和筛选 -->
      <view class="filter-bar">
        <view class="search-box">
          <app-icon name="search" :size="16" color="#9ca3af" />
          <input v-model="keyword" class="search-input" placeholder="搜索活动名称、主讲人..." placeholder-class="search-ph" />
        </view>
        <scroll-view scroll-x class="type-scroll">
          <view class="type-row">
            <view
              v-for="t in eventTypes"
              :key="t.value"
              class="type-btn"
              :class="{ 'type-btn-active': selectedType === t.value }"
              @tap="selectedType = t.value"
            >
              <text class="type-btn-text" :class="{ 'type-btn-text-active': selectedType === t.value }">{{ t.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 列表视图 -->
      <view v-if="viewMode === 'list'" class="list">
        <view v-if="loading" class="empty">
          <app-icon name="calendar" :size="48" color="#d1d5db" />
          <text class="empty-text">加载中...</text>
        </view>
        <view v-else-if="error" class="empty">
          <app-icon name="calendar" :size="48" color="#d1d5db" />
          <text class="empty-text">加载失败</text>
          <view class="retry-btn" @tap="fetchEvents"><text class="retry-btn-text">重试</text></view>
        </view>
        <view v-else-if="filteredEvents.length === 0" class="empty">
          <app-icon name="calendar" :size="48" color="#d1d5db" />
          <text class="empty-text">暂无相关活动</text>
        </view>
        <view v-for="e in filteredEvents" :key="e.id" class="event-card" @tap="goDetail(e.id)">
          <view class="event-cover">
            <app-icon name="calendar" :size="36" color="#d1d5db" />
            <view class="cover-tags">
              <text class="cover-tag" :style="{ color: eventTypeColor[e.type].color, background: eventTypeColor[e.type].bg }">{{ eventTypeLabel[e.type] }}</text>
              <text class="cover-tag" :style="{ color: eventStatusColor[e.status].color, background: eventStatusColor[e.status].bg }">{{ eventStatusLabel[e.status] }}</text>
            </view>
            <view v-if="e.isOnline" class="online-tag">
              <app-icon name="video" :size="12" color="#fff" />
              <text class="online-tag-text">线上</text>
            </view>
          </view>
          <view class="event-body">
            <text class="event-title">{{ e.title }}</text>
            <view v-if="e.speakers && e.speakers.length" class="speakers">
              <view class="speaker-avatars">
                <view v-for="(s, idx) in e.speakers.slice(0, 3)" :key="idx" class="speaker-avatar" :style="{ marginLeft: idx > 0 ? '-8px' : '0' }">
                  <app-icon name="user" :size="12" color="#9ca3af" />
                </view>
              </view>
              <text class="speaker-names">{{ e.speakers.map(s => s.name).join('、') }}</text>
            </view>
            <view class="event-meta">
              <app-icon name="clock" :size="14" color="#9ca3af" />
              <text class="event-meta-text">{{ formatDate(e.startTime) }}</text>
            </view>
            <view class="event-meta">
              <app-icon name="map-pin" :size="14" color="#9ca3af" />
              <text class="event-meta-text">{{ e.isOnline ? '线上直播' : e.location }}</text>
            </view>
            <view class="event-foot">
              <view class="foot-count">
                <app-icon name="users" :size="14" color="#9ca3af" />
                <text class="foot-count-text">/不限人</text>
              </view>
              <view class="foot-actions">
                <view class="cal-btn" @tap.stop="noop">
                  <app-icon name="calendar" :size="14" color="#4b5563" />
                  <text class="cal-btn-text">日历</text>
                </view>
                <view v-if="e.status === 'enrolling'" class="enroll-btn" @tap.stop="noop">
                  <text class="enroll-btn-text">我要报名</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 日历视图 -->
      <view v-else-if="!loading && !error" class="calendar">
        <view class="cal-head">
          <view class="cal-nav-btn" @tap="prevMonth"><app-icon name="chevron-left" :size="20" color="#4b5563" /></view>
          <text class="cal-month">{{ calYear }}年{{ calMonth + 1 }}月</text>
          <view class="cal-nav-btn" @tap="nextMonth"><app-icon name="chevron-right" :size="20" color="#4b5563" /></view>
        </view>
        <view class="week-row">
          <text v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="week-cell">{{ d }}</text>
        </view>
        <view class="day-grid">
          <view
            v-for="(day, idx) in calendarData"
            :key="idx"
            class="day-cell"
            :class="{ 'day-empty': day.date === 0, 'day-has-event': day.events.length > 0 }"
          >
            <template v-if="day.date > 0">
              <text class="day-num" :class="{ 'day-today': isToday(day.date) }">{{ day.date }}</text>
              <view v-if="day.events.length" class="day-events">
                <view
                  v-for="e in day.events.slice(0, 2)"
                  :key="e.id"
                  class="day-event"
                  :style="{ color: eventTypeColor[e.type].color, background: eventTypeColor[e.type].bg }"
                  @tap="goDetail(e.id)"
                >
                  <text class="day-event-text" :style="{ color: eventTypeColor[e.type].color }">{{ e.title }}</text>
                </view>
                <text v-if="day.events.length > 2" class="day-more">+{{ day.events.length - 2 }}</text>
              </view>
            </template>
          </view>
        </view>
      </view>

      <view class="bottom-safe" />
    </scroll-view>
  </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onMounted } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack, navigateTo } from '@/utils/router'
import { instituteApi, type InstituteEvent, eventTypeLabel, eventTypeColor, eventStatusLabel, eventStatusColor, type InstituteEventType } from '@/lib/institute-data'

const statusBarHeight = ref(0)
const navHeight = ref(44)
const sys = uni.getSystemInfoSync()
statusBarHeight.value = sys.statusBarHeight || 0
navHeight.value = (sys.statusBarHeight || 0) + 44

const eventTypes: { value: InstituteEventType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'lecture', label: '学术讲座' },
  { value: 'seminar', label: '研讨会' },
  { value: 'workshop', label: '工作坊' },
  { value: 'conference', label: '学术会议' },
  { value: 'online', label: '线上活动' },
]

const keyword = ref('')
const selectedType = ref<InstituteEventType | 'all'>('all')
const viewMode = ref<'list' | 'calendar'>('list')
const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth())

const allEvents = ref<InstituteEvent[]>([])
const loading = ref(true)
const error = ref(false)

async function fetchEvents() {
  loading.value = true
  error.value = false
  try {
    allEvents.value = await instituteApi.getEvents()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEvents()
})

const typeFiltered = computed(() => allEvents.value.filter((e) => selectedType.value === 'all' || e.type === selectedType.value))
const filteredEvents = computed(() => {
  if (!keyword.value) return typeFiltered.value
  const kw = keyword.value.toLowerCase()
  return typeFiltered.value.filter((e) => e.title.toLowerCase().includes(kw) || e.speakers?.some((s) => s.name.toLowerCase().includes(kw)))
})

function formatDate(dateStr: string) {
  // dateStr 形如 '2026-06-20 14:00'
  const [d, t] = dateStr.split(' ')
  const [, m, day] = d.split('-')
  return `${Number(m)}月${Number(day)}日 ${t}`
}

const calendarData = computed(() => {
  const year = calYear.value
  const month = calMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekDay = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const days: { date: number; events: typeof instituteEvents }[] = []
  for (let i = 0; i < startWeekDay; i++) days.push({ date: 0, events: [] })
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayEvents = filteredEvents.value.filter((e) => e.startTime.startsWith(dateStr))
    days.push({ date: day, events: dayEvents })
  }
  return days
})

function isToday(date: number) {
  return date === now.getDate() && calMonth.value === now.getMonth() && calYear.value === now.getFullYear()
}
function prevMonth() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- } else calMonth.value--
}
function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ } else calMonth.value++
}

function goDetail(id: number) {
  navigateTo('/institute/events/' + id)
}
function noop() {}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: #fff; border-bottom: 1px solid #ececec; }
.nav-bar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; }
.nav-left { display: flex; align-items: center; gap: 8px; }
.nav-back { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin-left: -4px; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.nav-right { display: flex; gap: 8px; }
.view-btn { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; }
.view-btn-active { background: #c41e3a; }
.scroll { height: 100vh; box-sizing: border-box; }

.filter-bar { padding: 16px; background: #fff; border-bottom: 1px solid #ececec; }
.search-box { display: flex; align-items: center; height: 40px; background: #f3f4f6; border-radius: 10px; padding: 0 12px; gap: 8px; margin-bottom: 12px; }
.search-input { flex: 1; font-size: 14px; color: #1a1a1a; height: 40px; }
.search-ph { color: #9ca3af; }
.type-scroll { white-space: nowrap; }
.type-row { display: inline-flex; gap: 8px; }
.type-btn { border: 1px solid #d1d5db; border-radius: 8px; padding: 5px 14px; background: #fff; }
.type-btn-active { background: #c41e3a; border-color: #c41e3a; }
.type-btn-text { font-size: 13px; color: #4b5563; }
.type-btn-text-active { color: #fff; }

.list { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.empty { padding: 80px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-text { font-size: 14px; color: #9ca3af; }
.event-card { background: #fff; border: 1px solid #ececec; border-radius: 10px; overflow: hidden; }
.event-cover { position: relative; height: 160px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.cover-tags { position: absolute; top: 8px; left: 8px; display: flex; gap: 8px; }
.cover-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.online-tag { position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 2px; background: #06b6d4; border-radius: 4px; padding: 2px 8px; }
.online-tag-text { font-size: 11px; color: #fff; }
.event-body { padding: 16px; }
.event-title { display: block; font-size: 15px; font-weight: 600; color: #1a1a1a; line-height: 1.4; margin-bottom: 8px; }
.speakers { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.speaker-avatars { display: flex; }
.speaker-avatar { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
.speaker-names { font-size: 13px; color: #9ca3af; }
.event-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.event-meta-text { font-size: 13px; color: #9ca3af; }
.event-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-top: 12px; border-top: 1px solid #ececec; }
.foot-count { display: flex; align-items: center; gap: 4px; }
.foot-count-text { font-size: 13px; color: #9ca3af; }
.foot-actions { display: flex; align-items: center; gap: 8px; }
.cal-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; }
.cal-btn-text { font-size: 13px; color: #4b5563; }
.enroll-btn { background: #c41e3a; border-radius: 8px; padding: 6px 14px; }
.enroll-btn-text { font-size: 13px; color: #fff; }

.calendar { padding: 16px; }
.cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.cal-nav-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.cal-month { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.week-row { display: flex; margin-bottom: 8px; }
.week-cell { flex: 1; text-align: center; font-size: 13px; color: #9ca3af; padding: 8px 0; }
.day-grid { display: flex; flex-wrap: wrap; }
.day-cell { width: calc(100% / 7); min-height: 60px; box-sizing: border-box; padding: 4px; border: 1px solid #ececec; }
.day-empty { border-color: transparent; }
.day-has-event { background: rgba(196,30,58,0.05); }
.day-num { font-size: 13px; color: #1a1a1a; }
.day-today { color: #c41e3a; font-weight: 700; }
.day-events { margin-top: 4px; display: flex; flex-direction: column; gap: 2px; }
.day-event { border-radius: 4px; padding: 1px 4px; overflow: hidden; }
.day-event-text { font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.day-more { font-size: 10px; color: #9ca3af; }
.bottom-safe { height: 24px; }

.retry-btn { margin-top: 8px; padding: 6px 16px; background: #c41e3a; border-radius: 8px; }
.retry-btn-text { font-size: 13px; color: #fff; }
</style>
