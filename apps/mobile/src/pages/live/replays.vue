<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="rooms.length" class="list">
      <view v-for="r in rooms" :key="r.id" class="replay-card" @click="goPlay(r)">
        <image :src="r.cover || r.thumbnail || ''" class="cover" mode="aspectFill" />
        <view class="info">
          <text class="title">{{ r.title }}</text>
          <text class="meta">{{ r.anchorName }} · {{ r.duration || '回放' }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="暂无回放" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { liveApi } from '../../api'

const loading = ref(true)
const rooms = ref<any[]>([])
onMounted(async () => {
  try {
    const res: any = await liveApi.rooms({ status: 'ENDED', pageSize: 20 })
    rooms.value = Array.isArray(res) ? res : res?.data || res?.list || res?.rooms || []
  } catch {} finally { loading.value = false }
})
function goPlay(r: any) { uni.navigateTo({ url: `/pages/live/replay-player?id=${r.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.replay-card { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 10px; }
.cover { width: 100%; height: 180px; }
.info { padding: 10px 14px; }
.title { font-size: 15px; font-weight: 500; display: block; }
.meta { font-size: 12px; color: #999; margin-top: 4px; display: block; }
</style>
