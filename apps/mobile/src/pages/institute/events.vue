<template>
  <view class="page">
    <!-- 头部 -->
    <view class="nav-header">
      <view class="nav-header-inner">
        <view class="nav-left">
          <text class="nav-back" @click="goBack">←</text>
          <text class="nav-title">研究院活动</text>
        </view>
        <view class="view-toggle">
          <text class="toggle-btn" :class="{ 'toggle-active': viewMode === 'list' }" @click="viewMode = 'list'">☰</text>
          <text class="toggle-btn" :class="{ 'toggle-active': viewMode === 'calendar' }" @click="viewMode = 'calendar'">📅</text>
        </view>
      </view>
    </view>

    <!-- 搜索和筛选 -->
    <view class="filter-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input v-model="searchKeyword" class="search-input" placeholder="搜索活动名称、主讲人..." />
      </view>
      <scroll-view scroll-x class="type-scroll" show-scrollbar="false">
        <view class="type-inner">
          <text v-for="t in eventTypes" :key="t.value" class="type-tab" :class="{ 'type-active': selectedType === t.value }" @click="switchType(t.value)">{{ t.label }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 列表视图 -->
    <template v-if="viewMode === 'list'">
      <DataState :is-loading="loading" :error="loadError" :is-empty="!loading && filteredEvents.length === 0" empty-icon="📅" empty-title="暂无相关活动" :empty-show-action="false" @retry="loadEvents">
        <view class="events-wrap">
          <view v-for="evt in filteredEvents" :key="evt.id" class="event-item" @click="goDetail(evt.id)">
            <image :src="evt.cover" mode="aspectFill" class="event-item-cover" />
            <view class="event-item-overlay-top">
              <text class="event-tag" :style="{ backgroundColor: getEventTypeColor(evt.type), color: '#fff' }">{{ getEventTypeLabel(evt.type) }}</text>
              <text class="event-tag" :style="{ backgroundColor: getEventStatusColor(evt.status), color: '#fff' }">{{ getEventStatusLabel(evt.status) }}</text>
              <text v-if="evt.isOnline" class="event-tag-online">🎬 线上</text>
            </view>
            <view class="event-item-body">
              <text class="event-item-title">{{ evt.title }}</text>
              <view v-if="evt.speakers?.length" class="speaker-row">
                <view class="speaker-avatars">
                  <image v-for="(sp, idx) in evt.speakers.slice(0, 3)" :key="idx" :src="sp.avatar" mode="aspectFill" class="speaker-avatar" :style="{ marginLeft: idx > 0 ? '-12rpx' : '0', zIndex: 3 - idx }" />
                </view>
                <text class="speaker-name">{{ evt.speakers.map((s: any) => s.name).join('、') }}</text>
              </view>
              <view class="event-meta">
                <text>🕐 {{ formatDate(evt.startTime) }}</text>
                <text>📍 {{ evt.isOnline ? '线上直播' : evt.location }}</text>
              </view>
              <view class="event-item-footer">
                <text class="meta-text">👥 {{ evt.enrolledCount }}/{{ evt.maxEnrollment || '不限' }}人</text>
                <view class="event-actions">
                  <view class="btn btn-sm btn-ghost" @click.stop="addToCalendar(evt)">📅 日历</view>
                  <view v-if="evt.status === 'enrolling'" class="btn btn-sm" :class="evt.isEnrolled ? 'btn-outline' : 'btn-primary'" @click.stop="handleEnroll(evt)">
                    {{ enrollingId === evt.id ? '处理中...' : evt.isEnrolled ? '已报名' : '我要报名' }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </DataState>
    </template>

    <!-- 日历视图 -->
    <template v-else>
      <view class="calendar-section">
        <view class="cal-header">
          <text class="cal-nav" @click="prevMonth">‹</text>
          <text class="cal-title">{{ currentYear }}年{{ currentMonth + 1 }}月</text>
          <text class="cal-nav" @click="nextMonth">›</text>
        </view>
        <view class="cal-weekdays">
          <text v-for="d in weekdays" :key="d" class="cal-weekday">{{ d }}</text>
        </view>
        <view class="cal-grid">
          <view v-for="(day, idx) in calendarData" :key="idx" class="cal-cell" :class="{ 'cal-empty': day.date === 0, 'cal-has-event': day.events.length > 0 }">
            <template v-if="day.date > 0">
              <text class="cal-date" :class="{ 'cal-today': isToday(day) }">{{ day.date }}</text>
              <view v-if="day.events.length > 0" class="cal-events">
                <text v-for="e in day.events.slice(0, 2)" :key="e.id" class="cal-event" :style="{ backgroundColor: getEventTypeColor(e.type) }" @click="goDetail(e.id)">{{ e.title }}</text>
                <text v-if="day.events.length > 2" class="cal-more">+{{ day.events.length - 2 }}</text>
              </view>
            </template>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import DataState from '../../components/DataState.vue'
import { instituteApi } from '../../api'

interface Speaker { name: string; avatar: string }
interface InstituteEvent {
  id: number; title: string; cover: string; status: string; type: string
  startTime: string; endTime: string; location: string; isOnline: boolean
  enrolledCount: number; maxEnrollment?: number; isEnrolled?: boolean
  speakers?: Speaker[]; description?: string
}

const events = ref<InstituteEvent[]>([])
const searchKeyword = ref('')
const selectedType = ref<string>('all')
const viewMode = ref<'list' | 'calendar'>('list')
const loading = ref(false)
const loadError = ref<string | null>(null)
const enrollingId = ref<number | null>(null)
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const eventTypes = [
  { value: 'all', label: '全部' }, { value: 'lecture', label: '学术讲座' },
  { value: 'seminar', label: '研讨会' }, { value: 'workshop', label: '工作坊' },
  { value: 'conference', label: '学术会议' }, { value: 'online', label: '线上活动' },
]

const filteredEvents = computed(() => {
  if (!searchKeyword.value) return events.value
  const kw = searchKeyword.value.toLowerCase()
  return events.value.filter(e =>
    e.title.toLowerCase().includes(kw) ||
    e.speakers?.some(s => s.name.toLowerCase().includes(kw))
  )
})

const calendarData = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekDay = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const days: { date: number; events: InstituteEvent[] }[] = []
  for (let i = 0; i < startWeekDay; i++) days.push({ date: 0, events: [] })
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({ date: day, events: filteredEvents.value.filter(e => e.startTime.startsWith(ds)) })
  }
  return days
})

watch(selectedType, () => { loadEvents() })

onMounted(() => loadEvents())

async function loadEvents() {
  loading.value = true
  loadError.value = null
  try {
    const res = await instituteApi.events({ type: selectedType.value === 'all' ? undefined : selectedType.value })
    if (res?.list) events.value = res.list
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally { loading.value = false }
}

function switchType(v: string) { selectedType.value = v }

async function handleEnroll(evt: InstituteEvent) {
  enrollingId.value = evt.id
  try {
    if (evt.isEnrolled) {
      // await cancelEventEnrollment(evt.id)
      evt.isEnrolled = false
      evt.enrolledCount--
    } else {
      // await enrollEvent(evt.id)
      evt.isEnrolled = true
      evt.enrolledCount++
    }
  } finally { enrollingId.value = null }
}

function addToCalendar(evt: InstituteEvent) {
  uni.showToast({ title: '已添加到日历', icon: 'none' })
}

function formatDate(ds: string): string {
  const d = new Date(ds)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isToday(day: { date: number; events: InstituteEvent[] }): boolean {
  const now = new Date()
  return day.date === now.getDate() && currentMonth.value === now.getMonth() && currentYear.value === now.getFullYear()
}

function prevMonth() {
  if (currentMonth.value === 0) { currentMonth.value = 11; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  if (currentMonth.value === 11) { currentMonth.value = 0; currentYear.value++ }
  else currentMonth.value++
}
function goBack() { uni.navigateBack() }
function goDetail(id: number) { uni.navigateTo({ url: `/pages/institute/event-detail?id=${id}` }) }

function getEventTypeLabel(t: string): string {
  return { lecture: '学术讲座', seminar: '研讨会', workshop: '工作坊', conference: '学术会议', online: '线上活动' }[t] || t
}
function getEventTypeColor(t: string): string {
  return { lecture: '#C41E3A', seminar: '#C9A96E', workshop: '#52c41a', conference: '#1890ff', online: '#13c2c2' }[t] || '#999'
}
function getEventStatusLabel(s: string): string {
  return { enrolling: '报名中', ongoing: '进行中', ended: '已结束' }[s] || s
}
function getEventStatusColor(s: string): string {
  return { enrolling: '#C41E3A', ongoing: '#C9A96E', ended: '#999' }[s] || '#999'
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; }

/* 导航 */
.nav-header { position: sticky; top: 0; z-index: 10; background: rgba(245,240,232,0.95); border-bottom: 1rpx solid #E5E1DB; padding: 20rpx 24rpx; }
.nav-header-inner { display: flex; align-items: center; justify-content: space-between; }
.nav-left { display: flex; align-items: center; gap: 16rpx; }
.nav-back { font-size: 36rpx; color: #2C2C2C; padding: 4rpx; }
.nav-title { font-size: 34rpx; font-weight: 600; color: #2C2C2C; }
.view-toggle { display: flex; gap: 8rpx; }
.toggle-btn { padding: 8rpx 16rpx; border-radius: 8rpx; font-size: 28rpx; color: #999; background: #F5F0E8; }
.toggle-active { background: #C41E3A; color: #fff; }

/* 筛选栏 */
.filter-bar { padding: 16rpx 24rpx; border-bottom: 1rpx solid #E5E1DB; }
.search-input-wrap { position: relative; margin-bottom: 16rpx; }
.search-icon { position: absolute; left: 20rpx; top: 50%; transform: translateY(-50%); font-size: 28rpx; color: #999; }
.search-input { width: 100%; height: 72rpx; padding-left: 56rpx; padding-right: 20rpx; background: #fff; border: 1rpx solid #E5E1DB; border-radius: 12rpx; font-size: 26rpx; color: #2C2C2C; box-sizing: border-box; }
.type-scroll { white-space: nowrap; }
.type-inner { display: inline-flex; gap: 12rpx; }
.type-tab { display: inline-block; padding: 10rpx 24rpx; border-radius: 28rpx; font-size: 24rpx; color: #666; background: #fff; border: 1rpx solid #E5E1DB; }
.type-active { background: #C41E3A; color: #fff; border-color: #C41E3A; }

/* 活动列表 */
.events-wrap { padding: 24rpx; display: flex; flex-direction: column; gap: 20rpx; }
.event-item { background: #fff; border-radius: 16rpx; overflow: hidden; border: 1rpx solid #E5E1DB; }
.event-item-cover { width: 100%; height: 300rpx; display: block; }
.event-item-overlay-top { position: relative; margin-top: -56rpx; padding: 0 16rpx; display: flex; gap: 8rpx; flex-wrap: wrap; }
.event-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.event-tag-online { font-size: 22rpx; padding: 4rpx 12rpx; background: #13c2c2; color: #fff; border-radius: 6rpx; display: flex; align-items: center; gap: 4rpx; }
.event-item-body { padding: 16rpx 24rpx 24rpx; }
.event-item-title { font-size: 28rpx; font-weight: 600; color: #2C2C2C; display: block; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.speaker-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.speaker-avatars { display: flex; }
.speaker-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; border: 2rpx solid #fff; }
.speaker-name { font-size: 24rpx; color: #666; }

.event-meta { display: flex; flex-direction: column; gap: 8rpx; font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.event-item-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16rpx; border-top: 1rpx solid #E5E1DB; }
.meta-text { font-size: 24rpx; color: #999; }
.event-actions { display: flex; gap: 12rpx; }
.btn { display: flex; align-items: center; justify-content: center; border-radius: 8rpx; font-size: 24rpx; font-weight: 500; }
.btn-sm { padding: 8rpx 20rpx; }
.btn-primary { background: #C41E3A; color: #fff; }
.btn-outline { background: transparent; color: #C41E3A; border: 1rpx solid #C41E3A; }
.btn-ghost { background: transparent; color: #666; }

/* 日历 */
.calendar-section { padding: 24rpx; }
.cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.cal-nav { font-size: 40rpx; color: #C41E3A; padding: 8rpx; }
.cal-title { font-size: 32rpx; font-weight: 600; color: #2C2C2C; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4rpx; margin-bottom: 8rpx; }
.cal-weekday { text-align: center; font-size: 24rpx; color: #999; padding: 12rpx 0; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4rpx; }
.cal-cell { min-height: 120rpx; padding: 8rpx; border-radius: 8rpx; border: 1rpx solid transparent; }
.cal-empty { border-color: transparent; }
.cal-has-event { background: rgba(196,30,58,0.05); border-color: #E5E1DB; }
.cal-date { font-size: 24rpx; color: #2C2C2C; }
.cal-today { color: #C41E3A; font-weight: bold; }
.cal-events { margin-top: 4rpx; display: flex; flex-direction: column; gap: 4rpx; }
.cal-event { font-size: 20rpx; padding: 2rpx 8rpx; border-radius: 4rpx; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-more { font-size: 20rpx; color: #999; }
</style>
