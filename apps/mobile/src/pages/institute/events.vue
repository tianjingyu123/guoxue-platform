<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="list.length" class="list">
      <view v-for="e in list" :key="e.id" class="event-card">
        <image v-if="e.cover" :src="e.cover" class="e-cover" mode="aspectFill" />
        <view class="e-info">
          <text class="e-title">{{ e.title }}</text>
          <text class="e-time">{{ e.startDate }} {{ e.time || '' }}</text>
          <text class="e-loc">{{ e.location || '' }}</text>
        </view>
        <button class="btn-join" @click="join(e)">{{ e.joined ? '已报名' : '报名' }}</button>
      </view>
    </view>
    <EmptyState v-else text="暂无活动" />
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { instituteApi } from '../../api'
const loading = ref(true); const list = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await instituteApi.getEvents(); list.value = Array.isArray(res) ? res : res?.data || [] } catch {} finally { loading.value = false }
})
function join(e: any) { e.joined = true; uni.showToast({ title: '报名成功' }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.event-card { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
.e-cover { width: 100%; height: 120px; }
.e-info { padding: 12px 16px; }
.e-title { font-size: 15px; font-weight: 500; display: block; }
.e-time { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.e-loc { font-size: 12px; color: #C9A96E; display: block; margin-top: 2px; }
.btn-join { margin: 0 16px 12px; background: #C41E3A; color: #fff; border: none; border-radius: 8px; padding: 8px; font-size: 13px; }
</style>
