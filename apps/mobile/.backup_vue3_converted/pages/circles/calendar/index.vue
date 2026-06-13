<template>
  <view class="min-h-screen bg-background">
    <!-- Header -->
    <view class="sticky top-0 z-10 bg-background border-b border-border flex items-center px-4 h-12 gap-3">
      <view @click="goBack" class="p-1">
        <text class="text-foreground text-lg">←</text>
      </view>
      <text class="text-base font-semibold text-foreground">活动日历</text>
    </view>

    <view class="px-4 pt-4 pb-20">
      <!-- Month navigator -->
      <view class="flex items-center justify-between mb-4">
        <view @click="prevMonth" hover-class="bg-muted" class="p-1.5 rounded-lg">
          <text class="text-foreground text-lg">‹</text>
        </view>
        <text class="text-base font-semibold text-foreground">{{ year }}年{{ month + 1 }}月</text>
        <view @click="nextMonth" hover-class="bg-muted" class="p-1.5 rounded-lg">
          <text class="text-foreground text-lg">›</text>
        </view>
      </view>

      <!-- Weekday headers -->
      <view class="grid grid-cols-7 mb-1">
        <view
          v-for="d in WEEKDAYS"
          :key="d"
          :class="['text-center text-xs font-medium py-1', d === '日' || d === '六' ? 'text-muted-foreground' : 'text-foreground']"
        >
          <text>{{ d }}</text>
        </view>
      </view>

      <!-- Calendar grid -->
      <view class="grid grid-cols-7 gap-y-1">
        <view v-for="(day, i) in cells" :key="'c' + i">
          <view
            v-if="day"
            @click="selected = day.dateStr"
            hover-class="bg-muted"
            :class="[
              'flex flex-col items-center py-1.5 rounded-lg transition-colors relative',
              day.isSel ? 'bg-primary text-white' :
              day.isToday ? 'bg-primary/10 text-primary' :
              'text-foreground'
            ]"
          >
            <text class="text-sm font-medium">{{ day.day }}</text>
            <text
              v-if="day.hasEvt"
              :class="['w-1.5 h-1.5 rounded-full mt-0.5', day.isSel ? 'bg-white' : 'bg-primary']"
            />
          </view>
        </view>
      </view>

      <!-- Events for selected day -->
      <view class="mt-6">
        <text class="text-sm font-semibold text-foreground mb-3 block">
          {{ selectedMonth }}月{{ selectedDay }}日 的活动
        </text>
        <view v-if="dayEvents.length === 0" class="text-sm text-muted-foreground text-center py-8">
          <text>当日无活动</text>
        </view>
        <view v-else class="space-y-3">
          <view
            v-for="evt in dayEvents"
            :key="evt.id"
            class="flex gap-3 p-3 bg-white border border-border rounded-xl"
          >
            <view class="flex flex-col items-center pt-0.5">
              <text class="text-sm font-bold text-primary">{{ evt.time }}</text>
            </view>
            <view class="flex-1 min-w-0">
              <view class="flex items-start justify-between gap-2">
                <text class="text-sm font-medium text-foreground">{{ evt.title }}</text>
                <text :class="['text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0', TYPE_CFG[evt.type].cls]">
                  {{ TYPE_CFG[evt.type].label }}
                </text>
              </view>
              <text class="text-xs text-muted-foreground mt-1 block">{{ evt.circle }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface CalendarEvent {
  id: string
  date: string
  title: string
  time: string
  circle: string
  type: 'activity' | 'live' | 'offline'
}

const EVENTS: CalendarEvent[] = [
  { id: '1', date: '2026-06-12', title: '八字命理公开课', time: '19:00', circle: '八字命理研习社', type: 'live' },
  { id: '2', date: '2026-06-15', title: '风水勘察分享会', time: '14:00', circle: '风水堪舆交流',   type: 'offline' },
  { id: '3', date: '2026-06-15', title: '易经读书会', time: '20:00', circle: '易经研究会', type: 'activity' },
  { id: '4', date: '2026-06-18', title: '紫微斗数进阶班', time: '10:00', circle: '紫微斗数学院', type: 'live' },
  { id: '5', date: '2026-06-22', title: '奇门遁甲实战课', time: '15:30', circle: '奇门遁甲精研', type: 'live' },
  { id: '6', date: '2026-06-28', title: '国学文化交流茶会', time: '14:00', circle: '国学文化圈', type: 'offline' },
]

const TYPE_CFG: Record<string, { label: string; cls: string }> = {
  live:     { label: '直播', cls: 'bg-red-100 text-red-700' },
  activity: { label: '活动', cls: 'bg-blue-100 text-blue-700' },
  offline:  { label: '线下', cls: 'bg-green-100 text-green-700' },
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const selected = ref(today.toISOString().slice(0, 10))

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}
function getFirstWeekday(y: number, m: number) {
  return new Date(y, m, 1).getDay()
}

function prevMonth() {
  if (month.value === 0) {
    year.value--
    month.value = 11
  } else {
    month.value--
  }
}

function nextMonth() {
  if (month.value === 11) {
    year.value++
    month.value = 0
  } else {
    month.value++
  }
}

const cells = computed(() => {
  const days = getDaysInMonth(year.value, month.value)
  const firstWd = getFirstWeekday(year.value, month.value)
  const todayStr = new Date().toISOString().slice(0, 10)
  const result: ({ day: number; dateStr: string; isToday: boolean; isSel: boolean; hasEvt: boolean } | null)[] = []

  for (let i = 0; i < firstWd; i++) {
    result.push(null)
  }
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push({
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      isSel: dateStr === selected.value,
      hasEvt: EVENTS.some(e => e.date === dateStr),
    })
  }
  return result
})

const selectedMonth = computed(() => selected.value.slice(5, 7))
const selectedDay = computed(() => selected.value.slice(8, 10))
const dayEvents = computed(() => EVENTS.filter(e => e.date === selected.value))

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
/* 样式由 Tailwind 处理 */
</style>
