<template>
  <view class="page">
    <view class="stats">
      <view class="stat-card"><text class="s-val">{{ stats.totalPlayers || 0 }}</text><text class="s-label">参赛人数</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.avgScore || 0 }}</text><text class="s-label">平均分</text></view>
      <view class="stat-card"><text class="s-val">{{ stats.myRank || '-' }}</text><text class="s-label">我的排名</text></view>
    </view>
    <view class="section"><text class="section-title">排行榜</text>
      <view v-for="(r, idx) in ranking" :key="r.id" class="rank-item">
        <text class="rank-num">{{ idx + 1 }}</text>
        <image :src="r.avatar || ''" class="rank-avatar" mode="aspectFill" />
        <text class="rank-name">{{ r.nickname || r.name }}</text>
        <text class="rank-score">{{ r.score }}分</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { competitionApi } from '../../api'
const stats = ref<any>({}); const ranking = ref<any[]>([])
onMounted(async () => {
  const pages = getCurrentPages(); const id = (pages[pages.length - 1] as any)?.options?.id
  try {
    const [s, r]: any = await Promise.all([competitionApi.getStats(id), competitionApi.getRanking(id)])
    stats.value = s || {}; ranking.value = Array.isArray(r) ? r : r?.data || []
  } catch {}
})
</script>
<style>
.page { background: #F5F0E8; min-height: 100vh; padding: 12px; }
.stats { display: flex; gap: 8px; margin-bottom: 12px; }
.stat-card { flex: 1; background: #fff; border-radius: 10px; padding: 14px; text-align: center; }
.s-val { font-size: 22px; font-weight: bold; color: #C41E3A; display: block; }
.s-label { font-size: 11px; color: #999; display: block; margin-top: 4px; }
.section { background: #fff; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 500; display: block; margin-bottom: 12px; }
.rank-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8f8f8; }
.rank-num { width: 20px; font-size: 14px; font-weight: bold; color: #C9A96E; text-align: center; }
.rank-avatar { width: 32px; height: 32px; border-radius: 50%; }
.rank-name { flex: 1; font-size: 13px; }
.rank-score { font-size: 14px; color: #C41E3A; font-weight: 500; }
</style>
