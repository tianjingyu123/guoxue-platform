<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="item in list" :key="item.id" class="mat-item">
        <text class="mat-icon">{{ iconMap[item.type] || '📄' }}</text>
        <view class="mat-info"><text class="mat-name">{{ item.name || item.title }}</text><text class="mat-size">{{ item.size || '' }}</text></view>
        <button class="btn-dl" @click="download(item)">下载</button>
      </view>
    </view>
    <EmptyState v-else text="暂无素材" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { stationApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
const iconMap: Record<string, string> = { image: '🖼️', video: '🎬', pdf: '📑', audio: '🎵' }
onMounted(async () => {
  try { const res: any = await (stationApi as any).getMaterials?.(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function download(item: any) { uni.showToast({ title: '开始下载', icon: 'none' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.mat-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.mat-icon { font-size: 24px; }
.mat-info { flex: 1; }
.mat-name { font-size: 14px; display: block; }
.mat-size { font-size: 11px; color: #ccc; }
.btn-dl { padding: 4px 12px; border-radius: 14px; font-size: 12px; background: #C41E3A; color: #fff; border: none; line-height: 26px; }
</style>
