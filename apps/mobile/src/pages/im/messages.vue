<template>
  <view class="page">
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'all' }" @click="tab = 'all'">全部</view>
      <view class="tab" :class="{ active: tab === 'system' }" @click="tab = 'system'">系统</view>
      <view class="tab" :class="{ active: tab === 'interact' }" @click="tab = 'interact'">互动</view>
    </view>
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="filtered.length" class="list">
      <view v-for="m in filtered" :key="m.id" class="msg-item" @click="goDetail(m)">
        <view class="msg-icon" :class="m.type">{{ iconMap[m.type] || '📩' }}</view>
        <view class="msg-info"><text class="msg-title">{{ m.title }}</text><text class="msg-desc">{{ m.content }}</text></view>
        <text class="msg-time">{{ m.createdAt?.slice(5, 10) }}</text>
      </view>
    </view>
    <EmptyState v-else text="暂无消息" />
  </view>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { notifyApi } from '../../api'
const loading = ref(true); const tab = ref('all'); const list = ref<any[]>([])
const iconMap: Record<string, string> = { system: '🔔', interact: '💬', order: '📦' }
const filtered = computed(() => tab.value === 'all' ? list.value : list.value.filter(m => m.type === tab.value))
onMounted(async () => {
  try { const res: any = await notifyApi.list(); list.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
function goDetail(m: any) { uni.navigateTo({ url: `/pages/notices/detail?id=${m.id}` }) }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 12px; font-size: 14px; color: #666; border-bottom: 2px solid transparent; }
.tab.active { color: #C41E3A; border-bottom-color: #C41E3A; font-weight: 600; }
.list { background: #fff; margin-top: 1px; }
.msg-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
.msg-icon { width: 36px; height: 36px; border-radius: 50%; background: #FFF0F0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.msg-info { flex: 1; min-width: 0; }
.msg-title { font-size: 14px; font-weight: 500; display: block; }
.msg-desc { font-size: 12px; color: #999; display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-time { font-size: 11px; color: #ccc; }
</style>
