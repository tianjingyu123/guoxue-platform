<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="n in list" :key="n.id" class="notice-item" @click="goDetail(n)">
        <view class="n-left">
          <view class="n-dot" :class="{ unread: !n.read }" />
          <text class="n-title">{{ n.title }}</text>
        </view>
        <text class="n-time">{{ n.createdAt?.slice(0, 10) }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无公告" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { notifyApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await notifyApi.notices(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goDetail(n: any) { uni.navigateTo({ url: `/pages/notices/detail?id=${n.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.notice-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.n-left { display: flex; align-items: center; gap: 8px; flex: 1; }
.n-dot { width: 8px; height: 8px; border-radius: 50%; background: #ddd; flex-shrink: 0; }
.n-dot.unread { background: #C41E3A; }
.n-title { font-size: 14px; }
.n-time { font-size: 12px; color: #ccc; }
</style>
