<template>
  <view class="page">
    <LoadingSkeleton v-if="loading" />
    <view v-else-if="items.length" class="list">
      <view v-for="item in items" :key="item.id" class="h-item">
        <image :src="item.cover || ''" class="h-img" mode="aspectFill" />
        <view class="h-info"><text class="h-title">{{ item.title }}</text><text class="h-time">{{ item.createdAt?.slice(0, 10) }}</text></view>
        <button class="h-del" @click="remove(item)">✕</button>
      </view>
    </view>
    <EmptyState v-else text="暂无浏览记录" />
    <view v-if="items.length" class="clear-all" @click="clearAll">清空全部记录</view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadingSkeleton from '../../components/LoadingSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import { browseHistoryApi } from '../../api'
const loading = ref(true); const items = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await browseHistoryApi.list(); items.value = Array.isArray(res) ? res : res?.data || res?.list || [] } catch {} finally { loading.value = false }
})
async function remove(item: any) { try { await browseHistoryApi.remove(item.id); items.value = items.value.filter(i => i.id !== item.id) } catch {} }
async function clearAll() { try { await browseHistoryApi.clearAll(); items.value = [] } catch {} }
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; }
.list { background: #fff; }
.h-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; }
.h-img { width: 50px; height: 50px; border-radius: 8px; flex-shrink: 0; }
.h-info { flex: 1; }
.h-title { font-size: 14px; display: block; }
.h-time { font-size: 11px; color: #ccc; }
.h-del { width: 24px; height: 24px; background: #eee; border-radius: 50%; font-size: 11px; border: none; line-height: 24px; text-align: center; color: #999; }
.clear-all { text-align: center; padding: 12px; color: #C41E3A; font-size: 13px; }
</style>
