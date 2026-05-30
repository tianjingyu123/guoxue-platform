<template>
  <view class="page">
    <view class="summary">
      <view class="s-item"><text class="s-label">总收入</text><text class="s-val">¥{{ summary.total || 0 }}</text></view>
      <view class="s-item"><text class="s-label">待结算</text><text class="s-val">¥{{ summary.pending || 0 }}</text></view>
      <view class="s-item"><text class="s-label">已结算</text><text class="s-val">¥{{ summary.settled || 0 }}</text></view>
    </view>
    <view class="section"><text class="section-title">结算记录</text>
      <view v-for="r in records" :key="r.id" class="record">
        <text class="r-desc">{{ r.description || r.title }}</text>
        <text class="r-amount">¥{{ r.amount }}</text>
        <text class="r-time">{{ r.createdAt?.slice(0, 10) }}</text>
      </view>
      <EmptyState v-if="!records.length" text="暂无结算记录" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
import { offlineApi } from '../../api'
const summary = ref<any>({}); const records = ref<any[]>([])
onMounted(async () => {
  try { const res: any = await offlineApi.getSettlements(); summary.value = res?.summary || {}; records.value = res?.records || res?.data || [] } catch {}
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.summary { display: flex; gap: 8px; margin-bottom: 12px; }
.s-item { flex: 1; background: #fff; border-radius: 10px; padding: 14px; text-align: center; }
.s-label { font-size: 12px; color: #999; display: block; }
.s-val { font-size: 18px; font-weight: 600; color: #C41E3A; display: block; margin-top: 4px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 10px; }
.record { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8f8f8; gap: 8px; }
.r-desc { flex: 1; font-size: 13px; }
.r-amount { font-size: 14px; color: #C41E3A; }
.r-time { font-size: 11px; color: #ccc; }
</style>
