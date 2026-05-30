<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="booking-item">
        <view class="b-header"><text class="b-title">{{ item.title || item.topic }}</text><text class="b-status" :class="item.status">{{ statusText(item.status) }}</text></view>
        <text class="b-time">{{ item.date }} {{ item.timeSlot }}</text>
        <text class="b-teacher">{{ item.teacherName || '' }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无预约" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { userApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await (userApi as any).getBookings?.(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
function statusText(s: string) { return { pending: '待确认', confirmed: '已确认', cancelled: '已取消', completed: '已完成' }[s] || s }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.booking-item { padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.b-header { display: flex; justify-content: space-between; align-items: center; }
.b-title { font-size: 14px; font-weight: 500; }
.b-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #f0f0f0; color: #666; }
.b-status.confirmed { background: #E8F5E9; color: #4CAF50; }
.b-status.pending { background: #FFF3E0; color: #FF9800; }
.b-time { font-size: 12px; color: #999; display: block; margin-top: 6px; }
.b-teacher { font-size: 12px; color: #C9A96E; display: block; margin-top: 2px; }
</style>
