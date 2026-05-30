<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="c in list" :key="c.id" class="comp-card" @click="goDetail(c)">
        <text class="comp-name">{{ c.name || c.title }}</text>
        <text class="comp-date">{{ c.startDate }} - {{ c.endDate }}</text>
        <text class="comp-status">{{ c.status === 'ended' ? '已结束' : '进行中' }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无历史竞赛" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { competitionApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await competitionApi.getArchive(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goDetail(c: any) { uni.navigateTo({ url: `/pages/competition/dashboard?id=${c.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.comp-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
.comp-name { font-size: 15px; font-weight: 500; display: block; }
.comp-date { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.comp-status { font-size: 12px; color: #C9A96E; display: block; margin-top: 4px; }
</style>
