<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="s in list" :key="s.id" class="station-card" @click="goDetail(s)">
        <image :src="s.cover || ''" class="s-cover" mode="aspectFill" />
        <view class="s-info">
          <text class="s-name">{{ s.name }}</text>
          <text class="s-addr">{{ s.address || '' }}</text>
          <text class="s-dist">{{ s.distance || '' }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else text="附近暂无线下站点" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { offlineApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await offlineApi.getStations(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function goDetail(s: any) { uni.navigateTo({ url: `/pages/offline/station-detail?id=${s.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.station-card { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
.s-cover { width: 100%; height: 140px; }
.s-info { padding: 12px; }
.s-name { font-size: 15px; font-weight: 500; display: block; }
.s-addr { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.s-dist { font-size: 11px; color: #C9A96E; display: block; margin-top: 2px; }
</style>
