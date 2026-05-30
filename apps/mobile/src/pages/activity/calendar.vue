<template>
  <view class="page">
    <view class="month-nav"><view class="nav-btn" @click="prevMonth"><text>&lt;</text></view><text class="month-label">{{ year }}年{{ month }}月</text><view class="nav-btn" @click="nextMonth"><text>&gt;</text></view></view>
    <view class="weekday-row"><text v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="wd">{{ d }}</text></view>
    <view class="days-grid">
      <view v-for="(d, idx) in days" :key="idx" class="day" :class="{ today: d.isToday, hasEvent: d.hasEvent, otherMonth: d.otherMonth }" @click="selectDay(d)">
        <text class="day-num">{{ d.day }}</text>
        <view v-if="d.hasEvent" class="dot" />
      </view>
    </view>
    <view class="section"><text class="section-title">{{ selectedDate }} 活动</text>
      <view v-for="e in dayEvents" :key="e.id" class="event-item">
        <text class="e-title">{{ e.title }}</text><text class="e-time">{{ e.time || '' }}</text>
      </view>
      <EmptyState v-if="!dayEvents.length" text="当天暂无活动" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
const year = ref(2026); const month = ref(5)
const now = new Date()
const days = computed(() => {
  const d = new Date(year.value, month.value - 1, 1)
  const firstDay = d.getDay()
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  const arr: any[] = []
  for (let i = 0; i < firstDay; i++) arr.push({ day: '', otherMonth: true })
  for (let i = 1; i <= daysInMonth; i++) arr.push({ day: i, isToday: year.value === now.getFullYear() && month.value === now.getMonth() + 1 && i === now.getDate(), hasEvent: [1, 8, 15, 22].includes(i), otherMonth: false })
  return arr
})
const selectedDate = ref(''); const dayEvents = ref<any[]>([])
function prevMonth() { if (month.value === 1) { year.value--; month.value = 12 } else month.value-- }
function nextMonth() { if (month.value === 12) { year.value++; month.value = 1 } else month.value++ }
function selectDay(d: any) {
  if (!d.day) return
  selectedDate.value = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
  dayEvents.value = d.hasEvent ? [{ id: 1, title: '节气活动', time: '10:00' }] : []
}
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.month-nav { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; }
.month-label { font-size: 16px; font-weight: 600; }
.nav-btn { width: 32px; height: 32px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.weekday-row { display: flex; background: #fff; padding: 8px 0; }
.wd { flex: 1; text-align: center; font-size: 12px; color: #999; }
.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); background: #fff; gap: 1px; }
.day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.day.otherMonth { opacity: 0.3; }
.day-num { font-size: 14px; }
.day.today .day-num { background: #C41E3A; color: #fff; border-radius: 50%; width: 28px; height: 28px; line-height: 28px; text-align: center; }
.dot { width: 4px; height: 4px; background: #C9A96E; border-radius: 50%; margin-top: 2px; }
.section { background: #fff; margin-top: 10px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.event-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f8f8; font-size: 13px; }
.e-time { color: #999; }
</style>
