<template>
  <view class="page">
    <view class="points-card"><text class="p-label">当前积分</text><text class="p-value">{{ points }}</text></view>
    <view class="section"><text class="section-title">积分记录</text>
      <view v-for="r in records" :key="r.id" class="record"><text class="r-desc">{{ r.description || r.scene }}</text><text class="r-points" :class="{ plus: r.points > 0 }">{{ r.points > 0 ? '+' : '' }}{{ r.points }}</text></view>
      <EmptyState v-if="!records.length" text="暂无记录" />
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EmptyState from '../../components/EmptyState.vue'
import { userApi } from '../../api'
const points = ref(0); const records = ref<any[]>([])
onMounted(async () => {
  try {
    const [pts, recs] = await Promise.all([userApi.getPoints(), userApi.getPointsRecords()])
    points.value = (pts as any)?.points || (pts as any)?.total || 0
    records.value = Array.isArray(recs) ? recs : (recs as any)?.data || (recs as any)?.list || []
  } catch {}
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.points-card { background: linear-gradient(135deg, #C41E3A, #C9A96E); border-radius: 12px; padding: 24px; text-align: center; color: #fff; margin-bottom: 12px; }
.p-label { font-size: 14px; opacity: 0.8; }
.p-value { font-size: 42px; font-weight: bold; display: block; margin-top: 4px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; margin-bottom: 10px; display: block; }
.record { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f8f8; }
.r-desc { font-size: 13px; }
.r-points { font-size: 14px; color: #C41E3A; }
.r-points.plus { color: #4CAF50; }
</style>
