<script setup lang="ts">
/**
 * 活动日历（从原型 app/circles/calendar/page.tsx 156行高保真迁移）
 * 月份导航 + 日历网格(事件圆点) + 选中日活动列表
 */
import { ref, computed } from 'vue'
import AppIcon from '@/components/common/app-icon.vue'
import { goBack } from '@/utils/router'

interface CalEvent { id: string; date: string; title: string; time: string; circle: string; type: 'activity' | 'live' | 'offline' }

const EVENTS: CalEvent[] = [
  { id: '1', date: '2026-06-12', title: '八字命理公开课', time: '19:00', circle: '八字命理研习社', type: 'live' },
  { id: '2', date: '2026-06-15', title: '风水勘察分享会', time: '14:00', circle: '风水堪舆交流', type: 'offline' },
  { id: '3', date: '2026-06-15', title: '易经读书会', time: '20:00', circle: '易经研究会', type: 'activity' },
  { id: '4', date: '2026-06-18', title: '紫微斗数进阶班', time: '10:00', circle: '紫微斗数学院', type: 'live' },
  { id: '5', date: '2026-06-22', title: '奇门遁甲实战课', time: '15:30', circle: '奇门遁甲精研', type: 'live' },
  { id: '6', date: '2026-06-28', title: '国学文化交流茶会', time: '14:00', circle: '国学文化圈', type: 'offline' },
]
const TYPE_CFG = {
  live: { label: '直播', cls: 'red' },
  activity: { label: '活动', cls: 'blue' },
  offline: { label: '线下', cls: 'green' },
}
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const selected = ref(todayStr)

function prevMonth() { if (month.value === 0) { year.value--; month.value = 11 } else month.value-- }
function nextMonth() { if (month.value === 11) { year.value++; month.value = 0 } else month.value++ }

const cells = computed<(number | null)[]>(() => {
  const days = new Date(year.value, month.value + 1, 0).getDate()
  const firstWd = new Date(year.value, month.value, 1).getDay()
  return [...Array(firstWd).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
})
const eventDates = new Set(EVENTS.map(e => e.date))
const dayEvents = computed(() => EVENTS.filter(e => e.date === selected.value))

function dateStr(day: number) { return `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
function selDay(day: number) { selected.value = dateStr(day) }
const selLabel = computed(() => `${selected.value.slice(5, 7)}月${selected.value.slice(8, 10)}日`)
</script>

<template>
  <view class="cal">
    <view class="cal-header">
      <view @tap="goBack"><app-icon name="arrow-left" :size="44" color="#1A1A1A" /></view>
      <text class="cal-title">活动日历</text>
    </view>

    <view class="cal-body">
      <!-- 月份导航 -->
      <view class="cal-nav">
        <view class="cal-nav-btn" @tap="prevMonth"><app-icon name="chevron-left" :size="36" color="#2C2C2C" /></view>
        <text class="cal-nav-label">{{ year }}年{{ month + 1 }}月</text>
        <view class="cal-nav-btn" @tap="nextMonth"><app-icon name="chevron-right" :size="36" color="#2C2C2C" /></view>
      </view>

      <!-- 星期表头 -->
      <view class="cal-week">
        <view v-for="(d, i) in WEEKDAYS" :key="d" class="cal-week-cell">
          <text class="cal-week-txt" :class="{ weekend: i === 0 || i === 6 }">{{ d }}</text>
        </view>
      </view>

      <!-- 日历网格 -->
      <view class="cal-grid">
        <view v-for="(day, i) in cells" :key="i" class="cal-cell">
          <view v-if="day" class="cal-day" :class="{ sel: dateStr(day) === selected, today: dateStr(day) === todayStr && dateStr(day) !== selected }" @tap="selDay(day)">
            <text class="cal-day-txt" :class="{ sel: dateStr(day) === selected, today: dateStr(day) === todayStr && dateStr(day) !== selected }">{{ day }}</text>
            <view v-if="eventDates.has(dateStr(day))" class="cal-dot" :class="{ sel: dateStr(day) === selected }" />
          </view>
        </view>
      </view>

      <!-- 选中日活动 -->
      <view class="cal-events">
        <text class="cal-events-title">{{ selLabel }} 的活动</text>
        <view v-if="dayEvents.length === 0" class="cal-events-empty"><text class="cal-events-empty-txt">当日无活动</text></view>
        <view v-else class="cal-events-list">
          <view v-for="evt in dayEvents" :key="evt.id" class="cal-event">
            <text class="cal-event-time">{{ evt.time }}</text>
            <view class="cal-event-main">
              <view class="cal-event-top">
                <text class="cal-event-title">{{ evt.title }}</text>
                <view class="cal-event-tag" :class="TYPE_CFG[evt.type].cls"><text class="cal-event-tag-txt" :class="TYPE_CFG[evt.type].cls">{{ TYPE_CFG[evt.type].label }}</text></view>
              </view>
              <text class="cal-event-circle">{{ evt.circle }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cal { min-height: 100vh; background: var(--bg-paper, #FAF8F5); }
.cal-header { position: sticky; top: 0; z-index: 10; background: var(--bg-paper, #FAF8F5); border-bottom: 2rpx solid var(--border, #EDE8E0); display: flex; align-items: center; gap: 24rpx; padding: 0 32rpx; height: 96rpx; padding-top: var(--status-bar-height, 0px); }
.cal-title { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cal-body { padding: 32rpx; }
.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32rpx; }
.cal-nav-btn { padding: 12rpx; border-radius: 16rpx; }
.cal-nav-label { font-size: 32rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cal-week { display: flex; margin-bottom: 8rpx; }
.cal-week-cell { flex: 1; text-align: center; padding: 8rpx 0; }
.cal-week-txt { font-size: 24rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cal-week-txt.weekend { color: #999; }
.cal-grid { display: flex; flex-wrap: wrap; }
.cal-cell { width: calc(100% / 7); display: flex; justify-content: center; padding: 4rpx 0; }
.cal-day { width: 72rpx; height: 80rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16rpx; position: relative; }
.cal-day.sel { background: var(--brand, var(--brand)); }
.cal-day.today { background: rgba(196,30,58,0.1); }
.cal-day-txt { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cal-day-txt.sel { color: #fff; }
.cal-day-txt.today { color: var(--brand, var(--brand)); }
.cal-dot { width: 12rpx; height: 12rpx; border-radius: 999rpx; background: var(--brand, var(--brand)); margin-top: 4rpx; }
.cal-dot.sel { background: #fff; }
.cal-events { margin-top: 48rpx; }
.cal-events-title { font-size: 28rpx; font-weight: 600; color: var(--text-ink, #2C2C2C); }
.cal-events-empty { text-align: center; padding: 64rpx 0; }
.cal-events-empty-txt { font-size: 26rpx; color: #999; }
.cal-events-list { display: flex; flex-direction: column; gap: 24rpx; margin-top: 24rpx; }
.cal-event { display: flex; gap: 24rpx; padding: 24rpx; background: var(--card, #fff); border: 2rpx solid var(--border, #EDE8E0); border-radius: 24rpx; }
.cal-event-time { font-size: 28rpx; font-weight: 700; color: var(--brand, var(--brand)); padding-top: 2rpx; }
.cal-event-main { flex: 1; min-width: 0; }
.cal-event-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.cal-event-title { font-size: 28rpx; font-weight: 500; color: var(--text-ink, #2C2C2C); }
.cal-event-tag { padding: 4rpx 12rpx; border-radius: 999rpx; flex-shrink: 0; }
.cal-event-tag.red { background: #FEE2E2; }
.cal-event-tag.blue { background: #DBEAFE; }
.cal-event-tag.green { background: #DCFCE7; }
.cal-event-tag-txt { font-size: 20rpx; }
.cal-event-tag-txt.red { color: #B91C1C; }
.cal-event-tag-txt.blue { color: #1D4ED8; }
.cal-event-tag-txt.green { color: #15803D; }
.cal-event-circle { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }
</style>
