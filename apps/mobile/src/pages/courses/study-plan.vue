<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else>
      <view class="plan-header">
        <text class="plan-period">{{ periodLabel }}</text>
      </view>
      <view v-for="day in tasks" :key="day.date" class="day-card">
        <text class="day-title">{{ day.date }}</text>
        <view v-for="t in day.items" :key="t.id" class="task-item" @click="toggleTask(t)">
          <view class="task-check" :class="{ done: t.completed }"><text v-if="t.completed">✓</text></view>
          <text class="task-name">{{ t.title }}</text>
        </view>
      </view>
      <EmptyState v-if="!tasks.length" text="暂无学习计划" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { courseApi } from '../../api'

const loading = ref(true)
const periodLabel = ref('本周学习计划')
const tasks = ref<any[]>([])

onMounted(async () => {
  try {
    const res: any = await courseApi.dashboard()
    const list = Array.isArray(res) ? res : res?.tasks || res?.data || []
    tasks.value = list.map((d: any) => ({
      date: d.date || d.label,
      items: (d.items || d.tasks || []).map((t: any) => ({ ...t, completed: false })),
    }))
  } catch {} finally { loading.value = false }
})

function toggleTask(t: any) {
  t.completed = !t.completed
}
</script>

<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.plan-header { text-align: center; padding: 16px; }
.plan-period { font-size: 18px; font-weight: bold; color: #C41E3A; }
.day-card { background: #fff; border-radius: 12px; padding: 12px 16px; margin-bottom: 12px; }
.day-title { font-size: 14px; font-weight: 500; color: #C9A96E; margin-bottom: 8px; display: block; }
.task-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f8f8f8; }
.task-item:last-child { border-bottom: none; }
.task-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ddd; text-align: center; line-height: 20px; font-size: 12px; flex-shrink: 0; }
.task-check.done { background: #4CAF50; border-color: #4CAF50; color: #fff; }
.task-name { font-size: 14px; color: #2C2C2C; }
</style>
