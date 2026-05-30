<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="b in list" :key="b.id" class="bounty-card" @click="goDetail(b)">
        <view class="b-header"><text class="b-title">{{ b.title }}</text><text class="b-reward">¥{{ b.reward }}</text></view>
        <text class="b-content">{{ b.content }}</text>
        <view class="b-footer"><text class="b-status" :class="b.status">{{ statusText(b.status) }}</text><text class="b-date">{{ b.createdAt?.slice(0, 10) }}</text></view>
      </view>
    </view>
    <EmptyState v-else text="暂无悬赏" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { bountyApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await bountyApi.getMyBounties(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function statusText(s: string) { return { open: '进行中', answered: '已回答', closed: '已关闭', resolved: '已解决' }[s] || s }
function goDetail(b: any) { uni.navigateTo({ url: `/pages/bounty/detail?id=${b.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.bounty-card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.b-header { display: flex; justify-content: space-between; align-items: center; }
.b-title { font-size: 14px; font-weight: 500; }
.b-reward { font-size: 16px; font-weight: bold; color: #C41E3A; }
.b-content { font-size: 13px; color: #666; display: block; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.b-footer { display: flex; justify-content: space-between; margin-top: 8px; }
.b-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #E3F2FD; color: #2196F3; }
.b-status.resolved { background: #E8F5E9; color: #4CAF50; }
.b-status.closed { background: #f0f0f0; color: #999; }
.b-date { font-size: 11px; color: #ccc; }
</style>
