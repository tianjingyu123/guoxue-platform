<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="live-card" @click="goLive(item)">
        <image :src="item.cover || ''" class="live-cover" mode="aspectFill" />
        <view class="live-info">
          <text class="live-title">{{ item.title }}</text>
          <text class="live-status" :class="item.status">{{ item.status === 'live' ? '直播中' : '预约中' }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无直播" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { stationApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await (stationApi as any).getLives?.(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goLive(item: any) { uni.navigateTo({ url: `/pages/live/room?id=${item.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.live-card { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
.live-cover { width: 100%; height: 160px; }
.live-info { padding: 12px; display: flex; justify-content: space-between; align-items: center; }
.live-title { font-size: 14px; font-weight: 500; }
.live-status { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: #FFF0F0; color: #C41E3A; }
.live-status.live { background: #E8F5E9; color: #4CAF50; }
</style>
