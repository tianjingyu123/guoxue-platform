<template>
  <view class="mc-page">
    <view class="mc-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="mc-nav">
        <view class="mc-icon-btn" @tap="goBack"><app-icon name="chevron-left" :size="22" color="#1a1a1a" /></view>
        <text class="mc-nav-title">经营日历</text>
        <view class="mc-icon-btn" />
      </view>
    </view>

    <scroll-view scroll-y class="mc-body">
      <!-- 月份切换 -->
      <view class="mc-month-bar">
        <view class="mc-month-btn" @tap="shiftMonth(-1)"><app-icon name="chevron-left" :size="18" color="#9a2e25" /></view>
        <text class="mc-month-title">{{ monthTitle }}</text>
        <view class="mc-month-btn" @tap="shiftMonth(1)"><app-icon name="chevron-right" :size="18" color="#9a2e25" /></view>
      </view>

      <!-- 日历网格 -->
      <view class="mc-calendar">
        <view class="mc-week-row">
          <text v-for="w in weekdays" :key="w" class="mc-week-cell">{{ w }}</text>
        </view>
        <view class="mc-grid">
          <view
            v-for="(cell, i) in cells"
            :key="i"
            class="mc-cell"
            :class="{ selected: cell && cell.key === selectedKey, today: cell && cell.key === todayKey }"
            @tap="cell && selectDay(cell.key)"
          >
            <template v-if="cell">
              <text class="mc-cell-day" :class="{ selected: cell.key === selectedKey, today: cell.key === todayKey }">{{ cell.day }}</text>
              <view class="mc-dots">
                <view v-if="cell.kinds.includes('course')" class="mc-dot course" />
                <view v-if="cell.kinds.includes('event')" class="mc-dot event" />
                <view v-if="cell.kinds.includes('booking')" class="mc-dot booking" />
              </view>
            </template>
          </view>
        </view>
        <!-- 图例 -->
        <view class="mc-legend">
          <view class="mc-legend-item"><view class="mc-dot course" /><text class="mc-legend-text">课程</text></view>
          <view class="mc-legend-item"><view class="mc-dot event" /><text class="mc-legend-text">活动</text></view>
          <view class="mc-legend-item"><view class="mc-dot booking" /><text class="mc-legend-text">讲师预约</text></view>
        </view>
      </view>

      <!-- 三态（日历数据） -->
      <view v-if="loading" class="mc-state"><view class="spinner" /><text class="mc-state-text">加载中…</text></view>
      <view v-else-if="errMsg" class="mc-state">
        <app-icon name="alert-circle" :size="40" color="#d1d5db" /><text class="mc-state-text">{{ errMsg }}</text>
        <view class="retry-btn" @tap="load"><text class="retry-text">重试</text></view>
      </view>

      <!-- 当日安排 -->
      <template v-else>
        <view class="mc-day-head">
          <text class="mc-day-title">{{ selectedTitle }}</text>
          <text class="mc-day-count">{{ selectedItems.length ? selectedItems.length + ' 项安排' : '' }}</text>
        </view>
        <view v-if="selectedItems.length === 0" class="mc-day-empty">
          <app-icon name="calendar" :size="36" color="#d8ccb8" />
          <text class="mc-state-text">当日暂无安排</text>
        </view>
        <view v-else class="mc-day-list">
          <view v-for="(it, i) in selectedItems" :key="it.kind + '-' + it.id + '-' + i" class="mc-item">
            <view class="mc-item-icon" :class="it.kind">
              <app-icon :name="kindIcon(it.kind)" :size="16" :color="kindColor(it.kind)" />
            </view>
            <view class="mc-item-main">
              <text class="mc-item-title">{{ it.title }}</text>
              <text class="mc-item-sub">{{ kindLabel(it.kind) }} · {{ timeSpan(it) }}</text>
            </view>
            <text v-if="statusText(it.status)" class="mc-item-status">{{ statusText(it.status) }}</text>
          </view>
        </view>
      </template>
      <view class="mc-safe" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'
import { offlineManageApi, type CalendarDays, type CalendarItem, type CalendarItemKind } from '@/lib/offline-data'

const statusBarHeight = ref(0)
try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0 } catch {}

const pad = (n: number) => String(n).padStart(2, '0')
const now = new Date()
const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

const loading = ref(true)
const errMsg = ref('')
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1) // 1-12
const days = ref<CalendarDays>({})
const selectedKey = ref(todayKey)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const monthKey = computed(() => `${year.value}-${pad(month.value)}`)
const monthTitle = computed(() => `${year.value}年${month.value}月`)

interface Cell { day: number; key: string; kinds: CalendarItemKind[] }
const cells = computed<(Cell | null)[]>(() => {
  const first = new Date(year.value, month.value - 1, 1)
  const offset = first.getDay()
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  const out: (Cell | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${monthKey.value}-${pad(d)}`
    const items = days.value[key] || []
    const kinds: CalendarItemKind[] = []
    for (const it of items) {
      if ((it.kind === 'course' || it.kind === 'event' || it.kind === 'booking') && !kinds.includes(it.kind)) kinds.push(it.kind)
    }
    out.push({ day: d, key, kinds })
  }
  return out
})

const selectedItems = computed<CalendarItem[]>(() => {
  const items = days.value[selectedKey.value] || []
  return [...items].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
})
const selectedTitle = computed(() => {
  const parts = selectedKey.value.split('-').map(Number)
  return `${parts[1]}月${parts[2]}日${selectedKey.value === todayKey ? '（今天）' : ''}`
})

async function load() {
  loading.value = true
  errMsg.value = ''
  try {
    days.value = await offlineManageApi.getCalendar(monthKey.value)
  } catch (e) {
    const msg = (e as Error)?.message
    errMsg.value = msg?.includes('未登录') ? '请先登录' : (msg || '加载失败')
    days.value = {}
  } finally {
    loading.value = false
  }
}
onLoad(() => load())

function shiftMonth(delta: number) {
  let m = month.value + delta
  let y = year.value
  if (m < 1) { m = 12; y -= 1 }
  if (m > 12) { m = 1; y += 1 }
  month.value = m
  year.value = y
  // 选中日跟随月份：本月选今天，其他月选 1 号
  selectedKey.value = monthKey.value === todayKey.slice(0, 7) ? todayKey : `${monthKey.value}-01`
  load()
}
function selectDay(key: string) { selectedKey.value = key }

function kindIcon(k: CalendarItemKind): string {
  return k === 'course' ? 'graduation-cap' : k === 'event' ? 'sparkles' : 'users'
}
function kindColor(k: CalendarItemKind): string {
  return k === 'course' ? '#2563eb' : k === 'event' ? '#dc2626' : '#d4a017'
}
function kindLabel(k: CalendarItemKind): string {
  return k === 'course' ? '课程' : k === 'event' ? '活动' : '讲师预约'
}
function timeSpan(it: CalendarItem): string {
  const fmt = (s?: string | null) => {
    if (!s) return ''
    const d = new Date(s)
    return isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const a = fmt(it.startTime)
  const b = fmt(it.endTime)
  return a && b ? `${a} - ${b}` : a || '全天'
}
const STATUS_TEXT: Record<string, string> = {
  DRAFT: '草稿', PUBLISHED: '已发布', CANCELLED: '已取消', FINISHED: '已结束',
  PENDING: '待确认', CONFIRMED: '已确认', REGISTERED: '已报名', SIGNED_IN: '已签到',
}
function statusText(s?: string): string {
  return s ? STATUS_TEXT[s] || '' : ''
}
</script>

<style scoped>
.mc-page { min-height: 100vh; background: #f5f2ed; display: flex; flex-direction: column; }
.mc-header { position: sticky; top: 0; z-index: 50; background: #fff; border-bottom: 1px solid #ededed; }
.mc-nav { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 8px; }
.mc-icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.mc-nav-title { font-size: 17px; font-weight: 600; color: #1a1a1a; }
.mc-body { flex: 1; }

.mc-month-bar { margin: 16px 16px 0; display: flex; align-items: center; justify-content: space-between; }
.mc-month-btn { width: 36px; height: 36px; background: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.mc-month-title { font-size: 17px; font-weight: 700; color: #2a1f1a; }

.mc-calendar { margin: 12px 16px 0; background: #fff; border-radius: 14px; padding: 12px 8px 10px; }
.mc-week-row { display: flex; }
.mc-week-cell { width: calc(100% / 7); text-align: center; font-size: 12px; color: #9ca3af; padding: 4px 0 8px; }
.mc-grid { display: flex; flex-wrap: wrap; }
.mc-cell { width: calc(100% / 7); height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border-radius: 10px; }
.mc-cell.selected { background: rgba(154,46,37,0.08); }
.mc-cell-day { font-size: 14px; color: #2a1f1a; width: 26px; height: 26px; line-height: 26px; text-align: center; border-radius: 999px; }
.mc-cell-day.today { color: #9a2e25; font-weight: 700; }
.mc-cell-day.selected { background: #9a2e25; color: #fff; font-weight: 600; }
.mc-dots { display: flex; align-items: center; gap: 3px; height: 5px; }
.mc-dot { width: 5px; height: 5px; border-radius: 999px; }
.mc-dot.course { background: #2563eb; }
.mc-dot.event { background: #dc2626; }
.mc-dot.booking { background: #d4a017; }
.mc-legend { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f0ea; }
.mc-legend-item { display: flex; align-items: center; gap: 5px; }
.mc-legend-text { font-size: 11px; color: #9ca3af; }

.mc-state { padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mc-state-text { font-size: 13px; color: #9ca3af; }
.spinner { width: 28px; height: 28px; border: 3px solid #e8ddd0; border-top-color: #9a2e25; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { margin-top: 4px; padding: 8px 22px; border: 1px solid #9a2e25; border-radius: 999px; }
.retry-text { font-size: 13px; color: #9a2e25; }

.mc-day-head { display: flex; align-items: baseline; justify-content: space-between; margin: 18px 16px 10px; }
.mc-day-title { font-size: 15px; font-weight: 700; color: #2a1f1a; }
.mc-day-count { font-size: 12px; color: #9ca3af; }
.mc-day-empty { margin: 0 16px; padding: 36px 0; background: #fff; border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.mc-day-list { margin: 0 16px; display: flex; flex-direction: column; gap: 8px; }
.mc-item { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 12px 14px; }
.mc-item-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mc-item-icon.course { background: #eff6ff; }
.mc-item-icon.event { background: #fef2f2; }
.mc-item-icon.booking { background: #fff8e6; }
.mc-item-main { flex: 1; min-width: 0; }
.mc-item-title { display: block; font-size: 14px; font-weight: 500; color: #2a1f1a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-item-sub { display: block; font-size: 12px; color: #9ca3af; margin-top: 2px; }
.mc-item-status { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
.mc-safe { height: 24px; }
</style>
