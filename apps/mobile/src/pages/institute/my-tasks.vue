<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="tasks.length" class="list">
      <view v-for="t in tasks" :key="t.id" class="task-card">
        <view class="t-header"><text class="t-title">{{ t.title }}</text><text class="t-status" :class="t.status">{{ statusText(t.status) }}</text></view>
        <text class="t-desc">{{ t.description || '' }}</text>
        <text class="t-deadline">截止：{{ t.deadline || '' }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无任务" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { instituteApi } from '../../api'
const loading = ref(true); const tasks = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await instituteApi.getMyTasks(); tasks.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function statusText(s: string) { return { pending: '待完成', in_progress: '进行中', completed: '已完成' }[s] || s }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.task-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.t-header { display: flex; justify-content: space-between; align-items: center; }
.t-title { font-size: 14px; font-weight: 500; }
.t-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #FFF3E0; color: #FF9800; }
.t-status.completed { background: #E8F5E9; color: #4CAF50; }
.t-status.in_progress { background: #E3F2FD; color: #2196F3; }
.t-desc { font-size: 13px; color: #666; display: block; margin-top: 6px; }
.t-deadline { font-size: 11px; color: #999; display: block; margin-top: 4px; }
</style>
