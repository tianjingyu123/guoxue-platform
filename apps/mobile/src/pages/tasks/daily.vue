<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="checkin-area">
        <view class="checkin-btn" :class="{ done: checkedIn }" @click="doCheckin">
          <text class="checkin-icon">{{ checkedIn ? '✓' : '📅' }}</text>
          <text class="checkin-text">{{ checkedIn ? '今日已签到' : '签到领积分' }}</text>
        </view>
        <view class="checkin-week">
          <view v-for="(d, i) in weekDays" :key="i" class="week-day" :class="{ today: d.isToday, done: d.done }">
            <text class="day-label">{{ d.label }}</text>
            <text class="day-icon">{{ d.done ? '✓' : d.points }}</text>
          </view>
        </view>
      </view>
      <view class="tasks-section">
        <text class="section-title">每日任务</text>
        <view v-for="t in dailyTasks" :key="t.id" class="task-item">
          <view class="task-info">
            <text class="task-name">{{ t.title }}</text>
            <text class="task-reward">+{{ t.points }}积分</text>
          </view>
          <button class="task-btn" :class="{ done: t.completed }" @click="doTask(t)" :disabled="t.completed">
            {{ t.completed ? '已完成' : '去完成' }}
          </button>
        </view>
        <EmptyState v-if="!dailyTasks.length" text="暂无任务" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { checkinApi } from '../../api'

const loading = ref(true)
const checkedIn = ref(false)
const weekDays = ref<any[]>([])
const dailyTasks = ref<any[]>([])

onMounted(async () => {
  try {
    const [status, tasks] = await Promise.all([checkinApi.getStatus(), checkinApi.getDailyTasks()])
    checkedIn.value = (status as any)?.checkedIn || false
    dailyTasks.value = Array.isArray(tasks) ? tasks.map((t: any) => ({ ...t, completed: false })) : []

    const today = new Date().getDay()
    const labels = ['日', '一', '二', '三', '四', '五', '六']
    weekDays.value = labels.map((l, i) => ({ label: l, isToday: i === today, done: i < today, points: '+5' }))
  } catch {} finally { loading.value = false }
})

async function doCheckin() {
  if (checkedIn.value) return
  try { await checkinApi.checkIn(); checkedIn.value = true; uni.showToast({ title: '签到成功 +10积分', icon: 'success' }) } catch {}
}
function doTask(t: any) { t.completed = true; uni.showToast({ title: '任务完成', icon: 'success' }) }
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.checkin-area { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; text-align: center; }
.checkin-btn { width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #C41E3A, #C9A96E); display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; }
.checkin-btn.done { background: #4CAF50; }
.checkin-icon { font-size: 32px; }
.checkin-text { font-size: 13px; color: #fff; margin-top: 4px; }
.checkin-week { display: flex; gap: 4px; margin-top: 12px; justify-content: center; }
.week-day { width: 36px; height: 48px; background: #F5F0E8; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.week-day.today { background: #C41E3A; }
.week-day.done { background: #e8f5e9; }
.day-label { font-size: 11px; color: #999; }
.today .day-label { color: #fff; }
.day-icon { font-size: 10px; color: #666; margin-top: 2px; }
.today .day-icon { color: #fff; }
.done .day-icon { color: #4CAF50; }
.tasks-section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; margin-bottom: 10px; display: block; }
.task-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.task-item:last-child { border-bottom: none; }
.task-name { font-size: 14px; }
.task-reward { font-size: 12px; color: #C9A96E; display: block; }
.task-btn { padding: 4px 16px; background: #C41E3A; color: #fff; border-radius: 14px; font-size: 12px; border: none; line-height: 28px; }
.task-btn.done { background: #ccc; }
</style>
