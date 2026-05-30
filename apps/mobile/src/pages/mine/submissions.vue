<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="sub-item">
        <view class="sub-header"><text class="sub-title">{{ item.title }}</text><text class="sub-status" :class="item.status">{{ statusLabel(item.status) }}</text></view>
        <text class="sub-time">{{ item.createdAt?.slice(0, 10) }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无投稿" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { contentApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await (contentApi as any).getMySubmissions?.(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
function statusLabel(s: string) { return { pending: '审核中', approved: '已通过', rejected: '未通过', draft: '草稿' }[s] || s }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.sub-item { padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.sub-header { display: flex; justify-content: space-between; align-items: center; }
.sub-title { font-size: 14px; font-weight: 500; }
.sub-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #FFF3E0; color: #FF9800; }
.sub-status.approved { background: #E8F5E9; color: #4CAF50; }
.sub-status.rejected { background: #FFF0F0; color: #C41E3A; }
.sub-time { font-size: 11px; color: #ccc; display: block; margin-top: 6px; }
</style>
